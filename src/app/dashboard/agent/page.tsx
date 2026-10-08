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
  Building2,
  FileCheck2,
  Search,
  Sparkles,
} from "lucide-react";
import { IAgentVisit, IUser, ILot } from "@/lib/types";

// Helper to format date to "YYYY-MM-DD"
function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Helper to format date for display
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
  const sStr = s.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const eStr = e.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return `${sStr} — ${eStr}`;
}

export default function AgentPortalPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<IUser | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // Billing Cycles state
  const [allPeriods, setAllPeriods] = useState<ILot[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>("");
  const [loadingPeriods, setLoadingPeriods] = useState(true);

  // Form states
  const [patientName, setPatientName] = useState("");
  const [serviceType, setServiceType] = useState("PT Visit");
  const [notes, setNotes] = useState("");
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState(false);
  const [submittingPeriod, setSubmittingPeriod] = useState(false);

  // Autocomplete state
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Visits list state
  const [visits, setVisits] = useState<IAgentVisit[]>([]);
  const [loadingVisits, setLoadingVisits] = useState(true);

  // Tab State: "active_cycle" vs "past_cycles"
  const [activeTab, setActiveTab] = useState<"active_cycle" | "past_cycles">("active_cycle");

  // Filter for past cycles tab
  const [pastSearchQuery, setPastSearchQuery] = useState("");

  const agentRole = (currentUser as any)?.agentType === "PTA" ? "PTA" : "PT";
  const isPTA = agentRole === "PTA";

  // Fast service definitions
  const serviceOptions = useMemo(() => {
    if (isPTA) {
      return [
        { id: "Visit", label: "Standard Visit" },
        { id: "Missed Visit", label: "Missed Visit" },
        { id: "Special Rate", label: "Special Rate" },
      ];
    }
    return [
      { id: "SOC", label: "Start of Care" },
      { id: "Eval", label: "Evaluation" },
      { id: "ReEval", label: "Re-Evaluation" },
      { id: "ReCert", label: "Recertification" },
      { id: "Disch", label: "Discharge" },
      { id: "Missed Visit", label: "Missed Visit" },
    ];
  }, [isPTA]);

  // Set initial serviceType when options change
  useEffect(() => {
    if (serviceOptions.length > 0 && !serviceOptions.some((s) => s.id === serviceType)) {
      setServiceType(serviceOptions[0].id);
    }
  }, [serviceOptions, serviceType]);

  // Load User Info
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

  // Load Billing Cycles
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
      console.error("Error loading billing cycles:", err);
    } finally {
      setLoadingPeriods(false);
    }
  };

  useEffect(() => {
    loadPeriods();
  }, []);

  // Filter open vs past cycles
  const openPeriods = useMemo(() => {
    return allPeriods.filter((p) => p.status === "open");
  }, [allPeriods]);

  const pastPeriods = useMemo(() => {
    return allPeriods.filter((p) => p.status === "closed");
  }, [allPeriods]);

  // Selected period object
  const activePeriod = useMemo(() => {
    return allPeriods.find((p) => p._id === selectedPeriodId) || null;
  }, [allPeriods, selectedPeriodId]);

  // Format cycle display title without ever using the word "LOT"
  const getCycleDisplayTitle = (p: ILot) => {
    const num = p.lotNumber ? String(p.lotNumber).padStart(3, "0") : (p.lotCode ? p.lotCode.replace(/LOT\s*/i, "") : "");
    const namePart = num ? `Cycle #${num}` : "Billing Cycle";
    return `${namePart} — ${p.agencyName || "Agency"} (${formatDateShort(p.periodStart)} to ${formatDateShort(p.periodEnd)})`;
  };

  // Check if current agent is completed/locked for this period
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

  // Check if current agent has marked submitted
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

  // Load Visits
  const loadVisits = async () => {
    try {
      const res = await fetch("/api/agent/visits");
      const data = await res.json();
      if (res.ok && data.visits) {
        setVisits(data.visits);
      }
    } catch (err) {
      console.error("Error loading visits:", err);
    } finally {
      setLoadingVisits(false);
    }
  };

  useEffect(() => {
    loadVisits();
  }, []);

  // Distinct Patient Names for Smart Autocomplete Recommendations
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

  // Filtered Patient Suggestions based on what agent is typing
  const patientSuggestions = useMemo(() => {
    if (!patientName.trim()) return distinctPatientNames.slice(0, 8);
    const q = patientName.toLowerCase().trim();
    return distinctPatientNames
      .filter((name) => name.toLowerCase().includes(q))
      .slice(0, 8);
  }, [distinctPatientNames, patientName]);

  // Close suggestions on outside click
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

  // Generate Calendar Days exclusively for the selected Billing Cycle
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

  // Visits logged exclusively in the CURRENT active cycle
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

  // Visits logged in PAST cycles
  const pastCycleVisits = useMemo(() => {
    return visits.filter((v) => {
      if (v.lotId && v.lotId.toString() === selectedPeriodId) return false;
      if (activePeriod && v.lotCode && activePeriod.lotCode && v.lotCode === activePeriod.lotCode) return false;
      return true;
    });
  }, [visits, selectedPeriodId, activePeriod]);

  // Filtered past cycles for Tab 2
  const filteredPastCycles = useMemo(() => {
    if (!pastSearchQuery.trim()) return pastPeriods;
    const q = pastSearchQuery.toLowerCase();
    return pastPeriods.filter((p) => {
      const agency = p.agencyName?.toLowerCase() || "";
      const num = String(p.lotNumber || "");
      return agency.includes(q) || num.includes(q);
    });
  }, [pastPeriods, pastSearchQuery]);

  // Toggle date selection
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

  // Submit Visit Form
  const handleSubmitVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess(false);

    if (isAgentLockedForPeriod) {
      setFormError("This billing cycle has been finalized by your manager and locked for editing.");
      return;
    }

    if (!selectedPeriodId) {
      setFormError("Please select a billing cycle first.");
      return;
    }

    if (!patientName.trim()) {
      setFormError("Please enter the patient's name.");
      return;
    }

    if (selectedDates.length === 0) {
      setFormError("Please select at least one treatment day from this billing cycle.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/agent/visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientName: patientName.trim(),
          serviceType,
          visitDates: selectedDates,
          notes,
          lotId: selectedPeriodId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to record visit");
      }

      setFormSuccess(true);
      setPatientName("");
      setSelectedDates([]);
      setNotes("");
      setShowSuggestions(false);
      loadVisits();
      loadPeriods();

      setTimeout(() => {
        setFormSuccess(false);
      }, 3500);
    } catch (err: any) {
      setFormError(err.message || "Failed to submit visit");
    } finally {
      setSubmitting(false);
    }
  };

  // Agent submits all records for manager review
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
        throw new Error(err.error || "Failed to submit billing cycle");
      }

      alert("Awesome! Your visits for this billing cycle have been submitted to the manager for review.");
      loadPeriods();
    } catch (err: any) {
      alert(err.message || "Network error");
    } finally {
      setSubmittingPeriod(false);
    }
  };

  // Delete a pending visit
  const handleDeleteVisit = async (id?: string) => {
    if (!id) return;
    if (!confirm("Are you sure you want to delete this visit record?")) return;

    try {
      const res = await fetch(`/api/agent/visits?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setVisits((prev) => prev.filter((v) => v._id !== id));
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete visit");
      }
    } catch {
      alert("Failed to delete visit record");
    }
  };

  if (loadingUser) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f8fafc",
          color: "#64748b",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              border: "3px solid #cbd5e1",
              borderTopColor: "#2563eb",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
              margin: "0 auto 12px",
            }}
          />
          <p style={{ fontSize: "0.9rem", fontWeight: 500 }}>Loading Agent Portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#f8fafc",
        display: "flex",
        flexDirection: "column",
        color: "#0f172a",
        fontFamily: "var(--font-body, -apple-system, sans-serif)",
      }}
    >
      {/* Top Bar with Responsive Optimization */}
      <header className="agent-header">
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              backgroundColor: "#2563eb",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: "1rem",
              boxShadow: "0 2px 4px rgba(37,99,235,0.25)",
            }}
          >
            T
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: "1.05rem", lineHeight: 1.2 }}>
              THER-INV
            </div>
            <div
              style={{
                fontSize: "0.72rem",
                color: "#059669",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  backgroundColor: "#059669",
                  display: "inline-block",
                }}
              />
              Agent Portal
            </div>
          </div>
        </div>

        {/* User Info & Logout Pill */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              padding: "0.35rem 0.65rem",
              borderRadius: "9999px",
              backgroundColor: "#f1f5f9",
              fontSize: "0.8rem",
              fontWeight: 600,
              color: "#334155",
            }}
          >
            <User size={13} style={{ color: "#2563eb" }} />
            <span style={{ maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {currentUser?.name || "Agent"}
            </span>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            title="Log out"
            style={{
              padding: "0.45rem",
              borderRadius: "8px",
              backgroundColor: "#fef2f2",
              color: "#dc2626",
              border: "1px solid #fee2e2",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <LogOut size={15} />
          </button>
        </div>
      </header>

      {/* Main Full-Width Container */}
      <main className="agent-portal-main">
        {/* Navigation Tabs (Single Tab for Active Cycle + One for Past Cycles History) */}
        <div className="agent-tabs-container">
          <button
            type="button"
            onClick={() => setActiveTab("active_cycle")}
            className={`agent-tab-btn ${activeTab === "active_cycle" ? "active" : ""}`}
          >
            <Plus size={16} />
            <span>Active Billing Cycle</span>
            {currentCycleVisits.length > 0 && (
              <span className="agent-tab-badge">
                {currentCycleVisits.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("past_cycles")}
            className={`agent-tab-btn ${activeTab === "past_cycles" ? "active" : ""}`}
          >
            <History size={16} />
            <span>Past Cycles & History</span>
            {pastCycleVisits.length > 0 && (
              <span
                style={{
                  backgroundColor: "#64748b",
                  color: "#ffffff",
                  fontSize: "0.72rem",
                  padding: "1px 6px",
                  borderRadius: "9999px",
                  fontWeight: 800,
                }}
              >
                {pastCycleVisits.length}
              </span>
            )}
          </button>
        </div>

        {activeTab === "active_cycle" ? (
          /* TAB 1: ALL-IN-ONE ACTIVE BILLING CYCLE (TOP ENTRY + BOTTOM RECORDED VISITS) */
          <div className="agent-view-scrollable">
            {/* Cycle Header & Submission Controls */}
            <div className="agent-cycle-banner">
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
                <Layers size={19} style={{ color: "#2563eb", flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: "0.74rem", fontWeight: 700, color: "#1e40af", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                    Active Billing Cycle
                  </div>
                  {openPeriods.length === 0 ? (
                    <span style={{ fontSize: "0.85rem", color: "#b45309", fontWeight: 600 }}>
                      No open billing cycles available right now
                    </span>
                  ) : (
                    <select
                      value={selectedPeriodId}
                      onChange={(e) => setSelectedPeriodId(e.target.value)}
                      style={{
                        backgroundColor: "#ffffff",
                        border: "1.5px solid #93c5fd",
                        borderRadius: "8px",
                        padding: "0.35rem 0.65rem",
                        fontSize: "0.88rem",
                        fontWeight: 700,
                        color: "#0f172a",
                        cursor: "pointer",
                        outline: "none",
                        marginTop: "2px",
                      }}
                    >
                      {openPeriods.map((p) => (
                        <option key={p._id} value={p._id}>
                          {getCycleDisplayTitle(p)}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Status & Submit CTA */}
              {activePeriod && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  {isAgentLockedForPeriod ? (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px",
                        fontSize: "0.78rem",
                        fontWeight: 700,
                        padding: "0.3rem 0.75rem",
                        borderRadius: "8px",
                        backgroundColor: "#ecfdf5",
                        color: "#065f46",
                        border: "1px solid #a7f3d0",
                      }}
                    >
                      <Lock size={13} /> Finalized & Invoiced
                    </span>
                  ) : isAgentSubmittedForPeriod ? (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px",
                        fontSize: "0.78rem",
                        fontWeight: 700,
                        padding: "0.3rem 0.75rem",
                        borderRadius: "8px",
                        backgroundColor: "#fffbeb",
                        color: "#b45309",
                        border: "1px solid #fde68a",
                      }}
                    >
                      <Clock size={13} /> Under Manager Review
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleNotifyManagerReady}
                      disabled={submittingPeriod || currentCycleVisits.length === 0}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px",
                        fontSize: "0.8rem",
                        fontWeight: 700,
                        padding: "0.4rem 0.9rem",
                        borderRadius: "8px",
                        backgroundColor: currentCycleVisits.length === 0 ? "#94a3b8" : "#2563eb",
                        color: "#ffffff",
                        border: "none",
                        cursor: currentCycleVisits.length === 0 ? "not-allowed" : "pointer",
                        boxShadow: "0 2px 5px rgba(37,99,235,0.2)",
                      }}
                      title="Submit your logged visits to the manager for review"
                    >
                      <Send size={13} />
                      <span>{submittingPeriod ? "Submitting..." : "Submit to Manager"}</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Lock notification */}
            {isAgentLockedForPeriod && (
              <div
                style={{
                  backgroundColor: "#ecfdf5",
                  border: "1px solid #a7f3d0",
                  color: "#065f46",
                  padding: "0.75rem 1rem",
                  borderRadius: "10px",
                  marginBottom: "1rem",
                  fontSize: "0.85rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <Lock size={16} style={{ color: "#059669", flexShrink: 0 }} />
                <span>
                  <strong>Cycle finalized:</strong> The manager has completed this billing cycle and generated your invoice. Records below are read-only.
                </span>
              </div>
            )}

            {/* Form Success/Error */}
            {formSuccess && (
              <div
                style={{
                  backgroundColor: "#ecfdf5",
                  border: "1px solid #a7f3d0",
                  color: "#065f46",
                  borderRadius: "10px",
                  padding: "0.75rem 1rem",
                  marginBottom: "1rem",
                  fontSize: "0.85rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.6rem",
                }}
              >
                <Check size={18} style={{ color: "#059669", flexShrink: 0 }} />
                <span>
                  <strong>Patient visit recorded successfully!</strong> Added to current billing cycle.
                </span>
              </div>
            )}

            {formError && (
              <div
                style={{
                  backgroundColor: "#fef2f2",
                  border: "1px solid #fecaca",
                  color: "#991b1b",
                  borderRadius: "10px",
                  padding: "0.75rem 1rem",
                  marginBottom: "1rem",
                  fontSize: "0.85rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.6rem",
                }}
              >
                <AlertCircle size={18} style={{ color: "#dc2626", flexShrink: 0 }} />
                <span>{formError}</span>
              </div>
            )}

            {/* TOP CARD: ADD NEW PATIENT & SELECT DATES */}
            <div className="agent-card" style={{ marginBottom: "1.25rem" }}>
              <div style={{ marginBottom: "1rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <h2 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#0f172a", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <Plus size={18} style={{ color: "#2563eb" }} />
                    Add Patient & Treatment Dates
                  </h2>
                  <p style={{ fontSize: "0.8rem", color: "#64748b" }}>
                    Type the patient name, select the service type and pick visit dates in this cycle.
                  </p>
                </div>

                <span
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    padding: "3px 10px",
                    borderRadius: "6px",
                    backgroundColor: isPTA ? "#fef3c7" : "#eff6ff",
                    color: isPTA ? "#b45309" : "#1d4ed8",
                    border: isPTA ? "1px solid #fde68a" : "1px solid #bfdbfe",
                  }}
                >
                  Role: {agentRole}
                </span>
              </div>

              <form onSubmit={handleSubmitVisit}>
                <div className="agent-form-split">
                  {/* Left Column: Patient Name with Autocomplete, Service Type, Notes, Submit */}
                  <div className="agent-col-fields">
                    {/* Patient Name with Smart Autocomplete Recommendations */}
                    <div style={{ marginBottom: "1rem", position: "relative" }} ref={suggestionsRef}>
                      <label
                        htmlFor="patient-name-input"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          fontSize: "0.85rem",
                          fontWeight: 700,
                          color: "#1e293b",
                          marginBottom: "0.35rem",
                        }}
                      >
                        <span>
                          Patient Name <span style={{ color: "#dc2626" }}>*</span>
                        </span>
                        {distinctPatientNames.length > 0 && (
                          <span style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 500, display: "flex", alignItems: "center", gap: "3px" }}>
                            <Sparkles size={11} style={{ color: "#2563eb" }} />
                            Past patients recommended
                          </span>
                        )}
                      </label>

                      <div style={{ position: "relative" }}>
                        <input
                          id="patient-name-input"
                          type="text"
                          required
                          disabled={isAgentLockedForPeriod}
                          placeholder="e.g. Maria Gonzalez or John Doe"
                          value={patientName}
                          autoComplete="off"
                          onFocus={() => setShowSuggestions(true)}
                          onChange={(e) => {
                            setPatientName(e.target.value);
                            setShowSuggestions(true);
                          }}
                          style={{
                            width: "100%",
                            padding: "0.7rem 1rem 0.7rem 2.4rem",
                            borderRadius: "10px",
                            border: "1.5px solid #cbd5e1",
                            fontSize: "0.95rem",
                            color: "#0f172a",
                            backgroundColor: isAgentLockedForPeriod ? "#f1f5f9" : "#ffffff",
                            outline: "none",
                          }}
                        />
                        <User
                          size={17}
                          style={{
                            position: "absolute",
                            left: "0.8rem",
                            top: "50%",
                            transform: "translateY(-50%)",
                            color: "#94a3b8",
                          }}
                        />
                      </div>

                      {/* Autocomplete Suggestions Dropdown */}
                      {showSuggestions && !isAgentLockedForPeriod && patientSuggestions.length > 0 && (
                        <div
                          style={{
                            position: "absolute",
                            top: "calc(100% + 4px)",
                            left: 0,
                            right: 0,
                            zIndex: 50,
                            backgroundColor: "#ffffff",
                            border: "1px solid #cbd5e1",
                            borderRadius: "10px",
                            boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)",
                            maxHeight: "220px",
                            overflowY: "auto",
                            padding: "0.35rem 0",
                          }}
                        >
                          <div style={{ padding: "0.3rem 0.75rem", fontSize: "0.7rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                            Previous Patients ({patientSuggestions.length})
                          </div>
                          {patientSuggestions.map((name) => (
                            <button
                              key={name}
                              type="button"
                              onClick={() => {
                                setPatientName(name);
                                setShowSuggestions(false);
                              }}
                              style={{
                                width: "100%",
                                textAlign: "left",
                                padding: "0.55rem 0.75rem",
                                fontSize: "0.85rem",
                                color: "#0f172a",
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                transition: "background-color 0.1s ease",
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#eff6ff")}
                              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                            >
                              <span style={{ fontWeight: 600 }}>{name}</span>
                              <span style={{ fontSize: "0.72rem", color: "#2563eb", fontWeight: 600 }}>
                                Select ↵
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Service Type Buttons */}
                    <div style={{ marginBottom: "1rem" }}>
                      <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#1e293b", marginBottom: "0.35rem" }}>
                        Evaluation / Service Type
                      </label>
                      <div className="agent-service-grid">
                        {serviceOptions.map((opt) => {
                          const isSelected = serviceType === opt.id;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              disabled={isAgentLockedForPeriod}
                              onClick={() => setServiceType(opt.id)}
                              style={{
                                padding: "0.55rem 0.35rem",
                                borderRadius: "10px",
                                border: isSelected ? "2px solid #2563eb" : "1px solid #cbd5e1",
                                backgroundColor: isSelected ? "#eff6ff" : "#ffffff",
                                color: isSelected ? "#1d4ed8" : "#334155",
                                fontWeight: isSelected ? 800 : 600,
                                fontSize: "0.82rem",
                                cursor: isAgentLockedForPeriod ? "not-allowed" : "pointer",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <span>{opt.id}</span>
                              <span style={{ fontSize: "0.64rem", opacity: 0.8 }}>{opt.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Notes */}
                    <div style={{ marginBottom: "1rem" }}>
                      <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#1e293b", marginBottom: "0.35rem" }}>
                        Additional Notes (Optional)
                      </label>
                      <textarea
                        rows={2}
                        disabled={isAgentLockedForPeriod}
                        placeholder="e.g. Evaluated shoulder mobility, home exercises assigned..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "0.6rem 0.8rem",
                          borderRadius: "10px",
                          border: "1.5px solid #cbd5e1",
                          fontSize: "0.85rem",
                          color: "#0f172a",
                          backgroundColor: isAgentLockedForPeriod ? "#f1f5f9" : "#ffffff",
                          outline: "none",
                          resize: "none",
                        }}
                      />
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={submitting || selectedDates.length === 0 || isAgentLockedForPeriod || !selectedPeriodId}
                      style={{
                        width: "100%",
                        padding: "0.75rem",
                        borderRadius: "12px",
                        border: "none",
                        backgroundColor:
                          selectedDates.length === 0 || isAgentLockedForPeriod ? "#94a3b8" : "#2563eb",
                        color: "#ffffff",
                        fontSize: "0.92rem",
                        fontWeight: 700,
                        cursor:
                          selectedDates.length === 0 || isAgentLockedForPeriod
                            ? "not-allowed"
                            : "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "0.5rem",
                        marginTop: "auto",
                      }}
                    >
                      {submitting ? (
                        <span>Saving visits...</span>
                      ) : (
                        <>
                          <Check size={18} />
                          <span>
                            Save Patient Visits ({selectedDates.length}{" "}
                            {selectedDates.length === 1 ? "day" : "days"})
                          </span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Right Column: Treatment Dates for Active Billing Cycle */}
                  <div className="agent-col-calendar">
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: "0.35rem",
                      }}
                    >
                      <label
                        style={{
                          fontSize: "0.85rem",
                          fontWeight: 700,
                          color: "#1e293b",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.35rem",
                        }}
                      >
                        <CalendarIcon size={16} style={{ color: "#2563eb" }} />
                        Treatment Dates in this Cycle <span style={{ color: "#dc2626" }}>*</span>
                      </label>
                      {selectedDates.length > 0 && !isAgentLockedForPeriod && (
                        <button
                          type="button"
                          onClick={() => setSelectedDates([])}
                          style={{
                            fontSize: "0.75rem",
                            color: "#dc2626",
                            fontWeight: 600,
                            cursor: "pointer",
                            textDecoration: "underline",
                          }}
                        >
                          Clear ({selectedDates.length})
                        </button>
                      )}
                    </div>

                    <p style={{ fontSize: "0.76rem", color: "#64748b", marginBottom: "0.5rem" }}>
                      Agency: <strong>{activePeriod?.agencyName || "N/A"}</strong> — Range: <strong>{formatDateRange(activePeriod?.periodStart, activePeriod?.periodEnd)}</strong>
                    </p>

                    {/* Calendar Days Box */}
                    <div className="agent-calendar-box">
                      {periodDays.length === 0 ? (
                        <div style={{ padding: "2rem", textAlign: "center", color: "#64748b", fontSize: "0.85rem" }}>
                          No active billing cycle selected.
                        </div>
                      ) : (
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fill, minmax(72px, 1fr))",
                            gap: "0.5rem",
                          }}
                        >
                          {periodDays.map((d) => {
                            const isSelected = selectedDates.includes(d.key);
                            return (
                              <button
                                key={d.key}
                                type="button"
                                disabled={isAgentLockedForPeriod}
                                onClick={() => toggleDateSelection(d.key)}
                                className="agent-day-btn"
                                style={{
                                  borderRadius: "10px",
                                  border: isSelected
                                    ? "2px solid #2563eb"
                                    : d.isToday
                                    ? "1.5px solid #93c5fd"
                                    : "1px solid #cbd5e1",
                                  backgroundColor: isSelected
                                    ? "#2563eb"
                                    : d.isToday
                                    ? "#eff6ff"
                                    : "#ffffff",
                                  color: isSelected
                                    ? "#ffffff"
                                    : d.isToday
                                    ? "#1d4ed8"
                                    : "#1e293b",
                                  fontWeight: isSelected || d.isToday ? 800 : 600,
                                  fontSize: "0.85rem",
                                  display: "flex",
                                  flexDirection: "column",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  padding: "0.6rem 0.2rem",
                                  cursor: isAgentLockedForPeriod ? "not-allowed" : "pointer",
                                  transition: "all 0.1s ease",
                                }}
                              >
                                <span style={{ fontSize: "0.68rem", textTransform: "uppercase", opacity: 0.85 }}>
                                  {d.dayOfWeek}
                                </span>
                                <span style={{ fontSize: "1.05rem", fontWeight: 800 }}>
                                  {d.dayNumber}
                                </span>
                                {d.isToday && !isSelected && (
                                  <span style={{ fontSize: "0.58rem", color: "#2563eb", fontWeight: 700 }}>
                                    TODAY
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Selected Badges */}
                    {selectedDates.length > 0 && (
                      <div
                        style={{
                          marginTop: "0.75rem",
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "0.35rem",
                          alignItems: "center",
                        }}
                      >
                        <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#334155" }}>
                          Selected ({selectedDates.length}):
                        </span>
                        {selectedDates.map((dKey) => (
                          <span
                            key={dKey}
                            onClick={() => toggleDateSelection(dKey)}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              backgroundColor: "#eff6ff",
                              border: "1px solid #bfdbfe",
                              color: "#1d4ed8",
                              fontSize: "0.75rem",
                              fontWeight: 600,
                              padding: "0.15rem 0.5rem",
                              borderRadius: "9999px",
                              cursor: "pointer",
                            }}
                          >
                            {formatDisplayDate(dKey)}
                            <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "#2563eb" }}>
                              ×
                            </span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </form>
            </div>

            {/* BOTTOM SECTION: RECORDED PATIENTS IN THIS BILLING CYCLE */}
            <div className="agent-card">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "1rem",
                  flexWrap: "wrap",
                  gap: "0.5rem",
                }}
              >
                <div>
                  <h3 style={{ fontSize: "1.05rem", fontWeight: 800, color: "#0f172a" }}>
                    Patients Recorded in this Billing Cycle ({currentCycleVisits.length})
                  </h3>
                  <p style={{ fontSize: "0.8rem", color: "#64748b" }}>
                    Visits submitted so far for {activePeriod ? getCycleDisplayTitle(activePeriod) : "this cycle"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={loadVisits}
                  style={{
                    fontSize: "0.8rem",
                    color: "#2563eb",
                    fontWeight: 600,
                    padding: "0.35rem 0.75rem",
                    borderRadius: "8px",
                    backgroundColor: "#eff6ff",
                    border: "1px solid #bfdbfe",
                    cursor: "pointer",
                  }}
                >
                  Refresh
                </button>
              </div>

              {loadingVisits ? (
                <div style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>
                  Loading recorded visits...
                </div>
              ) : currentCycleVisits.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "2.5rem 1rem",
                    backgroundColor: "#f8fafc",
                    borderRadius: "12px",
                    border: "1px dashed #cbd5e1",
                  }}
                >
                  <CalendarCheck size={28} style={{ color: "#94a3b8", margin: "0 auto 0.5rem" }} />
                  <p style={{ fontSize: "0.9rem", fontWeight: 600, color: "#475569" }}>
                    No patient visits logged for this billing cycle yet.
                  </p>
                  <p style={{ fontSize: "0.78rem", color: "#64748b" }}>
                    Use the form above to add your first patient treatment session.
                  </p>
                </div>
              ) : (
                <div className="agent-visits-table-container">
                  <table className="agent-table">
                    <thead>
                      <tr>
                        <th>Patient Name</th>
                        <th>Service Type</th>
                        <th>Treatment Dates</th>
                        <th>Notes</th>
                        <th style={{ textAlign: "center" }}>Status</th>
                        <th style={{ textAlign: "right" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentCycleVisits.map((v) => (
                        <tr key={v._id}>
                          <td style={{ fontWeight: 700, color: "#0f172a" }}>
                            {v.patientName}
                          </td>
                          <td>
                            <span
                              style={{
                                fontSize: "0.75rem",
                                fontWeight: 700,
                                padding: "2px 8px",
                                borderRadius: "6px",
                                backgroundColor: "#eff6ff",
                                color: "#1d4ed8",
                                border: "1px solid #bfdbfe",
                              }}
                            >
                              {v.serviceType || "Visit"}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
                              {v.visitDates.map((dt) => (
                                <span
                                  key={dt}
                                  style={{
                                    fontSize: "0.72rem",
                                    backgroundColor: "#f1f5f9",
                                    color: "#334155",
                                    padding: "0.15rem 0.45rem",
                                    borderRadius: "6px",
                                    fontWeight: 600,
                                  }}
                                >
                                  {formatDisplayDate(dt)}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td style={{ fontSize: "0.8rem", color: "#64748b", maxWidth: "200px" }}>
                            {v.notes || "—"}
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <span
                              style={{
                                fontSize: "0.7rem",
                                fontWeight: 700,
                                padding: "0.2rem 0.5rem",
                                borderRadius: "6px",
                                backgroundColor:
                                  v.status === "invoiced"
                                    ? "#ecfdf5"
                                    : v.status === "approved"
                                    ? "#eff6ff"
                                    : "#fffbeb",
                                color:
                                  v.status === "invoiced"
                                    ? "#065f46"
                                    : v.status === "approved"
                                    ? "#1d4ed8"
                                    : "#b45309",
                                border:
                                  v.status === "invoiced"
                                    ? "1px solid #a7f3d0"
                                    : v.status === "approved"
                                    ? "1px solid #bfdbfe"
                                    : "1px solid #fde68a",
                                textTransform: "uppercase",
                              }}
                            >
                              {v.status === "invoiced"
                                ? "Invoiced"
                                : v.status === "approved"
                                ? "Approved"
                                : "Pending"}
                            </span>
                          </td>
                          <td style={{ textAlign: "right" }}>
                            {v.status !== "invoiced" && !isAgentLockedForPeriod ? (
                              <button
                                type="button"
                                onClick={() => handleDeleteVisit(v._id)}
                                title="Delete visit record"
                                style={{
                                  padding: "0.35rem 0.6rem",
                                  borderRadius: "6px",
                                  color: "#dc2626",
                                  cursor: "pointer",
                                  border: "1px solid #fee2e2",
                                  backgroundColor: "#fef2f2",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  fontSize: "0.75rem",
                                  fontWeight: 600,
                                }}
                              >
                                <Trash2 size={13} />
                                <span>Delete</span>
                              </button>
                            ) : (
                              <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Locked</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* TAB 2: PAST BILLING CYCLES & HISTORICAL RECORDS */
          <div className="agent-view-scrollable">
            <div className="agent-card">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "1.25rem",
                  flexWrap: "wrap",
                  gap: "0.75rem",
                }}
              >
                <div>
                  <h2 style={{ fontSize: "1.2rem", fontWeight: 800, color: "#0f172a", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <History size={20} style={{ color: "#2563eb" }} />
                    Past Billing Cycles History
                  </h2>
                  <p style={{ fontSize: "0.82rem", color: "#64748b" }}>
                    Review completed cycles, past patient treatment sessions, and archived invoices
                  </p>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  <div style={{ position: "relative" }}>
                    <Search
                      size={14}
                      style={{
                        position: "absolute",
                        left: "0.65rem",
                        top: "50%",
                        transform: "translateY(-50%)",
                        color: "#94a3b8",
                      }}
                    />
                    <input
                      type="text"
                      placeholder="Search agency or cycle..."
                      value={pastSearchQuery}
                      onChange={(e) => setPastSearchQuery(e.target.value)}
                      style={{
                        padding: "0.4rem 0.75rem 0.4rem 2rem",
                        borderRadius: "8px",
                        border: "1px solid #cbd5e1",
                        fontSize: "0.82rem",
                        outline: "none",
                        width: "220px",
                      }}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      loadPeriods();
                      loadVisits();
                    }}
                    style={{
                      fontSize: "0.8rem",
                      color: "#2563eb",
                      fontWeight: 600,
                      padding: "0.4rem 0.8rem",
                      borderRadius: "8px",
                      backgroundColor: "#eff6ff",
                      border: "1px solid #bfdbfe",
                      cursor: "pointer",
                    }}
                  >
                    Refresh
                  </button>
                </div>
              </div>

              {loadingPeriods ? (
                <div style={{ textAlign: "center", padding: "3rem", color: "#64748b" }}>
                  Loading billing cycle history...
                </div>
              ) : filteredPastCycles.length === 0 ? (
                <div style={{ textAlign: "center", padding: "3.5rem 1.5rem" }}>
                  <History size={32} style={{ color: "#94a3b8", margin: "0 auto 0.75rem" }} />
                  <h3 style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: "0.35rem" }}>
                    No past billing cycles found
                  </h3>
                  <p style={{ fontSize: "0.85rem", color: "#64748b" }}>
                    Once managers complete and archive previous billing cycles, they will appear here with full records.
                  </p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {filteredPastCycles.map((p) => {
                    const num = p.lotNumber ? String(p.lotNumber).padStart(3, "0") : (p.lotCode ? p.lotCode.replace(/LOT\s*/i, "") : "");
                    const cycleVisits = visits.filter(
                      (v) => (v.lotId && v.lotId.toString() === p._id) || (p.lotCode && v.lotCode === p.lotCode)
                    );

                    return (
                      <div
                        key={p._id}
                        style={{
                          backgroundColor: "#ffffff",
                          border: "1px solid #e2e8f0",
                          borderRadius: "12px",
                          padding: "1.1rem",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            flexWrap: "wrap",
                            gap: "0.6rem",
                            marginBottom: "0.75rem",
                            borderBottom: "1px solid #f1f5f9",
                            paddingBottom: "0.75rem",
                          }}
                        >
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                              <span style={{ fontWeight: 800, fontSize: "1.05rem", color: "#0f172a" }}>
                                Billing Cycle #{num}
                              </span>
                              <span
                                style={{
                                  fontSize: "0.7rem",
                                  fontWeight: 700,
                                  padding: "2px 8px",
                                  borderRadius: "6px",
                                  backgroundColor: "#ecfdf5",
                                  color: "#065f46",
                                  border: "1px solid #a7f3d0",
                                }}
                              >
                                Completed
                              </span>
                            </div>
                            <div style={{ fontSize: "0.82rem", color: "#64748b", marginTop: "2px" }}>
                              <strong>Agency:</strong> {p.agencyName || "N/A"} • <strong>Dates:</strong> {formatDateRange(p.periodStart, p.periodEnd)}
                            </div>
                          </div>

                          <div style={{ textAlign: "right" }}>
                            <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#1e293b" }}>
                              {cycleVisits.length} {cycleVisits.length === 1 ? "patient session" : "patient sessions"}
                            </span>
                          </div>
                        </div>

                        {/* List of visits recorded in this cycle */}
                        {cycleVisits.length === 0 ? (
                          <div style={{ fontSize: "0.8rem", color: "#94a3b8", fontStyle: "italic", padding: "0.5rem 0" }}>
                            No visits recorded by you during this billing cycle.
                          </div>
                        ) : (
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "0.65rem" }}>
                            {cycleVisits.map((v) => (
                              <div
                                key={v._id}
                                style={{
                                  backgroundColor: "#f8fafc",
                                  border: "1px solid #e2e8f0",
                                  borderRadius: "8px",
                                  padding: "0.75rem",
                                }}
                              >
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.3rem" }}>
                                  <span style={{ fontWeight: 700, fontSize: "0.88rem", color: "#0f172a" }}>
                                    {v.patientName}
                                  </span>
                                  <span
                                    style={{
                                      fontSize: "0.68rem",
                                      fontWeight: 700,
                                      padding: "1px 6px",
                                      borderRadius: "4px",
                                      backgroundColor: "#eff6ff",
                                      color: "#1d4ed8",
                                    }}
                                  >
                                    {v.serviceType || "Visit"}
                                  </span>
                                </div>
                                <div style={{ fontSize: "0.72rem", color: "#64748b", display: "flex", flexWrap: "wrap", gap: "0.25rem" }}>
                                  {v.visitDates.map((dt) => (
                                    <span key={dt} style={{ backgroundColor: "#ffffff", padding: "1px 4px", borderRadius: "4px", border: "1px solid #e2e8f0" }}>
                                      {formatDisplayDate(dt)}
                                    </span>
                                  ))}
                                </div>
                                {v.notes && (
                                  <p style={{ fontSize: "0.72rem", color: "#64748b", marginTop: "0.35rem", fontStyle: "italic" }}>
                                    &quot;{v.notes}&quot;
                                  </p>
                                )}
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
          </div>
        )}
      </main>

      <style jsx global>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .agent-header {
          position: sticky;
          top: 0;
          z-index: 40;
          background-color: #ffffff;
          border-bottom: 1px solid #e2e8f0;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04);
          padding: 0.75rem 1.5rem;
          display: flex;
          align-items: center;
          justifyContent: space-between;
          width: 100%;
          flex-shrink: 0;
        }

        .agent-portal-main {
          flex: 1;
          width: 100%;
          max-width: 100%;
          margin: 0;
          padding: 1rem 1.5rem 2.5rem 1.5rem;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
        }

        .agent-tabs-container {
          display: grid;
          grid-template-columns: 1fr 1fr;
          background-color: #e2e8f0;
          padding: 3px;
          border-radius: 12px;
          margin-bottom: 1rem;
          max-width: 520px;
          width: 100%;
          flex-shrink: 0;
        }

        .agent-tab-btn {
          padding: 0.65rem;
          border-radius: 9px;
          font-size: 0.88rem;
          font-weight: 700;
          border: none;
          cursor: pointer;
          transition: all 0.15s ease;
          background-color: transparent;
          color: #64748b;
          display: flex;
          align-items: center;
          justifyContent: center;
          gap: 0.45rem;
        }

        .agent-tab-btn.active {
          background-color: #ffffff;
          color: #1e293b;
          box-shadow: 0 1px 3px rgba(0,0,0,0.08);
        }

        .agent-tab-badge {
          background-color: #2563eb;
          color: #ffffff;
          font-size: 0.72rem;
          padding: 1px 6px;
          border-radius: 9999px;
          font-weight: 800;
        }

        .agent-view-scrollable {
          flex: 1;
          display: flex;
          flex-direction: column;
          width: 100%;
        }

        .agent-cycle-banner {
          background-color: #eff6ff;
          border: 1px solid #bfdbfe;
          border-radius: 12px;
          padding: 0.85rem 1.25rem;
          margin-bottom: 1rem;
          display: flex;
          align-items: center;
          justifyContent: space-between;
          flex-wrap: wrap;
          gap: 0.75rem;
        }

        .agent-card {
          background-color: #ffffff;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 2px 10px rgba(0,0,0,0.04);
          padding: 1.25rem 1.5rem;
          box-sizing: border-box;
          width: 100%;
        }

        .agent-form-split {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.5rem;
        }

        .agent-col-fields {
          display: flex;
          flex-direction: column;
        }

        .agent-col-calendar {
          display: flex;
          flex-direction: column;
        }

        .agent-service-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.45rem;
        }

        .agent-calendar-box {
          background-color: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 0.85rem;
        }

        .agent-visits-table-container {
          overflow-x: auto;
          width: 100%;
        }

        .agent-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.85rem;
        }

        .agent-table th {
          text-align: left;
          padding: 0.65rem 0.75rem;
          font-size: 0.75rem;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
          border-bottom: 1px solid #e2e8f0;
          background-color: #f8fafc;
        }

        .agent-table td {
          padding: 0.75rem;
          border-bottom: 1px solid #f1f5f9;
          vertical-align: middle;
        }

        .agent-table tr:hover td {
          background-color: #f8fafc;
        }

        /* Desktop Optimization: Full Width Two-Column Split (>= 1024px) */
        @media (min-width: 1024px) {
          .agent-header {
            padding: 0.75rem 2rem;
          }

          .agent-portal-main {
            padding: 1.25rem 2rem 2.5rem 2rem;
          }

          .agent-form-split {
            grid-template-columns: 400px 1fr;
            gap: 2.5rem;
          }
        }

        @media (min-width: 1400px) {
          .agent-form-split {
            grid-template-columns: 460px 1fr;
            gap: 3rem;
          }
        }
      `}</style>
    </div>
  );
}
