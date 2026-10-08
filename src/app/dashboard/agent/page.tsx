"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar as CalendarIcon,
  User,
  Plus,
  Check,
  Clock,
  ChevronLeft,
  ChevronRight,
  LogOut,
  AlertCircle,
  Trash2,
  Sparkles,
  Stethoscope,
  FileCheck2,
  CalendarCheck,
  Layers,
  Send,
  Lock,
  Building2,
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

export default function AgentPortalPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<IUser | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // Billing Periods state
  const [openPeriods, setOpenPeriods] = useState<ILot[]>([]);
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

  // Visits list state
  const [visits, setVisits] = useState<IAgentVisit[]>([]);
  const [loadingVisits, setLoadingVisits] = useState(true);
  const [activeTab, setActiveTab] = useState<"form" | "history">("form");

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

  // Load Open Billing Periods
  const loadPeriods = async () => {
    setLoadingPeriods(true);
    try {
      const res = await fetch("/api/lots");
      const data = await res.json();
      if (res.ok && data.lots) {
        const openList: ILot[] = data.lots.filter((l: ILot) => l.status === "open");
        setOpenPeriods(openList);
        if (openList.length > 0 && !selectedPeriodId) {
          setSelectedPeriodId(openList[0]._id!);
        }
      }
    } catch (err) {
      console.error("Error loading periods:", err);
    } finally {
      setLoadingPeriods(false);
    }
  };

  useEffect(() => {
    loadPeriods();
  }, []);

  // Selected period object
  const activePeriod = useMemo(() => {
    return openPeriods.find((p) => p._id === selectedPeriodId) || null;
  }, [openPeriods, selectedPeriodId]);

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
    return myStatus?.status === "completed";
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

  // Load Past Visits
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

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.replace("/login");
    } catch {
      router.replace("/login");
    }
  };

  // Generate Calendar Days exclusively for the selected Billing Period
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
      setFormError("This period has been finalized by your manager and locked for editing.");
      return;
    }

    if (!selectedPeriodId) {
      setFormError("Please select a billing period first.");
      return;
    }

    if (!patientName.trim()) {
      setFormError("Please enter the patient's name.");
      return;
    }

    if (selectedDates.length === 0) {
      setFormError("Please select at least one treatment day from this period.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/agent/visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientName,
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
        throw new Error(err.error || "Failed to submit period");
      }

      alert("Awesome! Your visits for this period have been submitted to the manager for review.");
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
            <span style={{ maxWidth: "140px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
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

      {/* Main Container */}
      <main className="agent-portal-main">
        {/* Navigation Tabs (Segmented Control) */}
        <div className="agent-tabs-container">
          <button
            type="button"
            onClick={() => setActiveTab("form")}
            className={`agent-tab-btn ${activeTab === "form" ? "active" : ""}`}
          >
            <Plus size={16} />
            Log Visit
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`agent-tab-btn ${activeTab === "history" ? "active" : ""}`}
          >
            <CalendarCheck size={16} />
            My Records
            {visits.length > 0 && (
              <span className="agent-tab-badge">
                {visits.length}
              </span>
            )}
          </button>
        </div>

        {activeTab === "form" ? (
          /* FORM VIEW */
          <div className="agent-form-card">
            {/* Billing Period Selector Banner */}
            <div
              style={{
                backgroundColor: "#eff6ff",
                border: "1px solid #bfdbfe",
                borderRadius: "12px",
                padding: "0.85rem 1rem",
                marginBottom: "1rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "0.6rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Layers size={18} style={{ color: "#2563eb", flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#1e40af", textTransform: "uppercase" }}>
                    Active Billing Period
                  </div>
                  {openPeriods.length === 0 ? (
                    <span style={{ fontSize: "0.85rem", color: "#b45309", fontWeight: 600 }}>
                      No open billing periods available from manager yet
                    </span>
                  ) : (
                    <select
                      value={selectedPeriodId}
                      onChange={(e) => setSelectedPeriodId(e.target.value)}
                      style={{
                        backgroundColor: "#ffffff",
                        border: "1px solid #93c5fd",
                        borderRadius: "6px",
                        padding: "0.25rem 0.5rem",
                        fontSize: "0.85rem",
                        fontWeight: 700,
                        color: "#0f172a",
                        cursor: "pointer",
                        outline: "none",
                        marginTop: "2px",
                      }}
                    >
                      {openPeriods.map((p) => (
                        <option key={p._id} value={p._id}>
                          {p.lotCode} — {p.agencyName || "Agency"} ({formatDateShort(p.periodStart)} to {formatDateShort(p.periodEnd)})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Status & Submit Ready Button */}
              {activePeriod && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  {isAgentLockedForPeriod ? (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        padding: "0.25rem 0.6rem",
                        borderRadius: "6px",
                        backgroundColor: "#ecfdf5",
                        color: "#065f46",
                        border: "1px solid #a7f3d0",
                      }}
                    >
                      <Lock size={12} /> Finalized & Invoiced
                    </span>
                  ) : isAgentSubmittedForPeriod ? (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        padding: "0.25rem 0.6rem",
                        borderRadius: "6px",
                        backgroundColor: "#fffbeb",
                        color: "#b45309",
                        border: "1px solid #fde68a",
                      }}
                    >
                      <Clock size={12} /> Under Manager Review
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleNotifyManagerReady}
                      disabled={submittingPeriod}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        padding: "0.3rem 0.75rem",
                        borderRadius: "6px",
                        backgroundColor: "#2563eb",
                        color: "#ffffff",
                        border: "none",
                        cursor: "pointer",
                      }}
                      title="Notify manager that your visits for this period are complete"
                    >
                      <Send size={12} />
                      <span>{submittingPeriod ? "Submitting..." : "Submit for Review"}</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Locked Warning */}
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
                  <strong>Submissions finalized:</strong> The manager has completed this billing period and generated the invoice. You can view records in &quot;My Records&quot;. Contact your manager if you need to reopen.
                </span>
              </div>
            )}

            {/* Success message */}
            {formSuccess && (
              <div
                style={{
                  backgroundColor: "#ecfdf5",
                  border: "1px solid #a7f3d0",
                  color: "#065f46",
                  borderRadius: "10px",
                  padding: "0.85rem 1rem",
                  marginBottom: "1rem",
                  fontSize: "0.85rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.6rem",
                }}
              >
                <Check size={18} style={{ color: "#059669", flexShrink: 0 }} />
                <span>
                  <strong>Visit recorded successfully!</strong> The dates have been saved to period {activePeriod?.lotCode}.
                </span>
              </div>
            )}

            {/* Error message */}
            {formError && (
              <div
                style={{
                  backgroundColor: "#fef2f2",
                  border: "1px solid #fecaca",
                  color: "#991b1b",
                  borderRadius: "10px",
                  padding: "0.85rem 1rem",
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

            {/* Form Inner */}
            <form onSubmit={handleSubmitVisit} className="agent-form-inner">
              <div className="agent-form-split">
                {/* Column 1: Patient info, service type, notes, submit button */}
                <div className="agent-col-fields">
                  {/* Patient Name Input */}
                  <div style={{ marginBottom: "1.1rem" }}>
                    <label
                      htmlFor="patient-name-input"
                      style={{
                        display: "block",
                        fontSize: "0.85rem",
                        fontWeight: 700,
                        color: "#1e293b",
                        marginBottom: "0.4rem",
                      }}
                    >
                      Patient Name <span style={{ color: "#dc2626" }}>*</span>
                    </label>
                    <div style={{ position: "relative" }}>
                      <input
                        id="patient-name-input"
                        type="text"
                        required
                        disabled={isAgentLockedForPeriod}
                        placeholder="e.g. John Doe or Smith, John"
                        value={patientName}
                        onChange={(e) => setPatientName(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "0.75rem 1rem 0.75rem 2.4rem",
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
                  </div>

                  {/* Fast Service Type Buttons */}
                  <div style={{ marginBottom: "1.1rem" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.4rem" }}>
                      <label style={{ fontSize: "0.85rem", fontWeight: 700, color: "#1e293b" }}>
                        Service Type
                      </label>
                      <span
                        style={{
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: "6px",
                          backgroundColor: isPTA ? "#fef3c7" : "#eff6ff",
                          color: isPTA ? "#b45309" : "#1d4ed8",
                          border: isPTA ? "1px solid #fde68a" : "1px solid #bfdbfe",
                        }}
                      >
                        Role: {agentRole}
                      </span>
                    </div>

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
                              padding: "0.6rem 0.4rem",
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
                            <span style={{ fontSize: "0.65rem", opacity: 0.8 }}>{opt.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Notes */}
                  <div style={{ marginBottom: "1.1rem" }}>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#1e293b", marginBottom: "0.4rem" }}>
                      Additional Notes (Optional)
                    </label>
                    <textarea
                      rows={2}
                      disabled={isAgentLockedForPeriod}
                      placeholder="e.g. Evaluated shoulder mobility, home program updated..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "0.65rem 0.85rem",
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

                  {/* Submit CTA */}
                  <button
                    type="submit"
                    disabled={submitting || selectedDates.length === 0 || isAgentLockedForPeriod || !selectedPeriodId}
                    style={{
                      width: "100%",
                      padding: "0.85rem",
                      borderRadius: "12px",
                      border: "none",
                      backgroundColor:
                        selectedDates.length === 0 || isAgentLockedForPeriod ? "#94a3b8" : "#2563eb",
                      color: "#ffffff",
                      fontSize: "0.95rem",
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

                {/* Column 2: Period Days Calendar */}
                <div className="agent-col-calendar">
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: "0.4rem",
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
                      Treatment Dates for {activePeriod?.lotCode || "Period"} <span style={{ color: "#dc2626" }}>*</span>
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
                    Select the days this patient was treated during this billing window ({formatDateShort(activePeriod?.periodStart)} to {formatDateShort(activePeriod?.periodEnd)}):
                  </p>

                  {/* Period Days Grid */}
                  <div className="agent-calendar-box">
                    {periodDays.length === 0 ? (
                      <div style={{ padding: "2rem", textAlign: "center", color: "#64748b", fontSize: "0.85rem" }}>
                        Please select an active billing period to view valid days.
                      </div>
                    ) : (
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fill, minmax(70px, 1fr))",
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

                  {/* Selected badges summary */}
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
        ) : (
          /* HISTORY VIEW */
          <div className="agent-history-card">
            <div style={{ marginBottom: "1rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <h2 style={{ fontSize: "1.2rem", fontWeight: 800, color: "#0f172a" }}>
                  My Saved Visits
                </h2>
                <p style={{ fontSize: "0.82rem", color: "#64748b" }}>
                  Record history submitted for weekly billing
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
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem",
                }}
              >
                Refresh
              </button>
            </div>

            {loadingVisits ? (
              <div style={{ textAlign: "center", padding: "2.5rem", color: "#64748b" }}>
                Loading visit history...
              </div>
            ) : visits.length === 0 ? (
              <div style={{ textAlign: "center", padding: "3rem 1.5rem" }}>
                <CalendarCheck size={28} style={{ color: "#2563eb", margin: "0 auto 0.75rem" }} />
                <h3 style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: "0.35rem" }}>
                  No visit records found yet
                </h3>
                <p style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: "1.25rem" }}>
                  Use the &quot;Log Visit&quot; tab to submit your first patient treatment session.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab("form")}
                  style={{
                    backgroundColor: "#2563eb",
                    color: "#ffffff",
                    fontWeight: 700,
                    fontSize: "0.88rem",
                    padding: "0.65rem 1.4rem",
                    borderRadius: "10px",
                    cursor: "pointer",
                    border: "none",
                  }}
                >
                  Log My First Visit
                </button>
              </div>
            ) : (
              <div className="agent-history-grid">
                {visits.map((v) => (
                  <div
                    key={v._id}
                    className="agent-history-item"
                    style={{
                      backgroundColor: "#ffffff",
                      borderRadius: "12px",
                      border: "1px solid #e2e8f0",
                      padding: "1rem",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: "0.98rem", color: "#0f172a" }}>
                            {v.patientName}
                          </div>
                          <div style={{ fontSize: "0.78rem", color: "#64748b", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                            <span style={{ fontWeight: 600, color: "#2563eb" }}>{v.serviceType || "Visit"}</span>
                            <span>•</span>
                            <span>{v.visitDates.length} {v.visitDates.length === 1 ? "visit" : "visits"}</span>
                            {v.lotCode && (
                              <>
                                <span>•</span>
                                <span style={{ fontWeight: 700, color: "#0f172a" }}>{v.lotCode}</span>
                              </>
                            )}
                          </div>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
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

                          {v.status !== "invoiced" && !isAgentLockedForPeriod && (
                            <button
                              type="button"
                              onClick={() => handleDeleteVisit(v._id)}
                              title="Delete record"
                              style={{
                                padding: "0.35rem",
                                borderRadius: "6px",
                                color: "#dc2626",
                                cursor: "pointer",
                                border: "none",
                                background: "none",
                              }}
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Dates list */}
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginTop: "0.5rem" }}>
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
                            📅 {formatDisplayDate(dt)}
                          </span>
                        ))}
                      </div>
                    </div>

                    {v.notes && (
                      <p style={{ fontSize: "0.78rem", color: "#64748b", marginTop: "0.6rem", fontStyle: "italic", borderTop: "1px dashed #f1f5f9", paddingTop: "0.4rem" }}>
                        &quot;{v.notes}&quot;
                      </p>
                    )}
                  </div>
                ))}
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

        .agent-header {
          position: sticky;
          top: 0;
          z-index: 40;
          background-color: #ffffff;
          border-bottom: 1px solid #e2e8f0;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04);
          padding: 0.75rem 1rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          flex-shrink: 0;
        }

        .agent-portal-main {
          flex: 1;
          width: 100%;
          max-width: 580px;
          margin: 0 auto;
          padding: 0.85rem 1rem 2.5rem 1rem;
          box-sizing: border-box;
        }

        .agent-tabs-container {
          display: grid;
          grid-template-columns: 1fr 1fr;
          background-color: #e2e8f0;
          padding: 3px;
          border-radius: 12px;
          margin-bottom: 1rem;
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
          justify-content: center;
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
          fontSize: 0.72rem;
          padding: 1px 6px;
          borderRadius: 9999px;
          fontWeight: 800;
        }

        .agent-form-card,
        .agent-history-card {
          background-color: #ffffff;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 2px 10px rgba(0,0,0,0.04);
          padding: 1.15rem;
          box-sizing: border-box;
        }

        .agent-form-inner {
          display: flex;
          flex-direction: column;
        }

        .agent-form-split {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
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

        .agent-history-grid {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        /* Desktop Optimization: Full Width & Zero Window Scroll (>= 1024px) */
        @media (min-width: 1024px) {
          html, body {
            overflow: hidden !important;
            height: 100vh !important;
          }

          .agent-header {
            padding: 0.75rem 2rem;
            height: 60px;
            box-sizing: border-box;
          }

          .agent-portal-main {
            max-width: 100% !important;
            width: 100% !important;
            height: calc(100vh - 60px);
            padding: 1rem 2rem;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            box-sizing: border-box;
          }

          .agent-tabs-container {
            max-width: 440px;
            margin: 0 auto 0.75rem auto;
            flex-shrink: 0;
          }

          .agent-form-card {
            flex: 1;
            height: 100%;
            display: flex;
            flex-direction: column;
            padding: 1.25rem 2rem;
            overflow: hidden;
            box-shadow: 0 4px 20px rgba(0,0,0,0.05);
          }

          .agent-form-inner {
            flex: 1;
            height: 100%;
            overflow: hidden;
          }

          .agent-form-split {
            display: grid;
            grid-template-columns: 380px 1fr;
            gap: 2.25rem;
            height: 100%;
            align-items: stretch;
          }

          .agent-col-fields {
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            height: 100%;
          }

          .agent-service-grid {
            grid-template-columns: repeat(3, 1fr);
            gap: 0.45rem;
          }

          .agent-col-calendar {
            display: flex;
            flex-direction: column;
            height: 100%;
            overflow: hidden;
          }

          .agent-calendar-box {
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow-y: auto;
            padding: 1rem;
            border-radius: 14px;
          }

          .agent-history-card {
            flex: 1;
            height: 100%;
            display: flex;
            flex-direction: column;
            padding: 1.5rem 2rem;
            overflow: hidden;
          }

          .agent-history-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
            gap: 1rem;
            overflow-y: auto;
            flex: 1;
            padding-right: 0.5rem;
          }
        }

        @media (min-width: 1400px) {
          .agent-form-split {
            grid-template-columns: 440px 1fr;
            gap: 3rem;
          }

          .agent-history-grid {
            grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          }
        }
      `}</style>
    </div>
  );
}
