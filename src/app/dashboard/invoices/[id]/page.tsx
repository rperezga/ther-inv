"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Printer,
  ArrowLeft,
  CheckCircle,
  Clock,
  FileText,
  Building,
  Mail,
  MapPin,
  Calendar,
  DollarSign,
  Download,
  Edit2,
} from "lucide-react";
import { IInvoice } from "@/lib/types";

export default function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [invoice, setInvoice] = useState<IInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    fetch(`/api/invoices/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Invoice not found");
        return res.json();
      })
      .then((data) => {
        if (data.invoice) {
          setInvoice(data.invoice);
          if (typeof window !== "undefined") {
            const params = new URLSearchParams(window.location.search);
            if (params.get("print") === "true") {
              setTimeout(() => {
                window.print();
              }, 400);
            }
          }
        }
      })
      .catch((err) => {
        console.error(err);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleStatusChange = async (newStatus: string) => {
    if (!invoice) return;
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/invoices/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (res.ok) {
        setInvoice(data.invoice);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (val?: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(val || 0);
  };

  const formatDate = (dateStr?: string | Date) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div style={{ padding: "4rem", textAlign: "center", color: "var(--text-muted)" }}>
        Loading invoice details...
      </div>
    );
  }

  if (!invoice) {
    return (
      <div style={{ textAlign: "center", padding: "4rem 1rem" }}>
        <h2 style={{ marginBottom: "1rem" }}>Invoice not found</h2>
        <Link href="/dashboard/invoices" className="btn btn-primary">
          <ArrowLeft size={16} /> Back to invoices
        </Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "980px", margin: "0 auto" }}>
      {/* Action Header - Hidden during print */}
      <div
        className="no-print"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        <Link
          href="/dashboard/invoices"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
            color: "var(--text-muted)",
            fontSize: "0.875rem",
          }}
        >
          <ArrowLeft size={16} /> Back to invoices list
        </Link>

        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          {/* Quick status dropdown */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
              Status:
            </span>
            <select
              className="form-select"
              style={{ width: "auto", padding: "0.4rem 0.75rem", fontSize: "0.85rem" }}
              value={invoice.status}
              disabled={updatingStatus}
              onChange={(e) => handleStatusChange(e.target.value)}
            >
              <option value="draft">Draft</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <Link
            href={`/dashboard/invoices/new?edit=${invoice._id}`}
            className="btn btn-secondary btn-sm"
            style={{
              gap: "0.4rem",
              color: "var(--primary)",
              borderColor: "var(--primary-border)",
              backgroundColor: "#f0f7ff",
              fontWeight: 600,
            }}
          >
            <Edit2 size={15} />
            <span>Edit Invoice / Visits</span>
          </Link>

          <button
            onClick={handlePrint}
            id="print-invoice-btn"
            className="btn btn-primary btn-sm"
          >
            <Printer size={16} />
            <span>Print / Save as PDF</span>
          </button>
        </div>
      </div>

      {/* Invoice Document Canvas - Clean, Printable Sheet */}
      <div
        className="card print-invoice-sheet"
        style={{
          padding: "3.5rem 3rem",
          backgroundColor: "#ffffff",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-md)",
          marginBottom: "3rem",
        }}
      >
        {/* Brand & Invoice No Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            paddingBottom: "2.5rem",
            borderBottom: "2px solid #e2e8f0",
            marginBottom: "2.5rem",
          }}
        >
          {/* Agency Details */}
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.6rem",
                marginBottom: "0.5rem",
              }}
            >
              <div
                style={{
                  width: "38px",
                  height: "38px",
                  borderRadius: "8px",
                  backgroundColor: "#2563eb",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 800,
                  fontSize: "1.2rem",
                }}
              >
                T
              </div>
              <h1
                style={{
                  fontSize: "1.65rem",
                  fontWeight: 800,
                  letterSpacing: "-0.02em",
                  color: "#0f172a",
                }}
              >
                THER-INV AGENCY
              </h1>
            </div>
            <p style={{ fontSize: "0.875rem", color: "#475569" }}>
              Healthcare Staffing & Professional Payroll Services
            </p>
            <p style={{ fontSize: "0.85rem", color: "#64748b" }}>
              Email: contact@therina-agency.com | Phone: (305) 555-0100
            </p>
          </div>

          {/* Invoice Meta */}
          <div style={{ textAlign: "right" }}>
            <div
              style={{
                fontSize: "1.75rem",
                fontWeight: 800,
                color: "#2563eb",
                fontFamily: "var(--font-heading)",
              }}
            >
              {invoice.invoiceNumber}
            </div>

            <div style={{ marginTop: "0.4rem" }}>
              <span
                style={{
                  display: "inline-block",
                  padding: "0.25rem 0.75rem",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  borderRadius: "9999px",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  backgroundColor:
                    invoice.status === "paid"
                      ? "#ecfdf5"
                      : invoice.status === "pending"
                      ? "#fffbeb"
                      : "#f1f5f9",
                  color:
                    invoice.status === "paid"
                      ? "#059669"
                      : invoice.status === "pending"
                      ? "#d97706"
                      : "#64748b",
                  border: `1px solid ${
                    invoice.status === "paid"
                      ? "#a7f3d0"
                      : invoice.status === "pending"
                      ? "#fde68a"
                      : "#cbd5e1"
                  }`,
                }}
              >
                {invoice.status === "paid"
                  ? "PAID"
                  : invoice.status === "pending"
                  ? "PENDING PAYMENT"
                  : invoice.status === "draft"
                  ? "DRAFT"
                  : "CANCELLED"}
              </span>
            </div>

            <div style={{ marginTop: "0.75rem", fontSize: "0.85rem", color: "#475569" }}>
              <div>
                <strong>Issue Date:</strong> {formatDate(invoice.invoiceDate)}
              </div>
              <div style={{ marginTop: "0.2rem" }}>
                <strong>Due Date:</strong> {formatDate(invoice.dueDate)}
              </div>
            </div>
          </div>
        </div>

        {/* Client & Period Blocks */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "2rem",
            marginBottom: "2.5rem",
          }}
        >
          {/* Bill To */}
          <div
            style={{
              padding: "1.25rem",
              backgroundColor: "#f8fafc",
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
            }}
          >
            <div
              style={{
                fontSize: "0.75rem",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                fontWeight: 700,
                color: "#64748b",
                marginBottom: "0.4rem",
              }}
            >
              Billed To:
            </div>
            <div style={{ fontSize: "1.15rem", fontWeight: 700, color: "#0f172a" }}>
              {invoice.clientName}
            </div>
            {invoice.clientEmail && (
              <div style={{ fontSize: "0.875rem", color: "#475569", marginTop: "0.25rem" }}>
                {invoice.clientEmail}
              </div>
            )}
            {invoice.clientAddress && (
              <div style={{ fontSize: "0.875rem", color: "#475569", marginTop: "0.25rem" }}>
                {invoice.clientAddress}
              </div>
            )}
          </div>

          {/* Period Details */}
          <div
            style={{
              padding: "1.25rem",
              backgroundColor: "#f8fafc",
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
            }}
          >
            <div
              style={{
                fontSize: "0.75rem",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                fontWeight: 700,
                color: "#64748b",
                marginBottom: "0.4rem",
              }}
            >
              Weekly Payroll Period:
            </div>
            <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "#0f172a" }}>
              {formatDate(invoice.periodStart)} through {formatDate(invoice.periodEnd)}
            </div>
            <div style={{ fontSize: "0.85rem", color: "#475569", marginTop: "0.4rem" }}>
              Assigned Staff: <strong>{invoice.items?.length || 0} team members</strong>
            </div>
          </div>
        </div>

        {/* Breakdown Line Items Table */}
        <div style={{ marginBottom: "2.5rem" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              textAlign: "left",
              fontSize: "0.9rem",
            }}
          >
            <thead>
              <tr style={{ borderBottom: "2px solid #0f172a" }}>
                <th style={{ padding: "0.75rem 0.5rem", fontWeight: 700 }}>
                  Staff Member / Role
                </th>
                <th style={{ padding: "0.75rem 0.5rem", textAlign: "right" }}>
                  Reg. Hours
                </th>
                <th style={{ padding: "0.75rem 0.5rem", textAlign: "right" }}>
                  Reg. Rate
                </th>
                <th style={{ padding: "0.75rem 0.5rem", textAlign: "right" }}>
                  OT Hours
                </th>
                <th style={{ padding: "0.75rem 0.5rem", textAlign: "right" }}>
                  OT Rate
                </th>
                <th style={{ padding: "0.75rem 0.5rem", textAlign: "right" }}>
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {invoice.items?.map((it, idx) => (
                <tr key={idx} style={{ borderBottom: "1px solid #e2e8f0" }}>
                  <td style={{ padding: "0.85rem 0.5rem" }}>
                    <div style={{ fontWeight: 600, color: "#0f172a" }}>
                      {it.workerName}
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "#64748b" }}>
                      {it.role} {it.description ? `• ${it.description}` : ""}
                    </div>
                  </td>
                  <td style={{ padding: "0.85rem 0.5rem", textAlign: "right" }}>
                    {it.regularHours} hrs
                  </td>
                  <td style={{ padding: "0.85rem 0.5rem", textAlign: "right" }}>
                    {formatCurrency(it.regularRate)}
                  </td>
                  <td style={{ padding: "0.85rem 0.5rem", textAlign: "right" }}>
                    {it.overtimeHours ? `${it.overtimeHours} hrs` : "-"}
                  </td>
                  <td style={{ padding: "0.85rem 0.5rem", textAlign: "right" }}>
                    {it.overtimeHours ? formatCurrency(it.overtimeRate) : "-"}
                  </td>
                  <td
                    style={{
                      padding: "0.85rem 0.5rem",
                      textAlign: "right",
                      fontWeight: 700,
                      color: "#0f172a",
                    }}
                  >
                    {formatCurrency(it.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Financial Summary & Notes */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.2fr 1fr",
            gap: "2.5rem",
            alignItems: "flex-start",
          }}
        >
          {/* Notes & Terms */}
          <div>
            <div
              style={{
                fontSize: "0.75rem",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                fontWeight: 700,
                color: "#64748b",
                marginBottom: "0.4rem",
              }}
            >
              Notes & Terms:
            </div>
            <p
              style={{
                fontSize: "0.875rem",
                color: "#475569",
                lineHeight: 1.6,
                whiteSpace: "pre-line",
              }}
            >
              {invoice.notes ||
                "Thank you for your business. Please submit payment via wire transfer or ACH before the due date."}
            </p>
          </div>

          {/* Subtotals & Total */}
          <div
            style={{
              backgroundColor: "#f8fafc",
              padding: "1.25rem 1.5rem",
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "0.5rem",
                fontSize: "0.95rem",
                color: "#475569",
              }}
            >
              <span>Hours Subtotal:</span>
              <span style={{ fontWeight: 600, color: "#0f172a" }}>
                {formatCurrency(invoice.subtotal)}
              </span>
            </div>

            {invoice.taxRate > 0 && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "0.5rem",
                  fontSize: "0.95rem",
                  color: "#475569",
                }}
              >
                <span>Tax ({invoice.taxRate}%):</span>
                <span style={{ fontWeight: 600, color: "#0f172a" }}>
                  {formatCurrency(invoice.taxAmount)}
                </span>
              </div>
            )}

            <div
              style={{
                borderTop: "2px solid #cbd5e1",
                paddingTop: "0.75rem",
                marginTop: "0.5rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
              }}
            >
              <span style={{ fontSize: "1.1rem", fontWeight: 700, color: "#0f172a" }}>
                Total Due:
              </span>
              <span
                style={{
                  fontSize: "1.65rem",
                  fontWeight: 800,
                  color: "#2563eb",
                  fontFamily: "var(--font-heading)",
                }}
              >
                {formatCurrency(invoice.totalAmount)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
