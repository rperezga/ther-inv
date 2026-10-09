"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FileText,
  PlusCircle,
  Plus,
  Search,
  Filter,
  Trash2,
  Eye,
  Calendar,
  AlertCircle,
  Edit2,
  Printer,
  Download,
  CheckCircle2,
  Clock,
  User,
  Send,
  Layers,
  Building2,
} from "lucide-react";
import { IInvoice, ILot } from "@/lib/types";
import { generateInvoicePDF } from "@/lib/pdfExport";

const AGENCIES = [
  "A&A HEALTH SERVICE",
  "ALC",
  "INNOVATION",
  "MEDCARE",
  "OASIS",
  "USAD",
];

export default function InvoicesListPage() {
  const [invoices, setInvoices] = useState<IInvoice[]>([]);
  const [lots, setLots] = useState<ILot[]>([]);
  const [lotFilter, setLotFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("draft");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string>("");

  // Confirmation modal for Submit action
  const [invoiceToSubmit, setInvoiceToSubmit] = useState<IInvoice | null>(null);
  const [isSubmittingConfirm, setIsSubmittingConfirm] = useState(false);

  // New Lot Modal state
  const [showNewLotModal, setShowNewLotModal] = useState(false);
  const [newLotAgency, setNewLotAgency] = useState(AGENCIES[0]);
  const [newLotStart, setNewLotStart] = useState("");
  const [newLotEnd, setNewLotEnd] = useState("");
  const [creatingLot, setCreatingLot] = useState(false);
  const [lotModalError, setLotModalError] = useState("");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.user?.role) setCurrentUserRole(data.user.role);
      })
      .catch(() => {});
  }, []);

  const fetchLots = async () => {
    try {
      const res = await fetch("/api/lots");
      const data = await res.json();
      if (res.ok && data.lots) {
        setLots(data.lots);
      }
    } catch (err) {
      console.error("Error fetching lots:", err);
    }
  };

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const url = new URL("/api/invoices", window.location.origin);
      if (statusFilter !== "all") url.searchParams.set("status", statusFilter);
      if (lotFilter !== "all") url.searchParams.set("lotId", lotFilter);
      if (search.trim()) url.searchParams.set("search", search.trim());

      const res = await fetch(url.toString());
      const data = await res.json();
      if (res.ok) {
        setInvoices(data.invoices || []);
      }
    } catch (err) {
      console.error("Error fetching invoices:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLots();
  }, []);

  // Live search debounced typing + filter change
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchInvoices();
    }, 250);
    return () => clearTimeout(handler);
  }, [statusFilter, lotFilter, search]);

  // Open confirmation modal for submit
  const handleOpenSubmitConfirm = (inv: IInvoice) => {
    setInvoiceToSubmit(inv);
  };

  // Confirm submit from modal
  const handleConfirmSubmit = async () => {
    if (!invoiceToSubmit) return;
    setIsSubmittingConfirm(true);

    try {
      const res = await fetch(`/api/invoices/${invoiceToSubmit._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "pending" }),
      });

      if (res.ok) {
        setInvoices((prev) =>
          prev.map((inv) =>
            inv._id === invoiceToSubmit._id ? { ...inv, status: "pending" } : inv
          )
        );
        setInvoiceToSubmit(null);
      } else {
        const data = await res.json();
        alert(data.error || "Failed to submit invoice");
      }
    } catch {
      alert("Failed to connect to server");
    } finally {
      setIsSubmittingConfirm(false);
    }
  };

  // Create new lot from modal
  const handleCreateNewLot = async (e: React.FormEvent) => {
    e.preventDefault();
    setLotModalError("");
    if (!newLotStart || !newLotEnd) {
      setLotModalError("Please select both start and end dates.");
      return;
    }

    setCreatingLot(true);
    try {
      const res = await fetch("/api/lots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          periodStart: newLotStart,
          periodEnd: newLotEnd,
          agencyName: newLotAgency,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create lot");
      }

      // Add to lots list and select it in filter
      setLots((prev) => [data.lot, ...prev]);
      setLotFilter(data.lot._id || "all");
      setShowNewLotModal(false);
      setNewLotStart("");
      setNewLotEnd("");
    } catch (err: any) {
      setLotModalError(err.message || "Failed to create lot");
    } finally {
      setCreatingLot(false);
    }
  };

  // Direct print invoice in a new printable tab/window
  const handleDirectPrint = (id: string) => {
    window.open(`/dashboard/invoices/${id}?print=true`, "_blank");
  };

  // Direct download PDF document without opening print view
  const handleDirectDownload = (inv: IInvoice) => {
    generateInvoicePDF(inv);
  };

  const handleDelete = async (id: string, invoiceNum: string, status: string) => {
    if (status === "paid") {
      alert("This invoice has already been paid/approved and cannot be deleted.");
      return;
    }

    const typeDesc = status === "draft" ? "draft invoice" : "submitted invoice";
    if (!confirm(`Are you sure you want to delete ${typeDesc} ${invoiceNum}?`)) {
      return;
    }

    setDeletingId(id);
    try {
      const res = await fetch(`/api/invoices/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        setInvoices((prev) => prev.filter((inv) => inv._id !== id));
      } else {
        alert(data.error || "Failed to delete invoice");
      }
    } catch {
      alert("Failed to connect to server");
    } finally {
      setDeletingId(null);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(val || 0);
  };

  const formatDate = (dateStr?: string | Date) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getAgentName = (inv: IInvoice) => {
    if (inv.items && inv.items.length > 0 && inv.items[0].workerName) {
      return inv.items[0].workerName;
    }
    if (inv.notes && inv.notes.includes("Therapist:")) {
      const match = inv.notes.match(/Therapist:\s*([^\•\n]+)/);
      if (match && match[1]) return match[1].trim();
    }
    return "Staff Member";
  };

  /**
   * Checks whether the agent associated with this invoice is marked as "completed" in its Billing Period.
   * If the period is not loaded or has no agentStatuses, defaults to true if lotId isn't tracked.
   */
  const isInvoicePeriodCompleted = (inv: IInvoice): boolean => {
    // If invoice is already submitted/paid, it's considered valid
    if (inv.status === "pending" || inv.status === "paid") return true;

    // Resolve Lot: either populated on inv.lotId or from loaded lots state
    const lotObj: any = typeof inv.lotId === "object" ? inv.lotId : lots.find((l) => l._id === inv.lotId);
    if (!lotObj || !Array.isArray(lotObj.agentStatuses) || lotObj.agentStatuses.length === 0) {
      return false;
    }

    const invIdStr = inv._id?.toString();
    const invNum = inv.invoiceNumber;
    const workerTargetId = inv.items?.[0]?.workerId?.toString();
    const workerName = inv.items?.[0]?.workerName?.toLowerCase().trim();

    const matchingStatus = lotObj.agentStatuses.find((as: any) => {
      if (as.invoiceId && as.invoiceId.toString() === invIdStr) return true;
      if (as.invoiceNumber && as.invoiceNumber === invNum) return true;
      if (workerTargetId && as.agentId && as.agentId.toString() === workerTargetId) return true;
      if (workerName && as.agentName && as.agentName.toLowerCase().trim() === workerName) return true;
      return false;
    });

    return matchingStatus?.status === "completed";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <span className="badge badge-paid">Paid</span>;
      case "pending":
        return (
          <span
            className="badge"
            style={{
              backgroundColor: "#dbeafe",
              color: "#1e40af",
              borderColor: "#bfdbfe",
              fontWeight: 600,
            }}
          >
            Submitted
          </span>
        );
      case "draft":
        return <span className="badge badge-draft">Draft</span>;
      case "cancelled":
        return <span className="badge badge-cancelled">Cancelled</span>;
      default:
        return <span className="badge">{status}</span>;
    }
  };

  return (
    <div style={{ maxWidth: "100%", width: "100%" }}>
      {/* Page Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
          marginBottom: "1.25rem",
        }}
      >
        <div>
          <h1 style={{ fontSize: "1.6rem", fontWeight: 800, marginBottom: "0.2rem" }}>
            Invoices
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem" }}>
            Overview of all weekly agency invoices, clinical staff assignments, and submission statuses.
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
          {currentUserRole !== "viewer" && (
            <button
              type="button"
              id="invoices-create-lot-btn"
              onClick={() => {
                setLotModalError("");
                setShowNewLotModal(true);
              }}
              className="btn btn-secondary"
              style={{ gap: "0.45rem", fontWeight: 700 }}
            >
              <Plus size={16} />
              <span>New Lot</span>
            </button>
          )}

          <Link
            href="/dashboard/invoices/new"
            id="invoices-create-btn"
            className="btn btn-primary"
            style={{ gap: "0.5rem" }}
          >
            <PlusCircle size={18} />
            <span>New Weekly Invoice</span>
          </Link>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div
        className="card"
        style={{
          marginBottom: "1.25rem",
          padding: "0.85rem 1.15rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "0.85rem",
        }}
      >
        {/* Status Filter Buttons and Lot Filter */}
        <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
            {[
              { id: "draft", label: "In Progress" },
              { id: "pending", label: "Submitted" },
              { id: "paid", label: "Paid" },
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setStatusFilter(st.id)}
                className={`btn btn-sm ${
                  statusFilter === st.id ? "btn-primary" : "btn-secondary"
                }`}
                style={{
                  fontWeight: 700,
                  fontSize: "0.82rem",
                  padding: "0.35rem 0.85rem",
                }}
              >
                {st.label}
              </button>
            ))}
          </div>

          {/* Lot Selector Filter */}
          {lots.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginLeft: "0.5rem" }}>
              <Layers size={14} color="var(--primary)" />
              <select
                className="form-select"
                value={lotFilter}
                onChange={(e) => setLotFilter(e.target.value)}
                style={{
                  height: "32px",
                  fontSize: "0.8rem",
                  padding: "0.2rem 0.5rem",
                  width: "auto",
                  minWidth: "160px",
                  fontWeight: 600,
                }}
              >
                <option value="all">All Billing Lots</option>
                {lots.map((l) => {
                  const numStr = String(l.lotNumber || 1).padStart(3, "0");
                  const agencyPart = l.agencyName ? ` • ${l.agencyName}` : "";
                  return (
                    <option key={l._id} value={l._id}>
                      LOT {numStr}{agencyPart}
                    </option>
                  );
                })}
              </select>
            </div>
          )}
        </div>

        {/* Live Search Input */}
        <div style={{ position: "relative", minWidth: "280px", maxWidth: "360px", flex: "1 1 280px" }}>
          <input
            type="text"
            className="form-input"
            placeholder="Search agent, agency, invoice #..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: "2.2rem", paddingRight: "0.75rem", fontSize: "0.85rem" }}
          />
          <Search
            size={16}
            style={{
              position: "absolute",
              left: "0.75rem",
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--text-muted)",
            }}
          />
        </div>
      </div>

      {/* Invoices List Table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "3.5rem", textAlign: "center", color: "var(--text-muted)" }}>
            Loading invoices...
          </div>
        ) : invoices.length === 0 ? (
          <div style={{ padding: "3.5rem 1.5rem", textAlign: "center" }}>
            <FileText size={48} style={{ opacity: 0.35, marginBottom: "1rem" }} />
            <p style={{ fontWeight: 600, fontSize: "1.1rem" }}>
              No invoices found
            </p>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
              Try changing the search filter or click &apos;New Weekly Invoice&apos; to generate one.
            </p>
            <Link href="/dashboard/invoices/new" className="btn btn-primary btn-sm">
              <PlusCircle size={16} /> New Weekly Invoice
            </Link>
          </div>
        ) : (
          <div className="table-container" style={{ border: "none" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Clinical Agent</th>
                  <th>Agency</th>
                  <th>Period</th>
                  <th>Date</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => {
                  const agentName = getAgentName(inv);
                  const isSubmitted = inv.status === "pending" || inv.status === "paid";
                  const isDraft = inv.status === "draft";
                  const canSubmit = isInvoicePeriodCompleted(inv);

                  return (
                    <tr key={inv._id}>
                      {/* Invoice Number */}
                      <td style={{ fontWeight: 700, color: "var(--primary)", whiteSpace: "nowrap" }}>
                        <Link href={`/dashboard/invoices/${inv._id}`}>
                          {inv.invoiceNumber}
                        </Link>
                      </td>

                      {/* Agent Name */}
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                          <User size={14} color="var(--primary)" />
                          <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                            {agentName}
                          </span>
                        </div>
                      </td>

                      {/* Agency Name */}
                      <td>
                        <span
                          style={{
                            fontSize: "0.82rem",
                            backgroundColor: "var(--bg-subtle)",
                            padding: "0.2rem 0.55rem",
                            borderRadius: "4px",
                            fontWeight: 600,
                            color: "var(--text-secondary)",
                          }}
                        >
                          {inv.clientName}
                        </span>
                      </td>

                      {/* Period */}
                      <td style={{ fontSize: "0.84rem", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                        {formatDate(inv.periodStart)} – {formatDate(inv.periodEnd)}
                      </td>

                      {/* Date */}
                      <td style={{ fontSize: "0.84rem", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                        {formatDate(inv.invoiceDate)}
                      </td>

                      {/* Total */}
                      <td style={{ fontWeight: 800, fontSize: "0.95rem", color: "var(--text-primary)" }}>
                        {formatCurrency(inv.totalAmount)}
                      </td>

                      {/* Status */}
                      <td>{getStatusBadge(inv.status)}</td>

                      {/* Action Buttons: View, Download, Print, Delete, Submit */}
                      <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                        <div
                          style={{
                            display: "inline-flex",
                            gap: "0.35rem",
                            alignItems: "center",
                            justifyContent: "flex-end",
                          }}
                        >
                          {/* Submit Action Button (Only enabled once marked completed in Billing Period) */}
                          {currentUserRole !== "viewer" && (
                            <button
                              onClick={() => {
                                if (isDraft && canSubmit) {
                                  handleOpenSubmitConfirm(inv);
                                }
                              }}
                              disabled={!isDraft || !canSubmit || updatingId === inv._id}
                              className={`btn btn-sm ${
                                isSubmitted ? "btn-primary" : "btn-secondary"
                              }`}
                              style={{
                                padding: "0.3rem 0.6rem",
                                fontSize: "0.78rem",
                                gap: "0.25rem",
                                opacity: isSubmitted ? 0.85 : !canSubmit ? 0.45 : 1,
                                cursor: isSubmitted ? "default" : !canSubmit ? "not-allowed" : "pointer",
                              }}
                              title={
                                isSubmitted
                                  ? "Submitted & Locked"
                                  : !canSubmit
                                  ? "Waiting for manager to mark this agent as 'Completed' in Billing Period before submitting"
                                  : "Submit invoice (confirms and makes visible to viewers)"
                              }
                            >
                              <Send size={12} />
                              <span>{isSubmitted ? "Submitted" : "Submit"}</span>
                            </button>
                          )}

                          {/* View Button */}
                          <Link
                            href={`/dashboard/invoices/${inv._id}`}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: "0.35rem 0.55rem" }}
                            title="View Invoice"
                          >
                            <Eye size={14} />
                            <span style={{ fontSize: "0.78rem" }}>View</span>
                          </Link>

                          {/* Download / Save as PDF Button (Direct Download) */}
                          <button
                            onClick={() => handleDirectDownload(inv)}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: "0.35rem 0.55rem" }}
                            title="Download PDF"
                          >
                            <Download size={14} />
                            <span style={{ fontSize: "0.78rem" }}>Download</span>
                          </button>

                          {/* Print Button (Opens in new tab to print) */}
                          <button
                            onClick={() => handleDirectPrint(inv._id!)}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: "0.35rem 0.55rem" }}
                            title="Print Invoice in new tab"
                          >
                            <Printer size={14} />
                            <span style={{ fontSize: "0.78rem" }}>Print</span>
                          </button>

                          {/* Edit / Draft button (Managers/Admins only: allowed as long as not paid) */}
                          {currentUserRole !== "viewer" && inv.status !== "paid" && (
                            <Link
                              href={`/dashboard/invoices/new?edit=${inv._id}`}
                              className="btn btn-secondary btn-sm"
                              style={{
                                padding: "0.35rem 0.5rem",
                                color: "var(--primary)",
                                borderColor: "var(--primary-border)",
                                backgroundColor: "#f0f7ff",
                              }}
                              title="Edit Visits / Rates"
                            >
                              <Edit2 size={13} />
                            </Link>
                          )}

                          {/* Delete Button: Allowed for Managers/Admins as long as not marked as Paid/Approved by viewer */}
                          {currentUserRole !== "viewer" && inv.status !== "paid" && (
                            <button
                              onClick={() => handleDelete(inv._id!, inv.invoiceNumber, inv.status)}
                              disabled={deletingId === inv._id}
                              className="btn btn-sm"
                              style={{
                                padding: "0.35rem 0.5rem",
                                color: "var(--danger)",
                                border: "1px solid var(--danger-border)",
                                backgroundColor: "var(--danger-subtle)",
                              }}
                              title={inv.status === "draft" ? "Delete Draft Invoice" : "Delete Submitted Invoice"}
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirmation Modal for Submitting Invoice */}
      {invoiceToSubmit && (
        <div className="modal-backdrop">
          <div
            className="modal"
            style={{
              maxWidth: "480px",
              padding: "1.5rem",
              borderRadius: "12px",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1rem" }}>
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  backgroundColor: "var(--primary-subtle)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--primary)",
                }}
              >
                <Send size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 800 }}>
                  Confirm Invoice Submission
                </h3>
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  Review summary before locking and publishing
                </span>
              </div>
            </div>

            <div
              style={{
                backgroundColor: "var(--bg-subtle)",
                borderRadius: "8px",
                padding: "1rem",
                marginBottom: "1.25rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
                fontSize: "0.88rem",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)", fontWeight: 600 }}>Invoice #:</span>
                <span style={{ fontWeight: 800, color: "var(--primary)" }}>{invoiceToSubmit.invoiceNumber}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)", fontWeight: 600 }}>Clinical Agent:</span>
                <span style={{ fontWeight: 700 }}>{getAgentName(invoiceToSubmit)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)", fontWeight: 600 }}>Partner Agency:</span>
                <span style={{ fontWeight: 700 }}>{invoiceToSubmit.clientName}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)", fontWeight: 600 }}>Cycle Period:</span>
                <span style={{ fontWeight: 600 }}>
                  {formatDate(invoiceToSubmit.periodStart)} – {formatDate(invoiceToSubmit.periodEnd)}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  borderTop: "1px dashed var(--border-color)",
                  paddingTop: "0.5rem",
                  marginTop: "0.25rem",
                }}
              >
                <span style={{ fontWeight: 700 }}>Total Amount:</span>
                <span style={{ fontWeight: 800, fontSize: "1.05rem", color: "var(--text-primary)" }}>
                  {formatCurrency(invoiceToSubmit.totalAmount)}
                </span>
              </div>
            </div>

            <div
              style={{
                backgroundColor: "#fffbeb",
                border: "1px solid var(--warning-border)",
                borderRadius: "6px",
                padding: "0.6rem 0.85rem",
                fontSize: "0.78rem",
                color: "#92400e",
                marginBottom: "1.25rem",
                display: "flex",
                gap: "0.5rem",
                alignItems: "flex-start",
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: "2px" }} />
              <div>
                <strong>Notice:</strong> Once submitted, this invoice will be published for <strong>Viewers</strong> to see. It can still be deleted or modified until the viewer approves or marks it as <strong>Paid</strong>.
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.6rem" }}>
              <button
                type="button"
                onClick={() => setInvoiceToSubmit(null)}
                disabled={isSubmittingConfirm}
                className="btn btn-secondary btn-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSubmit}
                disabled={isSubmittingConfirm}
                className="btn btn-primary btn-sm"
                style={{ gap: "0.4rem" }}
              >
                <CheckCircle2 size={15} />
                <span>{isSubmittingConfirm ? "Submitting..." : "Confirm & Submit"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create New Lot */}
      {showNewLotModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "1rem",
          }}
        >
          <div
            className="card"
            style={{
              maxWidth: "460px",
              width: "100%",
              padding: "1.5rem",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
              backgroundColor: "white",
              borderRadius: "12px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "1.25rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <div
                  style={{
                    width: "38px",
                    height: "38px",
                    borderRadius: "8px",
                    backgroundColor: "var(--primary-subtle)",
                    color: "var(--primary)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Layers size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: "1.15rem", fontWeight: 700, margin: 0 }}>
                    Create New Lot
                  </h3>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: 0 }}>
                    Set up a 3-digit billing cycle lot for partner agencies
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNewLotModal(false)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-muted)",
                  padding: "0.25rem",
                  fontSize: "1.1rem",
                }}
              >
                ✕
              </button>
            </div>

            {lotModalError && (
              <div
                style={{
                  backgroundColor: "var(--danger-subtle)",
                  color: "var(--danger)",
                  border: "1px solid var(--danger-border)",
                  borderRadius: "var(--radius-md)",
                  padding: "0.65rem 0.85rem",
                  marginBottom: "1rem",
                  fontSize: "0.825rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <AlertCircle size={16} />
                <span>{lotModalError}</span>
              </div>
            )}

            <form onSubmit={handleCreateNewLot}>
              {/* Generated Lot Number Preview */}
              <div
                style={{
                  padding: "0.75rem 0.9rem",
                  backgroundColor: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "1rem",
                }}
              >
                <div>
                  <div style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", color: "#1e40af" }}>
                    Assigned Lot Number
                  </div>
                  <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#1d4ed8", letterSpacing: "0.05em" }}>
                    LOT {String(lots.reduce((max, l) => Math.max(max, l.lotNumber || 0), 0) + 1).padStart(3, "0")}
                  </div>
                </div>
                <span
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    padding: "0.25rem 0.6rem",
                    borderRadius: "999px",
                    backgroundColor: "#dbeafe",
                    color: "#1e40af",
                  }}
                >
                  Auto-Generated
                </span>
              </div>

              {/* Partner Agency Selection */}
              <div className="form-group" style={{ marginBottom: "1rem" }}>
                <label className="form-label" style={{ fontSize: "0.85rem", fontWeight: 700 }}>
                  Partner Agency *
                </label>
                <div style={{ position: "relative" }}>
                  <select
                    className="form-select"
                    value={newLotAgency}
                    onChange={(e) => setNewLotAgency(e.target.value)}
                    style={{
                      height: "38px",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      width: "100%",
                    }}
                  >
                    {AGENCIES.map((agency) => (
                      <option key={agency} value={agency}>
                        {agency}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Cycle Date Range */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "0.75rem",
                  marginBottom: "1.5rem",
                }}
              >
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: "0.85rem", fontWeight: 700 }}>
                    Cycle Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    className="form-input"
                    value={newLotStart}
                    onChange={(e) => setNewLotStart(e.target.value)}
                    style={{ height: "38px" }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontSize: "0.85rem", fontWeight: 700 }}>
                    Cycle End Date *
                  </label>
                  <input
                    type="date"
                    required
                    className="form-input"
                    value={newLotEnd}
                    onChange={(e) => setNewLotEnd(e.target.value)}
                    style={{ height: "38px" }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => setShowNewLotModal(false)}
                  className="btn btn-secondary"
                  style={{ padding: "0.5rem 1rem" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingLot}
                  className="btn btn-primary"
                  style={{ padding: "0.5rem 1.25rem", gap: "0.4rem" }}
                >
                  <Plus size={16} />
                  <span>{creatingLot ? "Creating..." : "Create Lot"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

