"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Layers,
  ArrowLeft,
  Calendar,
  Building2,
  Users,
  CheckCircle2,
  Clock,
  Lock,
  Unlock,
  AlertCircle,
  FileText,
  Plus,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Send,
  Eye,
  Check,
  RotateCcw,
} from "lucide-react";
import { ILot, IAgentVisit, IInvoice } from "@/lib/types";

function formatDate(d: string | Date | undefined): string {
  if (!d) return "-";
  const date = new Date(d);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDayLabel(dateKey: string): string {
  if (!dateKey) return "";
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

interface AgentGroup {
  agentId: string;
  agentName: string;
  agentEmail: string;
  visits: IAgentVisit[];
  status: "in_progress" | "submitted" | "completed";
  invoiceId?: string;
  invoiceNumber?: string;
  totalVisitsCount: number;
}

export default function PeriodDetailPage() {
  const params = useParams();
  const router = useRouter();
  const periodId = params?.id as string;

  const [lot, setLot] = useState<ILot | null>(null);
  const [invoices, setInvoices] = useState<IInvoice[]>([]);
  const [visits, setVisits] = useState<IAgentVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchDetails = async () => {
    if (!periodId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/lots/${periodId}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to load period details");
      }
      setLot(data.lot);
      setInvoices(data.invoices || []);
      setVisits(data.visits || []);
    } catch (err: any) {
      setError(err.message || "Failed to load period");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [periodId]);

  // Group visits by agent
  const agentGroups: AgentGroup[] = useMemo(() => {
    if (!lot) return [];

    const map = new Map<string, AgentGroup>();

    // Seed with agentStatuses already known in the lot
    if (Array.isArray(lot.agentStatuses)) {
      lot.agentStatuses.forEach((as: any) => {
        const id = as.agentId?._id ? as.agentId._id.toString() : as.agentId.toString();
        map.set(id, {
          agentId: id,
          agentName: as.agentName,
          agentEmail: as.agentEmail,
          visits: [],
          status: as.status || "in_progress",
          invoiceId: as.invoiceId?.toString(),
          invoiceNumber: as.invoiceNumber,
          totalVisitsCount: 0,
        });
      });
    }

    // Populate with actual visits
    visits.forEach((v) => {
      const id = v.agentId ? v.agentId.toString() : "unknown";
      let group = map.get(id);
      if (!group) {
        group = {
          agentId: id,
          agentName: v.agentName,
          agentEmail: v.agentEmail,
          visits: [],
          status: "in_progress",
          totalVisitsCount: 0,
        };
        map.set(id, group);
      }
      group.visits.push(v);
      group.totalVisitsCount += v.visitDates?.length || 0;
    });

    return Array.from(map.values());
  }, [lot, visits]);

  // Manager action: Complete agent and generate invoice
  const handleMarkAgentCompleted = async (group: AgentGroup) => {
    if (!lot) return;

    // Check if visits exist
    if (group.visits.length === 0) {
      alert(`Agent ${group.agentName} has not submitted any visits for this period yet.`);
      return;
    }

    const confirmAction = confirm(
      `Mark ${group.agentName} as COMPLETED for ${lot.lotCode}?\n\nThis will lock the agent from further edits and take you to the invoice review generator.`
    );
    if (!confirmAction) return;

    setActionLoading(group.agentId);

    try {
      // Step 1: Update agent status to completed in lot
      const res = await fetch(`/api/lots/${lot._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "set_agent_status",
          agentId: group.agentId,
          agentName: group.agentName,
          agentEmail: group.agentEmail,
          status: "completed",
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update agent status");
      }

      setActionSuccess(`Agent ${group.agentName} marked as completed! Redirecting to create invoice...`);
      setTimeout(() => {
        // Redirect to invoice creator pre-filled with this lot and worker
        router.push(
          `/dashboard/invoices/new?lotId=${lot._id}&workerEmail=${encodeURIComponent(group.agentEmail)}&agency=${encodeURIComponent(lot.agencyName || "")}`
        );
      }, 1200);
    } catch (err: any) {
      alert(err.message || "Failed to mark agent completed");
      setActionLoading(null);
    }
  };

  // Manager action: Reopen agent submissions
  const handleReopenAgent = async (group: AgentGroup) => {
    if (!lot) return;

    const confirmAction = confirm(
      `Re-open ${lot.lotCode} for ${group.agentName}?\n\nThe agent will be unlocked and able to modify or add patient visits.`
    );
    if (!confirmAction) return;

    setActionLoading(group.agentId);

    try {
      const res = await fetch(`/api/lots/${lot._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reopen",
          agentId: group.agentId,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to reopen agent");
      }

      setActionSuccess(`Period re-opened for ${group.agentName}. The agent can now edit their records.`);
      setTimeout(() => setActionSuccess(""), 5000);
      fetchDetails();
    } catch (err: any) {
      alert(err.message || "Failed to reopen agent");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
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
        <p>Loading billing period details...</p>
      </div>
    );
  }

  if (error || !lot) {
    return (
      <div style={{ maxWidth: "600px", margin: "2rem auto", padding: "1.5rem", textAlign: "center" }}>
        <AlertCircle size={36} color="var(--danger)" style={{ margin: "0 auto 0.75rem" }} />
        <h2 style={{ fontSize: "1.3rem", fontWeight: 700, marginBottom: "0.5rem" }}>Period Not Found</h2>
        <p style={{ color: "var(--text-muted)", marginBottom: "1.5rem" }}>{error || "Could not load the requested period."}</p>
        <Link href="/dashboard/periods" className="btn btn-secondary">
          <ArrowLeft size={16} /> Back to Billing Periods
        </Link>
      </div>
    );
  }

  const isOpen = lot.status === "open";

  return (
    <div style={{ width: "100%", maxWidth: "1280px", margin: "0 auto" }}>
      {/* Back Link */}
      <div style={{ marginBottom: "1rem" }}>
        <Link
          href="/dashboard/periods"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
            fontSize: "0.85rem",
            color: "var(--text-muted)",
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          <ArrowLeft size={15} />
          <span>Back to All Billing Periods</span>
        </Link>
      </div>

      {/* Action Toast */}
      {actionSuccess && (
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
          }}
        >
          <CheckCircle2 size={20} style={{ color: "#059669", flexShrink: 0 }} />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Main Period Banner */}
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "14px",
          border: isOpen ? "1px solid #bfdbfe" : "1px solid #e2e8f0",
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          padding: "1.5rem 1.75rem",
          marginBottom: "1.5rem",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.35rem" }}>
              <span
                style={{
                  fontSize: "1.35rem",
                  fontWeight: 900,
                  color: "#0f172a",
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
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    padding: "0.2rem 0.6rem",
                    borderRadius: "6px",
                    backgroundColor: "#ecfdf5",
                    color: "#065f46",
                    border: "1px solid #a7f3d0",
                  }}
                >
                  <Unlock size={12} style={{ color: "#059669" }} />
                  OPEN FOR AGENTS
                </span>
              ) : (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    padding: "0.2rem 0.6rem",
                    borderRadius: "6px",
                    backgroundColor: "#f1f5f9",
                    color: "#475569",
                    border: "1px solid #cbd5e1",
                  }}
                >
                  <Lock size={12} />
                  CLOSED & LOCKED
                </span>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.95rem", fontWeight: 700, color: "#1e293b" }}>
                <Building2 size={16} style={{ color: "var(--primary)" }} />
                <span>Agency: {lot.agencyName || "General Agency"}</span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.88rem", color: "var(--text-secondary)" }}>
                <Calendar size={15} style={{ color: "var(--text-muted)" }} />
                <span>
                  {formatDate(lot.periodStart)} — {formatDate(lot.periodEnd)}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              type="button"
              onClick={fetchDetails}
              className="btn btn-secondary btn-sm"
              style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}
            >
              <RefreshCw size={14} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {lot.notes && (
          <p style={{ marginTop: "0.85rem", fontSize: "0.85rem", color: "var(--text-muted)", fontStyle: "italic", borderTop: "1px dashed #f1f5f9", paddingTop: "0.65rem" }}>
            Cycle Notes: {lot.notes}
          </p>
        )}
      </div>

      {/* Generated Invoices for this Period */}
      {invoices.length > 0 && (
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "14px",
            border: "1px solid var(--border-color)",
            padding: "1.25rem 1.5rem",
            marginBottom: "1.75rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.85rem" }}>
            <h3 style={{ fontSize: "1.05rem", fontWeight: 800, color: "#0f172a", display: "flex", alignItems: "center", gap: "0.45rem" }}>
              <FileText size={17} style={{ color: "var(--primary)" }} />
              Generated Invoices ({invoices.length})
            </h3>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "0.75rem" }}>
            {invoices.map((inv) => (
              <Link
                key={inv._id}
                href={`/dashboard/invoices/${inv._id}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0.75rem 1rem",
                  borderRadius: "10px",
                  border: "1px solid #e2e8f0",
                  backgroundColor: "#f8fafc",
                  textDecoration: "none",
                  transition: "background-color 0.1s ease",
                }}
              >
                <div>
                  <div style={{ fontWeight: 800, fontSize: "0.9rem", color: "#1e293b" }}>
                    {inv.invoiceNumber}
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                    {inv.items?.length || 0} line items • ${inv.totalAmount?.toFixed(2)}
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <span
                    style={{
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      padding: "0.15rem 0.45rem",
                      borderRadius: "6px",
                      textTransform: "uppercase",
                      backgroundColor: inv.status === "paid" ? "#ecfdf5" : inv.status === "pending" ? "#eff6ff" : "#fffbeb",
                      color: inv.status === "paid" ? "#065f46" : inv.status === "pending" ? "#1d4ed8" : "#b45309",
                    }}
                  >
                    {inv.status}
                  </span>
                  <ExternalLink size={14} style={{ color: "var(--text-muted)" }} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Agents Submissions & Progress */}
      <div style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
          <div>
            <h2 style={{ fontSize: "1.3rem", fontWeight: 800, color: "#0f172a" }}>
              Agent Rosters & Review Tables
            </h2>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              Inspect visits submitted by each therapist. Once reviewed, mark the agent as completed to lock their records and generate their invoice.
            </p>
          </div>
        </div>

        {agentGroups.length === 0 ? (
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "14px",
              border: "1px dashed var(--border-color)",
              padding: "3.5rem 1.5rem",
              textAlign: "center",
            }}
          >
            <Users size={36} style={{ color: "var(--text-muted)", margin: "0 auto 0.75rem" }} />
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "0.35rem" }}>
              No agent submissions yet
            </h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", maxWidth: "450px", margin: "0 auto" }}>
              Agents assigned to this platform can now open their portal, select this period (<strong>{lot.lotCode}</strong>), and tap their treatment dates.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {agentGroups.map((group) => {
              const isCompleted = group.status === "completed";
              const isSubmitted = group.status === "submitted";
              const isProcessing = actionLoading === group.agentId;

              return (
                <div
                  key={group.agentId}
                  style={{
                    backgroundColor: "#ffffff",
                    borderRadius: "14px",
                    border: isCompleted
                      ? "1px solid #a7f3d0"
                      : isSubmitted
                      ? "1.5px solid #fde68a"
                      : "1px solid var(--border-color)",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
                    overflow: "hidden",
                  }}
                >
                  {/* Agent Header Bar */}
                  <div
                    style={{
                      padding: "1rem 1.25rem",
                      backgroundColor: isCompleted
                        ? "#f0fdf4"
                        : isSubmitted
                        ? "#fffbeb"
                        : "#f8fafc",
                      borderBottom: "1px solid #e2e8f0",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: "0.75rem",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span style={{ fontWeight: 800, fontSize: "1.05rem", color: "#0f172a" }}>
                          {group.agentName}
                        </span>
                        <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                          ({group.agentEmail})
                        </span>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginTop: "0.25rem", fontSize: "0.8rem", color: "#475569" }}>
                        <span>
                          <strong>{group.visits.length}</strong> patients recorded
                        </span>
                        <span>•</span>
                        <span>
                          <strong>{group.totalVisitsCount}</strong> total treatment visits
                        </span>
                      </div>
                    </div>

                    {/* Agent Status Badge & Actions */}
                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                      {isCompleted ? (
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              padding: "0.25rem 0.65rem",
                              borderRadius: "6px",
                              backgroundColor: "#ecfdf5",
                              color: "#065f46",
                              border: "1px solid #a7f3d0",
                            }}
                          >
                            <Check size={13} style={{ color: "#059669" }} />
                            Completed & Locked
                          </span>

                          {/* Re-open button */}
                          <button
                            type="button"
                            onClick={() => handleReopenAgent(group)}
                            disabled={isProcessing}
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: "0.75rem", padding: "0.25rem 0.6rem", gap: "0.3rem" }}
                            title="Reopen period so agent can make edits"
                          >
                            <RotateCcw size={12} />
                            <span>Re-open</span>
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          {isSubmitted ? (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                fontSize: "0.75rem",
                                fontWeight: 700,
                                padding: "0.25rem 0.65rem",
                                borderRadius: "6px",
                                backgroundColor: "#fffbeb",
                                color: "#b45309",
                                border: "1px solid #fde68a",
                              }}
                            >
                              <Clock size={13} style={{ color: "#d97706" }} />
                              Ready for Review
                            </span>
                          ) : (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                fontSize: "0.75rem",
                                fontWeight: 600,
                                padding: "0.25rem 0.65rem",
                                borderRadius: "6px",
                                backgroundColor: "#f1f5f9",
                                color: "#475569",
                                border: "1px solid #e2e8f0",
                              }}
                            >
                              Logging in Progress
                            </span>
                          )}

                          {/* Mark Completed & Generate Invoice */}
                          <button
                            type="button"
                            onClick={() => handleMarkAgentCompleted(group)}
                            disabled={isProcessing || group.visits.length === 0}
                            className="btn btn-primary btn-sm"
                            style={{
                              fontSize: "0.78rem",
                              padding: "0.3rem 0.75rem",
                              gap: "0.35rem",
                            }}
                          >
                            <CheckCircle2 size={13} />
                            <span>
                              {isProcessing ? "Processing..." : "Complete & Generate Invoice"}
                            </span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Agent Patient Visits Table */}
                  {group.visits.length === 0 ? (
                    <div style={{ padding: "1.5rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                      No patients logged yet by this therapist.
                    </div>
                  ) : (
                    <div style={{ overflowX: "auto" }}>
                      <table className="table" style={{ margin: 0 }}>
                        <thead>
                          <tr>
                            <th style={{ width: "28%" }}>Patient Name</th>
                            <th style={{ width: "20%" }}>Service Type</th>
                            <th style={{ width: "32%" }}>Visit Dates</th>
                            <th style={{ width: "20%" }}>Notes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.visits.map((v) => (
                            <tr key={v._id}>
                              <td style={{ fontWeight: 700, color: "#0f172a" }}>
                                {v.patientName}
                              </td>
                              <td>
                                <span
                                  style={{
                                    display: "inline-block",
                                    fontSize: "0.75rem",
                                    fontWeight: 600,
                                    padding: "0.15rem 0.5rem",
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
                                        padding: "0.1rem 0.4rem",
                                        borderRadius: "5px",
                                        fontWeight: 600,
                                      }}
                                    >
                                      {formatDayLabel(dt)}
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                                {v.notes || "-"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
