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
    <div style={{ width: "100%", maxWidth: "100%", margin: "0" }}>
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
          borderRadius: "12px",
          border: isOpen ? "1px solid #bfdbfe" : "1px solid #e2e8f0",
          boxShadow: "0 1px 4px rgba(0,0,0,0.03)",
          padding: "1rem 1.25rem",
          marginBottom: "1rem",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "0.75rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span
                style={{
                  fontSize: "1.2rem",
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
                  OPEN
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
                  CLOSED
                </span>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.85rem", fontWeight: 700, color: "#1e293b" }}>
              <Building2 size={15} style={{ color: "var(--primary)" }} />
              <span>Agency: {lot.agencyName || "General Agency"}</span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.82rem", color: "var(--text-secondary)" }}>
              <Calendar size={14} style={{ color: "var(--text-muted)" }} />
              <span>
                {formatDate(lot.periodStart)} — {formatDate(lot.periodEnd)}
              </span>
            </div>
          </div>

          {/* Quick Actions */}
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              type="button"
              onClick={fetchDetails}
              className="btn btn-secondary btn-sm"
              style={{ display: "flex", alignItems: "center", gap: "0.35rem", padding: "0.35rem 0.65rem", fontSize: "0.8rem" }}
            >
              <RefreshCw size={13} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {lot.notes && (
          <p style={{ marginTop: "0.5rem", fontSize: "0.8rem", color: "var(--text-muted)", fontStyle: "italic", borderTop: "1px dashed #f1f5f9", paddingTop: "0.4rem", margin: "0.5rem 0 0 0" }}>
            Notes: {lot.notes}
          </p>
        )}
      </div>

      {/* Generated Invoices for this Period */}
      {invoices.length > 0 && (
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            border: "1px solid var(--border-color)",
            padding: "0.85rem 1.15rem",
            marginBottom: "1rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.6rem" }}>
            <h3 style={{ fontSize: "0.92rem", fontWeight: 800, color: "#0f172a", display: "flex", alignItems: "center", gap: "0.45rem", margin: 0 }}>
              <FileText size={15} style={{ color: "var(--primary)" }} />
              Generated Invoices ({invoices.length})
            </h3>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "0.5rem" }}>
            {invoices.map((inv) => (
              <Link
                key={inv._id}
                href={`/dashboard/invoices/${inv._id}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0.55rem 0.85rem",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  backgroundColor: "#f8fafc",
                  textDecoration: "none",
                  transition: "background-color 0.1s ease",
                }}
              >
                <div>
                  <div style={{ fontWeight: 800, fontSize: "0.85rem", color: "#1e293b" }}>
                    {inv.invoiceNumber}
                  </div>
                  <div style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>
                    {inv.items?.length || 0} line items • ${inv.totalAmount?.toFixed(2)}
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <span
                    style={{
                      fontSize: "0.68rem",
                      fontWeight: 700,
                      padding: "0.1rem 0.4rem",
                      borderRadius: "5px",
                      textTransform: "uppercase",
                      backgroundColor: inv.status === "paid" ? "#ecfdf5" : inv.status === "pending" ? "#eff6ff" : "#fffbeb",
                      color: inv.status === "paid" ? "#065f46" : inv.status === "pending" ? "#1d4ed8" : "#b45309",
                    }}
                  >
                    {inv.status}
                  </span>
                  <ExternalLink size={13} style={{ color: "var(--text-muted)" }} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Agents Submissions & Progress */}
      <div style={{ marginBottom: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
          <h2 style={{ fontSize: "0.95rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
            Agent Rosters
          </h2>
        </div>

        {agentGroups.length === 0 ? (
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "10px",
              border: "1px dashed var(--border-color)",
              padding: "2rem 1.25rem",
              textAlign: "center",
            }}
          >
            <Users size={26} style={{ color: "var(--text-muted)", margin: "0 auto 0.4rem" }} />
            <h3 style={{ fontSize: "0.9rem", fontWeight: 700, margin: "0 0 0.2rem 0" }}>
              No agent submissions yet
            </h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.8rem", margin: 0 }}>
              Visits logged by therapists for this period ({lot.lotCode}) will appear here in real time.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            {agentGroups.map((group) => {
              const isCompleted = group.status === "completed";
              const isSubmitted = group.status === "submitted";
              const isProcessing = actionLoading === group.agentId;

              return (
                <div
                  key={group.agentId}
                  style={{
                    backgroundColor: "#ffffff",
                    borderRadius: "10px",
                    border: isCompleted
                      ? "1px solid #a7f3d0"
                      : isSubmitted
                      ? "1.5px solid #fde68a"
                      : "1px solid var(--border-color)",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
                    overflow: "hidden",
                  }}
                >
                  {/* Compact Agent Header Bar */}
                  <div
                    style={{
                      padding: "0.55rem 0.9rem",
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
                      gap: "0.5rem",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                      <div style={{ display: "flex", alignItems: "baseline", gap: "0.35rem" }}>
                        <span style={{ fontWeight: 800, fontSize: "0.92rem", color: "#0f172a" }}>
                          {group.agentName}
                        </span>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                          ({group.agentEmail})
                        </span>
                      </div>

                      <div style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", fontSize: "0.76rem", color: "#64748b" }}>
                        <span><strong>{group.visits.length}</strong> pts</span>
                        <span>•</span>
                        <span><strong>{group.totalVisitsCount}</strong> visits</span>
                      </div>
                    </div>

                    {/* Compact Status & Actions */}
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      {isCompleted ? (
                        <>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "3px",
                              fontSize: "0.72rem",
                              fontWeight: 700,
                              padding: "0.15rem 0.45rem",
                              borderRadius: "5px",
                              backgroundColor: "#ecfdf5",
                              color: "#065f46",
                              border: "1px solid #a7f3d0",
                            }}
                          >
                            <Check size={12} style={{ color: "#059669" }} />
                            Completed
                          </span>

                          <button
                            type="button"
                            onClick={() => handleReopenAgent(group)}
                            disabled={isProcessing}
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: "0.72rem", padding: "0.2rem 0.5rem", gap: "0.25rem", height: "auto" }}
                            title="Reopen for agent edits"
                          >
                            <RotateCcw size={11} />
                            <span>Re-open</span>
                          </button>
                        </>
                      ) : (
                        <>
                          {isSubmitted ? (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "3px",
                                fontSize: "0.72rem",
                                fontWeight: 700,
                                padding: "0.15rem 0.45rem",
                                borderRadius: "5px",
                                backgroundColor: "#fffbeb",
                                color: "#b45309",
                                border: "1px solid #fde68a",
                              }}
                            >
                              <Clock size={12} style={{ color: "#d97706" }} />
                              Submitted
                            </span>
                          ) : (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                fontSize: "0.72rem",
                                fontWeight: 600,
                                padding: "0.15rem 0.45rem",
                                borderRadius: "5px",
                                backgroundColor: "#f1f5f9",
                                color: "#475569",
                                border: "1px solid #e2e8f0",
                              }}
                            >
                              In Progress
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => handleMarkAgentCompleted(group)}
                            disabled={isProcessing || group.visits.length === 0}
                            className="btn btn-primary btn-sm"
                            style={{
                              fontSize: "0.75rem",
                              padding: "0.22rem 0.65rem",
                              gap: "0.3rem",
                              height: "auto",
                            }}
                          >
                            <CheckCircle2 size={12} />
                            <span>
                              {isProcessing ? "Processing..." : "Complete & Invoice"}
                            </span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Agent Patient Visits Table */}
                  {group.visits.length === 0 ? (
                    <div style={{ padding: "1rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.8rem" }}>
                      No patients logged yet.
                    </div>
                  ) : (
                    <div style={{ overflowX: "auto" }}>
                      <table className="table" style={{ margin: 0, fontSize: "0.82rem" }}>
                        <thead>
                          <tr style={{ backgroundColor: "#fbfcfd" }}>
                            <th style={{ width: "20%", padding: "0.45rem 0.75rem", fontSize: "0.74rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>Patient</th>
                            <th style={{ width: "12%", padding: "0.45rem 0.75rem", fontSize: "0.74rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>Service</th>
                            <th style={{ width: "50%", padding: "0.45rem 0.75rem", fontSize: "0.74rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>Dates</th>
                            <th style={{ width: "18%", padding: "0.45rem 0.75rem", fontSize: "0.74rem", textTransform: "uppercase", letterSpacing: "0.04em", textAlign: "right" }}>Notes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.visits.map((v) => (
                            <tr key={v._id}>
                              <td style={{ fontWeight: 700, color: "#0f172a", padding: "0.45rem 0.75rem", whiteSpace: "nowrap" }}>
                                {v.patientName}
                              </td>
                              <td style={{ padding: "0.45rem 0.75rem" }}>
                                <span
                                  style={{
                                    display: "inline-block",
                                    fontSize: "0.72rem",
                                    fontWeight: 700,
                                    padding: "0.1rem 0.4rem",
                                    borderRadius: "5px",
                                    backgroundColor: "#eff6ff",
                                    color: "#1d4ed8",
                                    border: "1px solid #bfdbfe",
                                  }}
                                >
                                  {v.serviceType || "Visit"}
                                </span>
                              </td>
                              <td style={{ padding: "0.45rem 0.75rem" }}>
                                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.3rem" }}>
                                  {v.visitDates.map((dt) => (
                                    <span
                                      key={dt}
                                      style={{
                                        fontSize: "0.72rem",
                                        backgroundColor: "#f1f5f9",
                                        color: "#334155",
                                        padding: "0.05rem 0.35rem",
                                        borderRadius: "4px",
                                        fontWeight: 600,
                                        whiteSpace: "nowrap",
                                      }}
                                    >
                                      {formatDayLabel(dt)}
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td style={{ fontSize: "0.78rem", color: "var(--text-muted)", padding: "0.45rem 0.75rem", textAlign: "right" }}>
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
