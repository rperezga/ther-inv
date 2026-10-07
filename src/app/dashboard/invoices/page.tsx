"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FileText,
  PlusCircle,
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
} from "lucide-react";
import { IInvoice, ILot } from "@/lib/types";

export default function InvoicesListPage() {
  const [invoices, setInvoices] = useState<IInvoice[]>([]);
  const [lots, setLots] = useState<ILot[]>([]);
  const [lotFilter, setLotFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string>("");

  // Confirmation modal for Submit action
  const [invoiceToSubmit, setInvoiceToSubmit] = useState<IInvoice | null>(null);
  const [isSubmittingConfirm, setIsSubmittingConfirm] = useState(false);

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
      if (search) url.searchParams.set("search", search);

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

  useEffect(() => {
    fetchInvoices();
  }, [statusFilter, lotFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchInvoices();
  };

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

  // Direct print invoice in printable tab/window
  const handleDirectPrint = (id: string) => {
    window.open(`/dashboard/invoices/${id}?print=true`, "_blank");
  };

  const handleDelete = async (id: string, invoiceNum: string, status: string) => {
    if (status !== "draft") {
      alert("Submitted and Paid invoices cannot be deleted.");
      return;
    }

    if (!confirm(`Are you sure you want to delete draft invoice ${invoiceNum}?`)) {
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
              { id: "all", label: "All Invoices" },
              { id: "pending", label: "Submitted" },
              { id: "paid", label: "Paid" },
              { id: "draft", label: "Drafts" },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setStatusFilter(st.id)}
                className={`btn btn-sm ${
                  statusFilter === st.id ? "btn-primary" : "btn-secondary"
                }`}
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
                {lots.map((l) => (
                  <option key={l._id} value={l._id}>
                    {l.lotCode} {l.name ? `(${l.name})` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Search Input with instant/live typing */}
        <form
          onSubmit={handleSearchSubmit}
          style={{ display: "flex", gap: "0.5rem", minWidth: "280px" }}
        >
          <div style={{ position: "relative", flex: 1 }}>
            <input
              type="text"
              className="form-input"
              placeholder="Search agent, agency, invoice #..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: "2.2rem", paddingRight: "0.5rem" }}
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
          <button type="submit" className="btn btn-secondary btn-sm">
            Search
          </button>
        </form>
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
                  <th>LOT</th>
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
                  const lotInfo = (inv as any).lotId;

                  // Format 3-digit LOT number e.g. LOT 001
                  let lotDisplay = "LOT 001";
                  if (lotInfo?.lotNumber) {
                    lotDisplay = `LOT ${String(lotInfo.lotNumber).padStart(3, "0")}`;
                  } else if (inv.lotNumber) {
                    lotDisplay = `LOT ${String(inv.lotNumber).padStart(3, "0")}`;
                  } else if (lotInfo?.lotCode) {
                    const match = lotInfo.lotCode.match(/(\d+)/g);
                    const lastNum = match ? match[match.length - 1] : "1";
                    lotDisplay = `LOT ${String(lastNum).padStart(3, "0")}`;
                  }

                  return (
                    <tr key={inv._id}>
                      {/* Invoice Number */}
                      <td style={{ fontWeight: 700, color: "var(--primary)", whiteSpace: "nowrap" }}>
                        <Link href={`/dashboard/invoices/${inv._id}`}>
                          {inv.invoiceNumber}
                        </Link>
                      </td>

                      {/* LOT (3 digits, e.g. LOT 001) */}
                      <td>
                        <span
                          style={{
                            fontSize: "0.78rem",
                            backgroundColor: "#eff6ff",
                            color: "#1d4ed8",
                            border: "1px solid #bfdbfe",
                            padding: "0.22rem 0.55rem",
                            borderRadius: "5px",
                            fontWeight: 800,
                            letterSpacing: "0.03em",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.25rem",
                            whiteSpace: "nowrap",
                          }}
                        >
                          <Layers size={12} color="#1d4ed8" />
                          {lotDisplay}
                        </span>
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
                          {/* Submit Action Button (Only for Managers/Admins, disabled/locked once submitted) */}
                          {currentUserRole !== "viewer" && (
                            <button
                              onClick={() => {
                                if (isDraft) {
                                  handleOpenSubmitConfirm(inv);
                                }
                              }}
                              disabled={!isDraft || updatingId === inv._id}
                              className={`btn btn-sm ${
                                isSubmitted ? "btn-primary" : "btn-secondary"
                              }`}
                              style={{
                                padding: "0.3rem 0.6rem",
                                fontSize: "0.78rem",
                                gap: "0.25rem",
                                opacity: isSubmitted ? 0.85 : 1,
                                cursor: isSubmitted ? "default" : "pointer",
                              }}
                              title={
                                isSubmitted
                                  ? "Submitted & Locked"
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

                          {/* Download / Save as PDF Button */}
                          <button
                            onClick={() => handleDirectPrint(inv._id!)}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: "0.35rem 0.55rem" }}
                            title="Download PDF"
                          >
                            <Download size={14} />
                            <span style={{ fontSize: "0.78rem" }}>Download</span>
                          </button>

                          {/* Print Button */}
                          <button
                            onClick={() => handleDirectPrint(inv._id!)}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: "0.35rem 0.55rem" }}
                            title="Print Invoice"
                          >
                            <Printer size={14} />
                            <span style={{ fontSize: "0.78rem" }}>Print</span>
                          </button>

                          {/* Edit / Draft button (Managers/Admins only) */}
                          {currentUserRole !== "viewer" && isDraft && (
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

                          {/* Delete Button: ONLY available for Draft invoices, NEVER for viewers or submitted invoices */}
                          {currentUserRole !== "viewer" && isDraft && (
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
                              title="Delete Draft Invoice"
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
                <strong>Notice:</strong> Once submitted, this invoice will be published for <strong>Viewers</strong> to see and will be <strong>locked from deletion</strong>.
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
    </div>
  );
}

