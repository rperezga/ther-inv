"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Layers,
  Plus,
  Calendar,
  Building2,
  Users,
  CheckCircle2,
  Clock,
  Lock,
  Unlock,
  AlertCircle,
  ChevronRight,
  FileText,
  Search,
  Filter,
  ArrowRight,
  RefreshCw,
  X,
  Send,
  Eye,
  Check,
} from "lucide-react";
import { ILot, IWorker, IUser } from "@/lib/types";

const AGENCIES = [
  "A&A HEALTH SERVICE",
  "ALC",
  "INNOVATION",
  "MEDCARE",
  "OASIS",
  "USAD",
];

function formatDate(d: string | Date | undefined): string {
  if (!d) return "-";
  const date = new Date(d);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function PeriodsPage() {
  const router = useRouter();
  const [periods, setPeriods] = useState<ILot[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "closed">("all");
  const [agencyFilter, setAgencyFilter] = useState("all");

  // Create Period Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedAgency, setSelectedAgency] = useState(AGENCIES[0]);
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [periodNotes, setPeriodNotes] = useState("");
  const [creating, setCreating] = useState(false);
  const [modalError, setModalError] = useState("");
  const [successToast, setSuccessToast] = useState("");

  const fetchPeriods = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/lots");
      const data = await res.json();
      if (res.ok && data.lots) {
        setPeriods(data.lots);
      }
    } catch (err) {
      console.error("Error fetching periods:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPeriods();
  }, []);

  // Quick preset: Current week Monday to Sunday
  const handleSetCurrentWeek = () => {
    const today = new Date();
    const day = today.getDay(); // 0 is Sun
    const diffToMon = day === 0 ? -6 : 1 - day;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diffToMon);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const pad = (n: number) => String(n).padStart(2, "0");
    const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    setPeriodStart(fmt(monday));
    setPeriodEnd(fmt(sunday));
  };

  // Quick preset: Previous week Monday to Sunday
  const handleSetPreviousWeek = () => {
    const today = new Date();
    const day = today.getDay();
    const diffToMon = day === 0 ? -6 : 1 - day;
    const prevMon = new Date(today);
    prevMon.setDate(today.getDate() + diffToMon - 7);
    const prevSun = new Date(prevMon);
    prevSun.setDate(prevMon.getDate() + 6);

    const pad = (n: number) => String(n).padStart(2, "0");
    const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    setPeriodStart(fmt(prevMon));
    setPeriodEnd(fmt(prevSun));
  };

  const handleCreatePeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError("");

    if (!periodStart || !periodEnd) {
      setModalError("Please select start and end dates.");
      return;
    }

    if (new Date(periodStart) > new Date(periodEnd)) {
      setModalError("Start date cannot be after end date.");
      return;
    }

    setCreating(true);

    try {
      const res = await fetch("/api/lots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agencyName: selectedAgency,
          periodStart,
          periodEnd,
          notes: periodNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create billing period");
      }

      setShowCreateModal(false);
      setPeriodNotes("");
      setSuccessToast(`Billing period ${data.lot?.lotCode} created successfully! Agents can now log their visits.`);
      setTimeout(() => setSuccessToast(""), 6000);
      fetchPeriods();
    } catch (err: any) {
      setModalError(err.message || "Failed to create period");
    } finally {
      setCreating(false);
    }
  };

  // Toggle period open/closed
  const handleToggleStatus = async (periodId: string, currentStatus: "open" | "closed") => {
    const nextStatus = currentStatus === "open" ? "closed" : "open";
    const confirmMsg =
      currentStatus === "open"
        ? "Are you sure you want to CLOSE this billing period? Closed periods lock all agent submissions."
        : "Re-open this billing period? Agents will be able to submit visits again.";

    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/lots/${periodId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggle_status",
          status: nextStatus,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Failed to update period status");
        return;
      }

      fetchPeriods();
    } catch {
      alert("Network error updating period");
    }
  };

  // Filter periods
  const filteredPeriods = useMemo(() => {
    return periods.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (agencyFilter !== "all" && p.agencyName !== agencyFilter) return false;
      if (search) {
        const term = search.toLowerCase();
        const codeMatch = p.lotCode?.toLowerCase().includes(term);
        const nameMatch = p.name?.toLowerCase().includes(term);
        const agencyMatch = p.agencyName?.toLowerCase().includes(term);
        return codeMatch || nameMatch || agencyMatch;
      }
      return true;
    });
  }, [periods, statusFilter, agencyFilter, search]);

  return (
    <div style={{ width: "100%", maxWidth: "100%", margin: "0" }}>
      {/* Toast Notification */}
      {successToast && (
        <div
          style={{
            backgroundColor: "#ecfdf5",
            border: "1px solid #a7f3d0",
            color: "#065f46",
            padding: "0.85rem 1.25rem",
            borderRadius: "10px",
            marginBottom: "1.25rem",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            fontSize: "0.9rem",
            fontWeight: 600,
            boxShadow: "0 2px 5px rgba(0,0,0,0.05)",
          }}
        >
          <CheckCircle2 size={20} style={{ color: "#059669", flexShrink: 0 }} />
          <span>{successToast}</span>
        </div>
      )}

      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                backgroundColor: "#eff6ff",
                color: "#2563eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Layers size={20} />
            </div>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
              Billing Periods
            </h1>
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.92rem", marginTop: "0.35rem" }}>
            Manage agency cycles, monitor real-time agent visit logs, review submissions, and generate final invoices.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setShowCreateModal(true);
            setModalError("");
            if (!periodStart || !periodEnd) {
              handleSetCurrentWeek();
            }
          }}
          className="btn btn-primary"
          style={{ display: "flex", alignItems: "center", gap: "0.45rem", padding: "0.65rem 1.15rem" }}
        >
          <Plus size={18} />
          <span>New Billing Period</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "12px",
          border: "1px solid var(--border-color)",
          padding: "1rem 1.25rem",
          marginBottom: "1.5rem",
          display: "flex",
          flexWrap: "wrap",
          gap: "1rem",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center", flex: 1 }}>
          {/* Search */}
          <div style={{ position: "relative", minWidth: "240px", flex: "1 1 240px" }}>
            <Search
              size={16}
              style={{
                position: "absolute",
                left: "0.85rem",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-muted)",
              }}
            />
            <input
              type="text"
              placeholder="Search by period code, agency..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input"
              style={{ paddingLeft: "2.35rem", fontSize: "0.875rem" }}
            />
          </div>

          {/* Agency Filter */}
          <div style={{ minWidth: "180px" }}>
            <select
              value={agencyFilter}
              onChange={(e) => setAgencyFilter(e.target.value)}
              className="form-select"
              style={{ fontSize: "0.875rem" }}
            >
              <option value="all">All Agencies</option>
              {AGENCIES.map((ag) => (
                <option key={ag} value={ag}>
                  {ag}
                </option>
              ))}
            </select>
          </div>

          {/* Status Segmented Buttons */}
          <div
            style={{
              display: "inline-flex",
              backgroundColor: "var(--bg-subtle)",
              padding: "3px",
              borderRadius: "8px",
              border: "1px solid var(--border-color)",
            }}
          >
            {(["all", "open", "closed"] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                style={{
                  padding: "0.3rem 0.75rem",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  borderRadius: "6px",
                  border: "none",
                  backgroundColor: statusFilter === st ? "#ffffff" : "transparent",
                  color: statusFilter === st ? "var(--primary)" : "var(--text-muted)",
                  boxShadow: statusFilter === st ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                  cursor: "pointer",
                  textTransform: "capitalize",
                }}
              >
                {st === "all" ? "All Periods" : st}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={fetchPeriods}
          className="btn btn-secondary btn-sm"
          title="Refresh period list"
          style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}
        >
          <RefreshCw size={14} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Period Cards Grid */}
      {loading ? (
        <div style={{ padding: "4rem 2rem", textAlign: "center", color: "var(--text-muted)" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              border: "3px solid #e2e8f0",
              borderTopColor: "var(--primary)",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              margin: "0 auto 1rem",
            }}
          />
          <p>Loading billing periods...</p>
        </div>
      ) : filteredPeriods.length === 0 ? (
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "14px",
            border: "1px dashed var(--border-color)",
            padding: "3.5rem 2rem",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              backgroundColor: "#eff6ff",
              color: "#2563eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1rem",
            }}
          >
            <Layers size={28} />
          </div>
          <h3 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "0.35rem" }}>
            No billing periods found
          </h3>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", maxWidth: "420px", margin: "0 auto 1.5rem" }}>
            Create a billing period to define the agency and date range. Agents will immediately see the period and submit their visits.
          </p>
          <button
            type="button"
            onClick={() => {
              setShowCreateModal(true);
              handleSetCurrentWeek();
            }}
            className="btn btn-primary"
          >
            <Plus size={16} /> Create First Period
          </button>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
            gap: "1.25rem",
          }}
        >
          {filteredPeriods.map((lot) => {
            const isOpen = lot.status === "open";
            const agentList = lot.agentStatuses || [];
            const submittedCount = agentList.filter((a) => a.status === "submitted").length;
            const completedCount = agentList.filter((a) => a.status === "completed").length;
            const inProgressCount = agentList.filter((a) => a.status === "in_progress").length;

            return (
              <div
                key={lot._id}
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: "14px",
                  border: isOpen ? "1px solid #bfdbfe" : "1px solid #e2e8f0",
                  boxShadow: isOpen ? "0 4px 12px rgba(37,99,235,0.06)" : "0 2px 6px rgba(0,0,0,0.03)",
                  padding: "1.25rem",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  transition: "transform 0.15s ease, box-shadow 0.15s ease",
                }}
              >
                <div>
                  {/* Top Row: Code & Status */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: "0.75rem",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span
                        style={{
                          fontSize: "0.95rem",
                          fontWeight: 800,
                          color: "#1e293b",
                          letterSpacing: "0.02em",
                        }}
                      >
                        {lot.lotCode}
                      </span>
                      {isOpen ? (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            padding: "0.15rem 0.5rem",
                            borderRadius: "6px",
                            backgroundColor: "#ecfdf5",
                            color: "#065f46",
                            border: "1px solid #a7f3d0",
                          }}
                        >
                          <Unlock size={11} style={{ color: "#059669" }} />
                          Open for Logging
                        </span>
                      ) : (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            padding: "0.15rem 0.5rem",
                            borderRadius: "6px",
                            backgroundColor: "#f1f5f9",
                            color: "#475569",
                            border: "1px solid #cbd5e1",
                          }}
                        >
                          <Lock size={11} />
                          Closed & Finalized
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleStatus(lot._id!, lot.status)}
                      className="btn btn-sm"
                      style={{
                        fontSize: "0.72rem",
                        padding: "0.2rem 0.55rem",
                        backgroundColor: isOpen ? "#fef2f2" : "#eff6ff",
                        color: isOpen ? "#dc2626" : "#2563eb",
                        border: isOpen ? "1px solid #fee2e2" : "1px solid #bfdbfe",
                      }}
                      title={isOpen ? "Close and lock this period" : "Reopen period for edits"}
                    >
                      {isOpen ? "Close Period" : "Re-open"}
                    </button>
                  </div>

                  {/* Agency Badge */}
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.6rem" }}>
                    <Building2 size={15} style={{ color: "var(--primary)" }} />
                    <span style={{ fontWeight: 700, fontSize: "1rem", color: "#0f172a" }}>
                      {lot.agencyName || "General Agency"}
                    </span>
                  </div>

                  {/* Date Range */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.45rem",
                      fontSize: "0.85rem",
                      color: "var(--text-secondary)",
                      marginBottom: "1rem",
                      backgroundColor: "var(--bg-subtle)",
                      padding: "0.45rem 0.75rem",
                      borderRadius: "8px",
                    }}
                  >
                    <Calendar size={14} style={{ color: "var(--text-muted)" }} />
                    <span>
                      {formatDate(lot.periodStart)} — {formatDate(lot.periodEnd)}
                    </span>
                  </div>

                  {/* Agent Status Progress Summary */}
                  <div style={{ marginBottom: "1rem" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        fontSize: "0.78rem",
                        color: "var(--text-muted)",
                        marginBottom: "0.35rem",
                        fontWeight: 600,
                      }}
                    >
                      <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <Users size={13} />
                        Agent Progress:
                      </span>
                      <span>{agentList.length} registered</span>
                    </div>

                    <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                      {submittedCount > 0 && (
                        <span
                          style={{
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            padding: "2px 7px",
                            borderRadius: "6px",
                            backgroundColor: "#fffbeb",
                            color: "#b45309",
                            border: "1px solid #fde68a",
                          }}
                        >
                          ⏳ {submittedCount} Ready for Review
                        </span>
                      )}
                      {completedCount > 0 && (
                        <span
                          style={{
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            padding: "2px 7px",
                            borderRadius: "6px",
                            backgroundColor: "#ecfdf5",
                            color: "#065f46",
                            border: "1px solid #a7f3d0",
                          }}
                        >
                          ✓ {completedCount} Invoiced
                        </span>
                      )}
                      {inProgressCount > 0 && (
                        <span
                          style={{
                            fontSize: "0.72rem",
                            fontWeight: 600,
                            padding: "2px 7px",
                            borderRadius: "6px",
                            backgroundColor: "#f8fafc",
                            color: "#475569",
                            border: "1px solid #e2e8f0",
                          }}
                        >
                          📝 {inProgressCount} Logging
                        </span>
                      )}
                      {agentList.length === 0 && (
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                          No agent submissions yet
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Footer: Invoices & Detail Link */}
                <div
                  style={{
                    borderTop: "1px solid #f1f5f9",
                    paddingTop: "0.85rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                    <strong>{lot.invoicesCount || 0}</strong> invoices generated
                  </div>

                  <Link
                    href={`/dashboard/periods/${lot._id}`}
                    className="btn btn-primary btn-sm"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.35rem",
                      fontSize: "0.8rem",
                      padding: "0.35rem 0.85rem",
                    }}
                  >
                    <span>Manage & Review</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Create Billing Period */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "480px" }}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontSize: "1.25rem", fontWeight: 800 }}>
                  Create Billing Period
                </h3>
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "2px" }}>
                  Define target agency and week dates for agent visit tracking
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{ color: "var(--text-muted)" }}
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreatePeriod}>
              <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
                {modalError && (
                  <div
                    style={{
                      backgroundColor: "var(--danger-subtle)",
                      color: "var(--danger)",
                      border: "1px solid var(--danger-border)",
                      borderRadius: "var(--radius-md)",
                      padding: "0.65rem 1rem",
                      fontSize: "0.85rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <AlertCircle size={16} />
                    <span>{modalError}</span>
                  </div>
                )}

                {/* Agency Selection */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Client Agency *</label>
                  <select
                    className="form-select"
                    value={selectedAgency}
                    onChange={(e) => setSelectedAgency(e.target.value)}
                    required
                  >
                    {AGENCIES.map((ag) => (
                      <option key={ag} value={ag}>
                        {ag}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quick Presets for Week Dates */}
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.4rem" }}>
                    <label className="form-label" style={{ marginBottom: 0 }}>Week Period Range *</label>
                    <div style={{ display: "flex", gap: "0.4rem" }}>
                      <button
                        type="button"
                        onClick={handleSetCurrentWeek}
                        style={{
                          fontSize: "0.72rem",
                          color: "#2563eb",
                          backgroundColor: "#eff6ff",
                          border: "1px solid #bfdbfe",
                          borderRadius: "4px",
                          padding: "2px 6px",
                          cursor: "pointer",
                          fontWeight: 600,
                        }}
                      >
                        Current Week
                      </button>
                      <button
                        type="button"
                        onClick={handleSetPreviousWeek}
                        style={{
                          fontSize: "0.72rem",
                          color: "#475569",
                          backgroundColor: "#f1f5f9",
                          border: "1px solid #cbd5e1",
                          borderRadius: "4px",
                          padding: "2px 6px",
                          cursor: "pointer",
                          fontWeight: 600,
                        }}
                      >
                        Previous Week
                      </button>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                    <div>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                        Start Date
                      </span>
                      <input
                        type="date"
                        required
                        className="form-input"
                        value={periodStart}
                        onChange={(e) => setPeriodStart(e.target.value)}
                      />
                    </div>
                    <div>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                        End Date
                      </span>
                      <input
                        type="date"
                        required
                        className="form-input"
                        value={periodEnd}
                        onChange={(e) => setPeriodEnd(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Internal Notes (Optional)</label>
                  <textarea
                    rows={2}
                    className="form-textarea"
                    placeholder="Instructions or cycle notes for managers..."
                    value={periodNotes}
                    onChange={(e) => setPeriodNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer" style={{ marginTop: "1.25rem" }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="btn btn-primary"
                >
                  {creating ? "Creating Period..." : "Create & Open Period"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
