"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar as CalendarIcon,
  User,
  Plus,
  Check,
  Clock,
  LogOut,
  AlertCircle,
  Trash2,
  CalendarCheck,
  Layers,
  Send,
  Lock,
  History,
  Search,
  Sparkles,
  Edit2,
  X,
  RefreshCw,
} from "lucide-react";
import { IAgentVisit, IUser, ILot } from "@/lib/types";

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(dateKey: string): string {
  if (!dateKey) return "";
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function formatDateShort(d: string | Date | undefined): string {
  if (!d) return "";
  const date = new Date(d);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatDateRange(start: string | Date | undefined, end: string | Date | undefined): string {
  if (!start || !end) return "";
  const s = new Date(start);
  const e = new Date(end);
  return `${s.toLocaleDateString("en-US", { month: "short", day: "numeric" })} — ${e.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
}

export default function AgentPortalPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<IUser | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const [allPeriods, setAllPeriods] = useState<ILot[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>("");
  const [loadingPeriods, setLoadingPeriods] = useState(true);

  const [patientName, setPatientName] = useState("");
  const [serviceType, setServiceType] = useState("PT Visit");
  const [notes, setNotes] = useState("");
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState(false);
  const [submittingPeriod, setSubmittingPeriod] = useState(false);

  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const [visits, setVisits] = useState<IAgentVisit[]>([]);
  const [loadingVisits, setLoadingVisits] = useState(true);

  // Edit visit state
  const [editingVisitId, setEditingVisitId] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"active_cycle" | "past_cycles">("active_cycle");
  const [pastSearchQuery, setPastSearchQuery] = useState("");

  const agentRole = (currentUser as any)?.agentType === "PTA" ? "PTA" : "PT";
  const isPTA = agentRole === "PTA";

  const serviceOptions = useMemo(() => {
    if (isPTA) {
      return [
        { id: "Visit", label: "Visit" },
        { id: "Missed Visit", label: "Missed" },
        { id: "Special Rate", label: "Special" },
      ];
    }
    return [
      { id: "SOC", label: "SOC" },
      { id: "Eval", label: "Eval" },
      { id: "ReEval", label: "ReEval" },
      { id: "ReCert", label: "ReCert" },
      { id: "Disch", label: "Disch" },
      { id: "Missed Visit", label: "Missed" },
    ];
  }, [isPTA]);

  useEffect(() => {
    if (serviceOptions.length > 0 && !serviceOptions.some((s) => s.id === serviceType)) {
      setServiceType(serviceOptions[0].id);
    }
  }, [serviceOptions, serviceType]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => {
        if (!res.ok) throw new Error("Unauthorized");
        return res.json();
      })
      .then((data) => {
        if (data.user) {
          setCurrentUser(data.user);
        } else {
          router.replace("/login");
        }
      })
      .catch(() => router.replace("/login"))
      .finally(() => setLoadingUser(false));
  }, [router]);

  const loadPeriods = async () => {
    setLoadingPeriods(true);
    try {
      const res = await fetch("/api/lots");
      const data = await res.json();
      if (res.ok && data.lots) {
        setAllPeriods(data.lots);
        const openList: ILot[] = data.lots.filter((l: ILot) => l.status === "open");
        if (openList.length > 0 && (!selectedPeriodId || !openList.some((p) => p._id === selectedPeriodId))) {
          setSelectedPeriodId(openList[0]._id!);
        } else if (openList.length === 0 && data.lots.length > 0 && !selectedPeriodId) {
          setSelectedPeriodId(data.lots[0]._id!);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPeriods(false);
    }
  };

  useEffect(() => {
    loadPeriods();
  }, []);

  const openPeriods = useMemo(() => {
    return allPeriods.filter((p) => p.status === "open");
  }, [allPeriods]);

  const pastPeriods = useMemo(() => {
    return allPeriods.filter((p) => p.status === "closed");
  }, [allPeriods]);

  const activePeriod = useMemo(() => {
    return allPeriods.find((p) => p._id === selectedPeriodId) || null;
  }, [allPeriods, selectedPeriodId]);

  const getCycleDisplayTitle = (p: ILot) => {
    const num = p.lotNumber ? String(p.lotNumber).padStart(3, "0") : (p.lotCode ? p.lotCode.replace(/LOT\s*/i, "") : "");
    const namePart = num ? `Cycle #${num}` : "Billing Cycle";
    return `${namePart} — ${p.agencyName || "Agency"} (${formatDateShort(p.periodStart)} - ${formatDateShort(p.periodEnd)})`;
  };

  const isAgentLockedForPeriod = useMemo(() => {
    if (!activePeriod || !currentUser) return false;
    const currentId = (currentUser as any).id || (currentUser as any)._id;
    const statuses = activePeriod.agentStatuses || [];
    const myStatus = statuses.find(
      (s: any) =>
        (currentId && s.agentId?.toString() === currentId) ||
        (currentUser.email && s.agentEmail?.toLowerCase() === currentUser.email.toLowerCase())
    );
    return myStatus?.status === "completed" || activePeriod.status !== "open";
  }, [activePeriod, currentUser]);

  const isAgentSubmittedForPeriod = useMemo(() => {
    if (!activePeriod || !currentUser) return false;
    const currentId = (currentUser as any).id || (currentUser as any)._id;
    const statuses = activePeriod.agentStatuses || [];
    const myStatus = statuses.find(
      (s: any) =>
        (currentId && s.agentId?.toString() === currentId) ||
        (currentUser.email && s.agentEmail?.toLowerCase() === currentUser.email.toLowerCase())
    );
    return myStatus?.status === "submitted";
  }, [activePeriod, currentUser]);

  const loadVisits = async () => {
    try {
      const res = await fetch("/api/agent/visits");
      const data = await res.json();
      if (res.ok && data.visits) {
        setVisits(data.visits);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingVisits(false);
    }
  };

  useEffect(() => {
    loadVisits();
  }, []);

  const distinctPatientNames = useMemo(() => {
    const map = new Map<string, string>();
    visits.forEach((v) => {
      const trimmed = v.patientName?.trim();
      if (trimmed) {
        const lower = trimmed.toLowerCase();
        if (!map.has(lower)) {
          map.set(lower, trimmed);
        }
      }
    });
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b));
  }, [visits]);

  const patientSuggestions = useMemo(() => {
    if (!patientName.trim()) return distinctPatientNames.slice(0, 6);
    const q = patientName.toLowerCase().trim();
    return distinctPatientNames
      .filter((name) => name.toLowerCase().includes(q))
      .slice(0, 6);
  }, [distinctPatientNames, patientName]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.replace("/login");
    } catch {
      router.replace("/login");
    }
  };

  const periodDays = useMemo(() => {
    if (!activePeriod || !activePeriod.periodStart || !activePeriod.periodEnd) {
      return [];
    }

    const start = new Date(activePeriod.periodStart);
    const end = new Date(activePeriod.periodEnd);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const days: {
      date: Date;
      key: string;
      dayOfWeek: string;
      dayNumber: number;
      isToday: boolean;
      isInPeriod: boolean;
    }[] = [];

    const curr = new Date(start);
    while (curr <= end) {
      const dateCopy = new Date(curr);
      const key = toDateKey(dateCopy);
      const isToday = dateCopy.getTime() === today.getTime();

      days.push({
        date: dateCopy,
        key,
        dayOfWeek: dateCopy.toLocaleDateString("en-US", { weekday: "short" }),
        dayNumber: dateCopy.getDate(),
        isToday,
        isInPeriod: true,
      });

      curr.setDate(curr.getDate() + 1);
    }

    return days;
  }, [activePeriod]);

  const currentCycleVisits = useMemo(() => {
    if (!selectedPeriodId) return [];
    return visits.filter((v) => {
      if (v.lotId) return v.lotId.toString() === selectedPeriodId;
      if (activePeriod && activePeriod.lotCode && v.lotCode) {
        return v.lotCode === activePeriod.lotCode;
      }
      return false;
    });
  }, [visits, selectedPeriodId, activePeriod]);

  const pastCycleVisits = useMemo(() => {
    return visits.filter((v) => {
      if (v.lotId && v.lotId.toString() === selectedPeriodId) return false;
      if (activePeriod && v.lotCode && activePeriod.lotCode && v.lotCode === activePeriod.lotCode) return false;
      return true;
    });
  }, [visits, selectedPeriodId, activePeriod]);

  const filteredPastCycles = useMemo(() => {
    if (!pastSearchQuery.trim()) return pastPeriods;
    const q = pastSearchQuery.toLowerCase();
    return pastPeriods.filter((p) => {
      const agency = p.agencyName?.toLowerCase() || "";
      const num = String(p.lotNumber || "");
      return agency.includes(q) || num.includes(q);
    });
  }, [pastPeriods, pastSearchQuery]);

  const toggleDateSelection = (key: string) => {
    if (isAgentLockedForPeriod) return;
    setFormError("");
    setSelectedDates((prev) => {
      if (prev.includes(key)) {
        return prev.filter((d) => d !== key);
      } else {
        return [...prev, key].sort();
      }
    });
  };

  const handleSubmitVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess(false);

    if (isAgentLockedForPeriod) {
      setFormError("This billing cycle is locked.");
      return;
    }

    if (!selectedPeriodId) {
      setFormError("Please select a billing cycle.");
      return;
    }

    if (!patientName.trim()) {
      setFormError("Please enter patient name.");
      return;
    }

    if (selectedDates.length === 0) {
      setFormError("Select at least one treatment date.");
      return;
    }

    setSubmitting(true);

    try {
      const isEditing = Boolean(editingVisitId);
      const url = "/api/agent/visits";
      const method = isEditing ? "PUT" : "POST";
      const payload: any = {
        patientName: patientName.trim(),
        serviceType,
        visitDates: selectedDates,
        notes,
        lotId: selectedPeriodId,
      };
      if (isEditing) {
        payload.id = editingVisitId;
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Failed to ${isEditing ? "update" : "record"} visit`);
      }

      setFormSuccess(true);
      setEditingVisitId(null);
      setPatientName("");
      setSelectedDates([]);
      setNotes("");
      setShowSuggestions(false);
      loadVisits();
      loadPeriods();

      setTimeout(() => {
        setFormSuccess(false);
      }, 3000);
    } catch (err: any) {
      setFormError(err.message || "Failed to submit visit");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectVisitForEdit = (visit: IAgentVisit) => {
    if (isAgentLockedForPeriod) return;
    setEditingVisitId(visit._id || null);
    setPatientName(visit.patientName || "");
    setServiceType(visit.serviceType || (isPTA ? "Visit" : "Eval"));
    setNotes(visit.notes || "");
    setSelectedDates(visit.visitDates ? [...visit.visitDates] : []);
    setFormError("");
    setFormSuccess(false);

    // Scroll smoothly to form
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelEdit = () => {
    setEditingVisitId(null);
    setPatientName("");
    setServiceType(isPTA ? "Visit" : "Eval");
    setNotes("");
    setSelectedDates([]);
    setFormError("");
  };

  const handleNotifyManagerReady = async () => {
    if (!selectedPeriodId || !currentUser) return;
    const currentId = (currentUser as any).id || (currentUser as any)._id;
    setSubmittingPeriod(true);

    try {
      const res = await fetch(`/api/lots/${selectedPeriodId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "set_agent_status",
          agentId: currentId,
          agentName: currentUser.name,
          agentEmail: currentUser.email,
          status: "submitted",
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to submit cycle");
      }

      alert("Submitted to manager for review!");
      loadPeriods();
    } catch (err: any) {
      alert(err.message || "Network error");
    } finally {
      setSubmittingPeriod(false);
    }
  };

  const handleDeleteVisit = async (id?: string) => {
    if (!id) return;
    if (!confirm("Delete this visit record?")) return;

    try {
      const res = await fetch(`/api/agent/visits?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setVisits((prev) => prev.filter((v) => v._id !== id));
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete");
      }
    } catch {
      alert("Failed to delete record");
    }
  };

  if (loadingUser) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#f8fafc" }}>
        <div style={{ textAlign: "center", color: "#64748b" }}>
          <div style={{ width: "36px", height: "36px", border: "3px solid #cbd5e1", borderTopColor: "#2563eb", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 8px" }} />
          <p style={{ fontSize: "0.85rem", fontWeight: 500 }}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="agent-shell">
      {/* Top Header */}
      <header className="agent-header">
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <div className="agent-brand-logo">T</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: "1rem", lineHeight: 1.1 }}>THER-INV</div>
            <div style={{ fontSize: "0.7rem", color: "#059669", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#059669" }} />
              Agent Portal
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <div className="agent-user-pill">
            <User size={13} style={{ color: "#2563eb" }} />
            <span style={{ maxWidth: "150px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {currentUser?.name || "Agent"}
            </span>
          </div>

          <button type="button" onClick={handleLogout} title="Log out" className="agent-logout-btn">
            <LogOut size={14} />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="agent-main">
        {/* Compact Nav Tabs */}
        <div className="agent-tabs-bar">
          <button
            type="button"
            onClick={() => setActiveTab("active_cycle")}
            className={`agent-tab-item ${activeTab === "active_cycle" ? "active" : ""}`}
          >
            <Plus size={15} />
            <span>Active Billing Cycle</span>
            {currentCycleVisits.length > 0 && <span className="agent-tab-count">{currentCycleVisits.length}</span>}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("past_cycles")}
            className={`agent-tab-item ${activeTab === "past_cycles" ? "active" : ""}`}
          >
            <History size={15} />
            <span>Past Cycles & History</span>
            {pastCycleVisits.length > 0 && <span className="agent-tab-count count-muted">{pastCycleVisits.length}</span>}
          </button>
        </div>

        {activeTab === "active_cycle" ? (
          <div className="agent-stack">
            {/* Integrated Top Control Bar: Cycle Selector + Status / Submit Action */}
            <div className="agent-control-banner">
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap", flex: "1 1 auto" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginRight: "0.25rem" }}>
                  <Layers size={16} style={{ color: "#2563eb", flexShrink: 0 }} />
                  <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "#1e40af", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    Billing Cycles:
                  </span>
                </div>
                {openPeriods.length === 0 ? (
                  <span style={{ fontSize: "0.82rem", color: "#b45309", fontWeight: 600 }}>
                    No active billing cycle open
                  </span>
                ) : (
                  <div className="agent-cycles-btn-group">
                    {openPeriods.map((p) => {
                      const isSelected = p._id === selectedPeriodId;
                      const num = p.lotNumber ? String(p.lotNumber).padStart(3, "0") : (p.lotCode ? p.lotCode.replace(/LOT\s*/i, "") : "");
                      return (
                        <button
                          key={p._id}
                          type="button"
                          onClick={() => setSelectedPeriodId(p._id!)}
                          className={`agent-cycle-pill-btn ${isSelected ? "selected" : ""}`}
                        >
                          <span className="agent-cycle-pill-title">
                            Cycle #{num}
                          </span>
                          <span className="agent-cycle-pill-agency">
                            {p.agencyName || "Agency"}
                          </span>
                          <span className="agent-cycle-pill-dates">
                            ({formatDateShort(p.periodStart)} - {formatDateShort(p.periodEnd)})
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Status or Submission CTA */}
              {activePeriod && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  {isAgentLockedForPeriod ? (
                    <span className="agent-status-tag tag-locked">
                      <Lock size={12} /> Cycle Finalized
                    </span>
                  ) : isAgentSubmittedForPeriod ? (
                    <span className="agent-status-tag tag-review">
                      <Clock size={12} /> Under Manager Review
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleNotifyManagerReady}
                      disabled={submittingPeriod || currentCycleVisits.length === 0}
                      className="agent-submit-btn"
                    >
                      <Send size={12} />
                      <span>{submittingPeriod ? "Submitting..." : "Submit to Manager"}</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Notification Toasts if any */}
            {isAgentLockedForPeriod && (
              <div className="agent-notice notice-locked">
                <Lock size={15} style={{ flexShrink: 0 }} />
                <span>This billing cycle is finalized and invoiced. New submissions are closed.</span>
              </div>
            )}
            {formSuccess && (
              <div className="agent-notice notice-success">
                <Check size={15} style={{ flexShrink: 0 }} />
                <span>Visit saved successfully!</span>
              </div>
            )}
            {formError && (
              <div className="agent-notice notice-error">
                <AlertCircle size={15} style={{ flexShrink: 0 }} />
                <span>{formError}</span>
              </div>
            )}

            {/* Edit Mode Banner */}
            {editingVisitId && (
              <div
                style={{
                  backgroundColor: "#eff6ff",
                  border: "1.5px solid #60a5fa",
                  borderRadius: "10px",
                  padding: "0.55rem 0.85rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "0.5rem",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", color: "#1d4ed8", fontSize: "0.82rem", fontWeight: 700 }}>
                  <Edit2 size={15} />
                  <span>Editing record: <u>{patientName || "Patient"}</u> — Adjust name, dates, or service type below.</span>
                </div>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "0.25rem 0.6rem",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    backgroundColor: "#ffffff",
                    color: "#475569",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  <X size={13} /> Cancel Edit
                </button>
              </div>
            )}

            {/* Compact Form Card: Entry Line & Dates */}
            <div className={`agent-panel ${isAgentLockedForPeriod ? "agent-panel-locked" : ""}`}>
              <form onSubmit={handleSubmitVisit}>
                <div className="agent-panel-grid">
                  {/* Left Column: Patient Name & Notes */}
                  <div className="agent-panel-left">
                    {/* Patient Name with Autocomplete */}
                    <div className="agent-field-block" ref={suggestionsRef}>
                      <div className="agent-field-header">
                        <label htmlFor="patient-input" className="agent-label">
                          Patient Name <span style={{ color: "#dc2626" }}>*</span>
                        </label>
                        {distinctPatientNames.length > 0 && (
                          <span className="agent-hint">
                            <Sparkles size={11} style={{ color: "#2563eb" }} /> Suggestions active
                          </span>
                        )}
                      </div>
                      <div style={{ position: "relative" }}>
                        <input
                          id="patient-input"
                          type="text"
                          required
                          disabled={isAgentLockedForPeriod}
                          placeholder="e.g. Maria Gonzalez"
                          value={patientName}
                          autoComplete="off"
                          onFocus={() => setShowSuggestions(true)}
                          onChange={(e) => {
                            setPatientName(e.target.value);
                            setShowSuggestions(true);
                          }}
                          className="agent-input"
                        />
                        <User size={15} className="agent-input-icon" />
                      </div>

                      {showSuggestions && !isAgentLockedForPeriod && patientSuggestions.length > 0 && (
                        <div className="agent-suggest-menu">
                          {patientSuggestions.map((name) => (
                            <button
                              key={name}
                              type="button"
                              onClick={() => {
                                setPatientName(name);
                                setShowSuggestions(false);
                              }}
                              className="agent-suggest-item"
                            >
                              <span>{name}</span>
                              <span style={{ fontSize: "0.68rem", color: "#2563eb" }}>Select ↵</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Notes */}
                    <div className="agent-field-block">
                      <label className="agent-label">Notes (Optional)</label>
                      <textarea
                        rows={3}
                        disabled={isAgentLockedForPeriod}
                        placeholder="Evaluation summary, progress notes..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="agent-input agent-textarea"
                      />
                    </div>
                  </div>

                  {/* Right Column: Service Type, Dates Selector, and Save Button */}
                  <div className="agent-panel-right">
                    {/* Service Type Selection */}
                    <div className="agent-field-block" style={{ marginBottom: "0.6rem" }}>
                      <div className="agent-field-header">
                        <label className="agent-label">Service Type</label>
                        <span className="agent-role-tag">Role: {agentRole}</span>
                      </div>
                      <div className="agent-btn-group">
                        {serviceOptions.map((opt) => {
                          const isSelected = serviceType === opt.id;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              disabled={isAgentLockedForPeriod}
                              onClick={() => setServiceType(opt.id)}
                              className={`agent-service-btn ${isSelected ? "selected" : ""}`}
                            >
                              {opt.id}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Dates Selector */}
                    <div className="agent-field-header" style={{ marginBottom: "0.35rem" }}>
                      <label className="agent-label" style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                        <CalendarIcon size={14} style={{ color: "#2563eb" }} />
                        Treatment Dates <span style={{ color: "#dc2626" }}>*</span>
                      </label>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span className="agent-period-range">
                          {formatDateRange(activePeriod?.periodStart, activePeriod?.periodEnd)}
                        </span>
                        {selectedDates.length > 0 && !isAgentLockedForPeriod && (
                          <button
                            type="button"
                            onClick={() => setSelectedDates([])}
                            className="agent-clear-link"
                          >
                            Clear ({selectedDates.length})
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Days Grid */}
                    <div className="agent-days-container">
                      {periodDays.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "1.5rem", color: "#64748b", fontSize: "0.8rem" }}>
                          No dates available for this cycle.
                        </div>
                      ) : (
                        <div className="agent-days-grid">
                          {periodDays.map((d) => {
                            const isSelected = selectedDates.includes(d.key);
                            return (
                              <button
                                key={d.key}
                                type="button"
                                disabled={isAgentLockedForPeriod}
                                onClick={() => toggleDateSelection(d.key)}
                                className={`agent-day-cell ${isSelected ? "selected" : ""} ${d.isToday ? "today" : ""}`}
                              >
                                <span className="agent-day-name">{d.dayOfWeek}</span>
                                <span className="agent-day-num">{d.dayNumber}</span>
                                {d.isToday && !isSelected && <span className="agent-day-badge">TODAY</span>}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Selected Tags */}
                    {selectedDates.length > 0 && (
                      <div className="agent-selected-tags">
                        {selectedDates.map((dKey) => (
                          <span key={dKey} onClick={() => toggleDateSelection(dKey)} className="agent-date-pill">
                            {formatDisplayDate(dKey)} ✕
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Save / Update Button on the Right */}
                    <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.6rem" }}>
                      {editingVisitId && (
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          style={{
                            padding: "0.6rem 0.85rem",
                            borderRadius: "10px",
                            border: "1px solid #cbd5e1",
                            backgroundColor: "#ffffff",
                            color: "#475569",
                            fontSize: "0.85rem",
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          Cancel
                        </button>
                      )}
                      <button
                        type="submit"
                        disabled={submitting || selectedDates.length === 0 || isAgentLockedForPeriod || !selectedPeriodId}
                        className="agent-save-btn"
                        style={{
                          flex: 1,
                          marginTop: 0,
                          backgroundColor: editingVisitId ? "#059669" : "#2563eb",
                        }}
                      >
                        <Check size={16} />
                        <span>
                          {editingVisitId
                            ? `Update Record (${selectedDates.length} ${selectedDates.length === 1 ? "day" : "days"})`
                            : `Save Patient Visits (${selectedDates.length} ${selectedDates.length === 1 ? "day" : "days"})`}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            </div>

            {/* Bottom Records Table */}
            <div className="agent-panel">
              <div className="agent-records-header">
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <h3 style={{ fontSize: "0.95rem", fontWeight: 800, margin: 0, color: "#0f172a" }}>
                    Recorded Patients in this Cycle
                  </h3>
                  <span className="agent-tab-count">{currentCycleVisits.length}</span>
                </div>
                <button type="button" onClick={loadVisits} className="agent-refresh-link">
                  Refresh
                </button>
              </div>

              {loadingVisits ? (
                <div style={{ textAlign: "center", padding: "1.5rem", color: "#64748b", fontSize: "0.85rem" }}>
                  Loading records...
                </div>
              ) : currentCycleVisits.length === 0 ? (
                <div className="agent-empty-box">
                  <CalendarCheck size={24} style={{ color: "#94a3b8", marginBottom: "0.35rem" }} />
                  <p style={{ margin: 0, fontWeight: 600, fontSize: "0.85rem", color: "#475569" }}>
                    No patient visits logged yet for this cycle.
                  </p>
                </div>
              ) : (
                <div className="agent-table-wrapper">
                  <table className="agent-table">
                    <thead>
                      <tr>
                        <th>Patient</th>
                        <th>Service</th>
                        <th>Dates</th>
                        <th>Notes</th>
                        <th style={{ textAlign: "center" }}>Status</th>
                        <th style={{ textAlign: "right" }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentCycleVisits.map((v) => {
                        const isBeingEdited = editingVisitId === v._id;
                        return (
                          <tr
                            key={v._id}
                            style={{
                              backgroundColor: isBeingEdited ? "#eff6ff" : undefined,
                              borderLeft: isBeingEdited ? "3px solid #2563eb" : undefined,
                            }}
                          >
                            <td style={{ fontWeight: 700, color: "#0f172a" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                                <span>{v.patientName}</span>
                                {isBeingEdited && (
                                  <span style={{ fontSize: "0.65rem", padding: "1px 5px", borderRadius: "4px", backgroundColor: "#dbeafe", color: "#1d4ed8", fontWeight: 700 }}>
                                    EDITING
                                  </span>
                                )}
                              </div>
                            </td>
                            <td>
                              <span className="agent-service-tag">{v.serviceType || "Visit"}</span>
                            </td>
                            <td>
                              <div className="agent-table-dates">
                                {v.visitDates.map((dt) => (
                                  <span key={dt} className="agent-table-date-pill">
                                    {formatDisplayDate(dt)}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td style={{ color: "#64748b", fontSize: "0.78rem" }}>{v.notes || "—"}</td>
                            <td style={{ textAlign: "center" }}>
                              <span className={`agent-row-status status-${v.status || "pending"}`}>
                                {v.status === "invoiced" ? "Invoiced" : v.status === "approved" ? "Approved" : "Pending"}
                              </span>
                            </td>
                            <td style={{ textAlign: "right" }}>
                              {v.status !== "invoiced" && !isAgentLockedForPeriod ? (
                                <div style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
                                  <button
                                    type="button"
                                    onClick={() => handleSelectVisitForEdit(v)}
                                    className={`agent-edit-btn ${isBeingEdited ? "active" : ""}`}
                                    title="Edit patient name or dates"
                                  >
                                    <Edit2 size={13} />
                                    <span>{isBeingEdited ? "Editing" : "Edit"}</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteVisit(v._id)}
                                    className="agent-delete-btn"
                                    title="Delete"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              ) : (
                                <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>Locked</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* TAB 2: PAST BILLING CYCLES & HISTORICAL RECORDS */
          <div className="agent-panel">
            <div className="agent-records-header" style={{ marginBottom: "0.85rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <History size={17} style={{ color: "#2563eb" }} />
                <h3 style={{ fontSize: "0.95rem", fontWeight: 800, margin: 0, color: "#0f172a" }}>
                  Past Billing Cycles
                </h3>
                <span className="agent-tab-count count-muted">{filteredPastCycles.length}</span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <div style={{ position: "relative" }}>
                  <Search size={13} style={{ position: "absolute", left: "0.6rem", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                  <input
                    type="text"
                    placeholder="Search past cycles..."
                    value={pastSearchQuery}
                    onChange={(e) => setPastSearchQuery(e.target.value)}
                    className="agent-search-input"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    loadPeriods();
                    loadVisits();
                  }}
                  className="agent-refresh-link"
                >
                  Refresh
                </button>
              </div>
            </div>

            {loadingPeriods ? (
              <div style={{ textAlign: "center", padding: "2rem", color: "#64748b", fontSize: "0.85rem" }}>
                Loading past cycles...
              </div>
            ) : filteredPastCycles.length === 0 ? (
              <div className="agent-empty-box">
                <History size={26} style={{ color: "#94a3b8", marginBottom: "0.35rem" }} />
                <p style={{ margin: 0, fontWeight: 600, fontSize: "0.85rem", color: "#475569" }}>
                  No closed billing cycles found.
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {filteredPastCycles.map((p) => {
                  const num = p.lotNumber ? String(p.lotNumber).padStart(3, "0") : (p.lotCode ? p.lotCode.replace(/LOT\s*/i, "") : "");
                  const cycleVisits = visits.filter(
                    (v) => (v.lotId && v.lotId.toString() === p._id) || (p.lotCode && v.lotCode === p.lotCode)
                  );

                  return (
                    <div key={p._id} className="agent-history-card">
                      <div className="agent-history-top">
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                            <span style={{ fontWeight: 800, fontSize: "0.95rem", color: "#0f172a" }}>
                              Billing Cycle #{num}
                            </span>
                            <span className="agent-status-tag tag-closed">Closed</span>
                          </div>
                          <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: "2px" }}>
                            <strong>{p.agencyName || "Agency"}</strong> • {formatDateRange(p.periodStart, p.periodEnd)}
                          </div>
                        </div>
                        <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#334155" }}>
                          {cycleVisits.length} {cycleVisits.length === 1 ? "record" : "records"}
                        </span>
                      </div>

                      {cycleVisits.length > 0 && (
                        <div className="agent-history-grid">
                          {cycleVisits.map((v) => (
                            <div key={v._id} className="agent-history-subitem">
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <span style={{ fontWeight: 700, fontSize: "0.82rem", color: "#0f172a" }}>{v.patientName}</span>
                                <span className="agent-service-tag">{v.serviceType || "Visit"}</span>
                              </div>
                              <div style={{ fontSize: "0.7rem", color: "#64748b", display: "flex", flexWrap: "wrap", gap: "0.2rem", marginTop: "0.25rem" }}>
                                {v.visitDates.map((dt) => (
                                  <span key={dt} style={{ backgroundColor: "#ffffff", padding: "1px 4px", borderRadius: "3px", border: "1px solid #e2e8f0" }}>
                                    {formatDisplayDate(dt)}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      <style jsx global>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .agent-shell {
          min-height: 100vh;
          background-color: #f8fafc;
          display: flex;
          flex-direction: column;
          color: "#0f172a";
          font-family: var(--font-body, -apple-system, sans-serif);
        }

        .agent-header {
          position: sticky;
          top: 0;
          z-index: 40;
          background-color: #ffffff;
          border-bottom: 1px solid #e2e8f0;
          padding: 0.5rem 1.25rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          box-sizing: border-box;
        }

        .agent-brand-logo {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background-color: #2563eb;
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 0.95rem;
        }

        .agent-user-pill {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.25rem 0.55rem;
          border-radius: 9999px;
          background-color: #f1f5f9;
          font-size: 0.78rem;
          font-weight: 600;
          color: #334155;
        }

        .agent-logout-btn {
          padding: 0.35rem;
          border-radius: 6px;
          background-color: #fef2f2;
          color: #dc2626;
          border: 1px solid #fee2e2;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .agent-main {
          flex: 1;
          width: 100%;
          max-width: 100%;
          padding: 0.75rem 1.25rem 2rem 1.25rem;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .agent-tabs-bar {
          display: inline-flex;
          background-color: #e2e8f0;
          padding: 2px;
          border-radius: 10px;
          max-width: 440px;
          width: 100%;
        }

        .agent-tab-item {
          flex: 1;
          padding: 0.45rem 0.6rem;
          border-radius: 8px;
          font-size: 0.82rem;
          font-weight: 700;
          border: none;
          cursor: pointer;
          background-color: transparent;
          color: #64748b;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.35rem;
          transition: all 0.1s ease;
        }

        .agent-tab-item.active {
          background-color: #ffffff;
          color: #0f172a;
          box-shadow: 0 1px 2px rgba(0,0,0,0.06);
        }

        .agent-tab-count {
          background-color: #2563eb;
          color: #ffffff;
          font-size: 0.68rem;
          padding: 1px 5px;
          border-radius: 9999px;
          font-weight: 800;
        }

        .count-muted {
          background-color: #64748b !important;
        }

        .agent-stack {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          width: 100%;
        }

        .agent-control-banner {
          background-color: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: 12px;
          padding: 0.5rem 0.85rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 0.6rem;
        }

        .agent-cycles-btn-group {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          flex-wrap: wrap;
        }

        .agent-cycle-pill-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.35rem 0.65rem;
          border-radius: 8px;
          border: 1.5px solid #cbd5e1;
          background-color: #f8fafc;
          color: #334155;
          font-size: 0.8rem;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .agent-cycle-pill-btn:hover {
          border-color: #93c5fd;
          background-color: #eff6ff;
        }

        .agent-cycle-pill-btn.selected {
          border-color: #2563eb;
          background-color: #eff6ff;
          color: #1d4ed8;
          box-shadow: 0 1px 3px rgba(37, 99, 235, 0.12);
        }

        .agent-cycle-pill-title {
          font-weight: 800;
          color: inherit;
        }

        .agent-cycle-pill-agency {
          font-weight: 700;
          color: inherit;
          opacity: 0.9;
        }

        .agent-cycle-pill-dates {
          font-size: 0.72rem;
          opacity: 0.75;
          color: inherit;
        }

        .agent-status-tag {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 0.75rem;
          font-weight: 700;
          padding: 0.25rem 0.6rem;
          border-radius: 6px;
        }

        .tag-locked {
          background-color: #ecfdf5;
          color: #065f46;
          border: 1px solid #a7f3d0;
        }

        .tag-review {
          background-color: #fffbeb;
          color: #b45309;
          border: 1px solid #fde68a;
        }

        .tag-closed {
          background-color: #f1f5f9;
          color: #475569;
          border: 1px solid #cbd5e1;
        }

        .agent-submit-btn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 0.78rem;
          font-weight: 700;
          padding: 0.35rem 0.75rem;
          border-radius: 6px;
          background-color: #2563eb;
          color: #ffffff;
          border: none;
          cursor: pointer;
        }

        .agent-submit-btn:disabled {
          background-color: #94a3b8;
          cursor: not-allowed;
        }

        .agent-notice {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.8rem;
          padding: 0.5rem 0.75rem;
          border-radius: 8px;
        }

        .notice-locked {
          background-color: #ecfdf5;
          color: #065f46;
          border: 1px solid #a7f3d0;
        }

        .notice-success {
          background-color: #ecfdf5;
          color: #065f46;
          border: 1px solid #a7f3d0;
        }

        .notice-error {
          background-color: #fef2f2;
          color: #991b1b;
          border: 1px solid #fecaca;
        }

        .agent-panel {
          background-color: #ffffff;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          padding: 0.85rem 1rem;
          box-sizing: border-box;
          width: 100%;
          transition: all 0.2s ease;
        }

        .agent-panel-locked {
          background-color: #f8fafc;
          border-color: #e2e8f0;
          opacity: 0.58;
          filter: grayscale(85%);
          pointer-events: none;
          user-select: none;
          cursor: not-allowed;
          position: relative;
        }

        .agent-panel-locked input,
        .agent-panel-locked textarea,
        .agent-panel-locked button {
          cursor: not-allowed !important;
          background-color: #f1f5f9 !important;
          color: #94a3b8 !important;
          border-color: #e2e8f0 !important;
        }

        .agent-panel-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1rem;
        }

        .agent-panel-left {
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
        }

        .agent-panel-right {
          display: flex;
          flex-direction: column;
        }

        .agent-field-block {
          position: relative;
        }

        .agent-field-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.25rem;
        }

        .agent-label {
          font-size: 0.8rem;
          font-weight: 700;
          color: #1e293b;
        }

        .agent-hint {
          font-size: 0.7rem;
          color: #64748b;
          display: flex;
          align-items: center;
          gap: 3px;
        }

        .agent-role-tag {
          font-size: 0.7rem;
          font-weight: 700;
          padding: 1px 6px;
          border-radius: 4px;
          background-color: #eff6ff;
          color: #1d4ed8;
          border: 1px solid #bfdbfe;
        }

        .agent-input {
          width: 100%;
          padding: 0.5rem 0.75rem 0.5rem 2rem;
          border-radius: 8px;
          border: 1.5px solid #cbd5e1;
          font-size: 0.88rem;
          color: #0f172a;
          background-color: #ffffff;
          outline: none;
          box-sizing: border-box;
        }

        .agent-textarea {
          padding: 0.5rem 0.75rem !important;
          resize: none;
          font-family: inherit;
          min-height: 80px;
        }

        .agent-input-sm {
          padding: 0.45rem 0.7rem !important;
          font-size: 0.82rem !important;
        }

        .agent-input-icon {
          position: absolute;
          left: 0.65rem;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
        }

        .agent-suggest-menu {
          position: absolute;
          top: calc(100% + 2px);
          left: 0;
          right: 0;
          z-index: 50;
          background-color: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
          max-height: 180px;
          overflow-y: auto;
          padding: 0.25rem 0;
        }

        .agent-suggest-item {
          width: 100%;
          text-align: left;
          padding: 0.45rem 0.65rem;
          font-size: 0.82rem;
          color: #0f172a;
          background: none;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .agent-suggest-item:hover {
          background-color: #eff6ff;
        }

        .agent-btn-group {
          display: flex;
          gap: 0.35rem;
          flex-wrap: wrap;
        }

        .agent-service-btn {
          flex: 1 1 70px;
          padding: 0.45rem 0.3rem;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          background-color: #ffffff;
          color: #334155;
          font-weight: 700;
          font-size: 0.8rem;
          cursor: pointer;
          text-align: center;
        }

        .agent-service-btn.selected {
          border: 2px solid #2563eb;
          background-color: #eff6ff;
          color: #1d4ed8;
        }

        .agent-save-btn {
          width: 100%;
          padding: 0.6rem;
          border-radius: 10px;
          border: none;
          background-color: #2563eb;
          color: #ffffff;
          font-size: 0.88rem;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          margin-top: 0.2rem;
        }

        .agent-save-btn:disabled {
          background-color: #94a3b8;
          cursor: not-allowed;
        }

        .agent-period-range {
          font-size: 0.72rem;
          color: #64748b;
          font-weight: 600;
        }

        .agent-clear-link {
          font-size: 0.72rem;
          color: #dc2626;
          font-weight: 700;
          cursor: pointer;
          background: none;
          border: none;
          padding: 0;
          text-decoration: underline;
        }

        .agent-days-container {
          background-color: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 0.5rem;
        }

        .agent-days-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(64px, 1fr));
          gap: 0.35rem;
        }

        .agent-day-cell {
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          background-color: #ffffff;
          color: #1e293b;
          font-weight: 600;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 0.4rem 0.15rem;
          cursor: pointer;
          transition: all 0.1s ease;
        }

        .agent-day-cell.selected {
          border: 2px solid #2563eb;
          background-color: #2563eb;
          color: #ffffff;
          font-weight: 800;
        }

        .agent-day-cell.today:not(.selected) {
          border: 1.5px solid #93c5fd;
          background-color: #eff6ff;
          color: #1d4ed8;
        }

        .agent-day-name {
          font-size: 0.64rem;
          text-transform: uppercase;
          opacity: 0.85;
        }

        .agent-day-num {
          font-size: 0.95rem;
          font-weight: 800;
        }

        .agent-day-badge {
          font-size: 0.52rem;
          color: #2563eb;
          font-weight: 800;
        }

        .agent-selected-tags {
          margin-top: 0.4rem;
          display: flex;
          flex-wrap: wrap;
          gap: 0.25rem;
        }

        .agent-date-pill {
          background-color: #eff6ff;
          border: 1px solid #bfdbfe;
          color: #1d4ed8;
          font-size: 0.7rem;
          font-weight: 600;
          padding: 0.1rem 0.4rem;
          border-radius: 9999px;
          cursor: pointer;
        }

        .agent-records-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.6rem;
        }

        .agent-refresh-link {
          font-size: 0.75rem;
          color: #2563eb;
          font-weight: 700;
          cursor: pointer;
          background: none;
          border: none;
        }

        .agent-empty-box {
          text-align: center;
          padding: 1.5rem 1rem;
          background-color: #f8fafc;
          border-radius: 8px;
          border: 1px dashed #cbd5e1;
        }

        .agent-table-wrapper {
          overflow-x: auto;
          width: 100%;
        }

        .agent-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.82rem;
        }

        .agent-table th {
          text-align: left;
          padding: 0.45rem 0.6rem;
          font-size: 0.7rem;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
          border-bottom: 1px solid #e2e8f0;
          background-color: #f8fafc;
        }

        .agent-table td {
          padding: 0.55rem 0.6rem;
          border-bottom: 1px solid #f1f5f9;
          vertical-align: middle;
        }

        .agent-service-tag {
          font-size: 0.7rem;
          font-weight: 700;
          padding: 1px 6px;
          border-radius: 4px;
          background-color: #eff6ff;
          color: #1d4ed8;
          border: 1px solid #bfdbfe;
        }

        .agent-table-dates {
          display: flex;
          flex-wrap: wrap;
          gap: 0.2rem;
        }

        .agent-table-date-pill {
          font-size: 0.68rem;
          background-color: #f1f5f9;
          color: #334155;
          padding: 0.1rem 0.35rem;
          border-radius: 4px;
          font-weight: 600;
        }

        .agent-row-status {
          font-size: 0.68rem;
          font-weight: 700;
          padding: 1px 6px;
          border-radius: 4px;
          text-transform: uppercase;
        }

        .status-invoiced {
          background-color: #ecfdf5;
          color: #065f46;
          border: 1px solid #a7f3d0;
        }

        .status-approved {
          background-color: #eff6ff;
          color: #1d4ed8;
          border: 1px solid #bfdbfe;
        }

        .status-pending {
          background-color: #fffbeb;
          color: #b45309;
          border: 1px solid #fde68a;
        }

        .agent-edit-btn {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          color: #2563eb;
          cursor: pointer;
          border: 1px solid #bfdbfe;
          background-color: #eff6ff;
          font-size: 0.75rem;
          font-weight: 700;
          transition: all 0.1s ease;
        }

        .agent-edit-btn:hover {
          background-color: #dbeafe;
          border-color: #93c5fd;
        }

        .agent-edit-btn.active {
          background-color: #2563eb;
          color: #ffffff;
          border-color: #1d4ed8;
        }

        .agent-delete-btn {
          padding: 0.25rem 0.45rem;
          border-radius: 4px;
          color: #dc2626;
          cursor: pointer;
          border: 1px solid #fee2e2;
          background-color: #fef2f2;
        }

        .agent-search-input {
          padding: 0.3rem 0.5rem 0.3rem 1.7rem;
          border-radius: 6px;
          border: 1px solid #cbd5e1;
          font-size: 0.78rem;
          outline: none;
          width: 180px;
        }

        .agent-history-card {
          background-color: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 0.75rem;
        }

        .agent-history-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid #f1f5f9;
          padding-bottom: 0.45rem;
          margin-bottom: 0.45rem;
        }

        .agent-history-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 0.5rem;
        }

        .agent-history-subitem {
          background-color: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 0.5rem;
        }

        /* Desktop Optimization (>= 1024px) */
        @media (min-width: 1024px) {
          .agent-header {
            padding: 0.5rem 2rem;
          }

          .agent-main {
            padding: 0.85rem 2rem 2rem 2rem;
          }

          .agent-panel-grid {
            grid-template-columns: 360px 1fr;
            gap: 1.5rem;
          }
        }

        @media (min-width: 1400px) {
          .agent-panel-grid {
            grid-template-columns: 400px 1fr;
            gap: 2rem;
          }
        }
      `}</style>
    </div>
  );
}
