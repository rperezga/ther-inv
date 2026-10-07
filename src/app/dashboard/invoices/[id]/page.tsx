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
import { normalizeDateToMMDDYY } from "@/lib/calculations";

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
    <div style={{ maxWidth: "800px", margin: "0 auto" }}>
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

      {/* Invoice Document Canvas - Clean, Printable Sheet matching user's exact design */}
      <div
        className="card print-invoice-sheet"
        style={{
          padding: "2.75rem 4.5rem",
          backgroundColor: "#ffffff",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-md)",
          marginBottom: "3rem",
          color: "#000000",
          fontFamily: "'Arial', 'Helvetica', sans-serif",
          fontSize: "13px",
        }}
      >
        {/* Header Section: Left (Company name & phone), Right (INVOICE title & date) */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "2rem",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "1.75rem",
                fontWeight: 800,
                color: "#000000",
                letterSpacing: "-0.01em",
                marginBottom: "1rem",
              }}
            >
              AP Home care
            </div>
            <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#000000" }}>
              Phone 786 287-4540
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            <div
              style={{
                fontSize: "2.5rem",
                fontWeight: 900,
                color: "#000000",
                letterSpacing: "0.08em",
                lineHeight: 1,
                marginBottom: "1.25rem",
              }}
            >
              INVOICE
            </div>
            <div
              style={{
                fontSize: "1rem",
                fontWeight: 700,
                color: "#000000",
              }}
            >
              {invoice.invoiceDate
                ? new Date(invoice.invoiceDate).toLocaleDateString("en-US", {
                    month: "numeric",
                    day: "numeric",
                    year: "numeric",
                  })
                : new Date().toLocaleDateString("en-US")}
            </div>
          </div>
        </div>

        {/* Invoice # & Bill To */}
        <div style={{ marginBottom: "2rem" }}>
          {/* Invoice Number Row */}
          <div style={{ display: "flex", alignItems: "baseline", gap: "1rem", marginBottom: "1rem" }}>
            <span style={{ fontSize: "1rem", fontWeight: 800, color: "#000000" }}>
              INVOICE #
            </span>
            <span style={{ fontSize: "1rem", fontWeight: 700, color: "#000000" }}>
              {invoice.invoiceNumber || "75-62"}
              {invoice.items && invoice.items[0]?.workerName
                ? ` ${invoice.items[0].workerName.split(" ")[0].toLowerCase()}`
                : ""}
            </span>
          </div>

          {/* Bill To Box */}
          <div style={{ maxWidth: "340px", lineHeight: "1.35" }}>
            <div style={{ fontSize: "1rem", fontWeight: 800, color: "#000000", marginBottom: "0.2rem" }}>
              Bill To:
            </div>
            <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#000000", textTransform: "uppercase" }}>
              {invoice.clientName || "ALC HOME HEALTH"}
            </div>
            <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "#000000", textTransform: "uppercase" }}>
              {invoice.clientAddress || "1916 NW 84 AVE"}
            </div>
            <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "#000000", textTransform: "uppercase" }}>
              DORAL, FLORIDA 33126
            </div>
          </div>
        </div>

        {/* Exact Grid Table */}
        <div style={{ marginBottom: "1.5rem" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              border: "1.5px solid #000000",
              fontSize: "11px",
              fontWeight: 700,
            }}
          >
            <thead>
              <tr style={{ backgroundColor: "#ffffff" }}>
                <th
                  style={{
                    border: "1.5px solid #000000",
                    padding: "5px 8px",
                    textAlign: "left",
                    fontWeight: 800,
                    fontSize: "11px",
                    letterSpacing: "0.03em",
                  }}
                >
                  PATIENT NAME
                </th>
                <th
                  style={{
                    border: "1.5px solid #000000",
                    padding: "5px 8px",
                    width: "70px",
                    textAlign: "center",
                    fontWeight: 800,
                    fontSize: "11px",
                    letterSpacing: "0.03em",
                  }}
                >
                  DATE
                </th>
                <th
                  style={{
                    border: "1.5px solid #000000",
                    padding: "5px 8px",
                    width: "110px",
                    textAlign: "left",
                    fontWeight: 800,
                    fontSize: "11px",
                    letterSpacing: "0.03em",
                  }}
                >
                  SERVICE
                </th>
                <th
                  style={{
                    border: "1.5px solid #000000",
                    padding: "5px 8px",
                    width: "75px",
                    textAlign: "right",
                    fontWeight: 800,
                    fontSize: "11px",
                    letterSpacing: "0.03em",
                  }}
                >
                  RATE
                </th>
                <th
                  style={{
                    border: "1.5px solid #000000",
                    padding: "5px 8px",
                    width: "45px",
                    textAlign: "center",
                    fontWeight: 800,
                    fontSize: "11px",
                    letterSpacing: "0.03em",
                  }}
                >
                  QTY
                </th>
                <th
                  style={{
                    border: "1.5px solid #000000",
                    padding: "5px 8px",
                    width: "85px",
                    textAlign: "right",
                    fontWeight: 800,
                    fontSize: "11px",
                    letterSpacing: "0.03em",
                  }}
                >
                  AMOUNT
                </th>
              </tr>
            </thead>
            <tbody>
              {/* Existing items */}
              {invoice.items?.map((it, idx) => {
                // Format date cleanly in standard MM/DD/YY (e.g. 09/28/26)
                let visitDateFormatted = "-";
                if (it.visitDate) {
                  visitDateFormatted = normalizeDateToMMDDYY(it.visitDate);
                } else if (invoice.periodStart) {
                  visitDateFormatted = normalizeDateToMMDDYY(invoice.periodStart);
                }

                // Clean patient name - strip out "PATIENT:" or service prefixes if stored in description
                let rawPatient = it.patientName || "";
                if (!rawPatient && it.description) {
                  const parts = it.description.split(/PATIENT:\s*/i);
                  rawPatient = parts.length > 1 ? parts[1] : it.description;
                }
                rawPatient = rawPatient.replace(/^PATIENT:\s*/i, "").trim().toUpperCase();

                // Extract service code
                let rawService = it.serviceType || "";
                if (!rawService && it.description) {
                  const match = it.description.match(/^([A-Za-z0-9\s]+?)\s*-\s*Patient/i);
                  if (match && match[1]) rawService = match[1].trim();
                }
                const displayService = (rawService || "SOC").toUpperCase();

                return (
                  <tr key={idx} style={{ height: "22px" }}>
                    <td
                      style={{
                        border: "1.5px solid #000000",
                        padding: "2px 8px",
                        textAlign: "left",
                        textTransform: "uppercase",
                      }}
                    >
                      {rawPatient}
                    </td>
                    <td
                      style={{
                        border: "1.5px solid #000000",
                        padding: "2px 8px",
                        textAlign: "center",
                        fontSize: "11px",
                      }}
                    >
                      {visitDateFormatted}
                    </td>
                    <td
                      style={{
                        border: "1.5px solid #000000",
                        padding: "2px 8px",
                        textAlign: "left",
                        textTransform: "uppercase",
                      }}
                    >
                      {displayService}
                    </td>
                    <td
                      style={{
                        border: "1.5px solid #000000",
                        padding: "2px 8px",
                        textAlign: "right",
                      }}
                    >
                      {(Number(it.regularRate) || 0).toFixed(2)}
                    </td>
                    <td
                      style={{
                        border: "1.5px solid #000000",
                        padding: "2px 8px",
                        textAlign: "center",
                      }}
                    >
                      {it.regularHours || 1}
                    </td>
                    <td
                      style={{
                        border: "1.5px solid #000000",
                        padding: "2px 8px",
                        textAlign: "right",
                      }}
                    >
                      {(Number(it.amount) || 0).toFixed(2)}
                    </td>
                  </tr>
                );
              })}

              {/* Blank filler rows to match exact ledger layout (minimum 25 rows) */}
              {Array.from({
                length: Math.max(0, 24 - (invoice.items?.length || 0)),
              }).map((_, emptyIdx) => (
                <tr key={`empty-${emptyIdx}`} style={{ height: "22px" }}>
                  <td style={{ border: "1.5px solid #000000", padding: "2px 8px" }}>&nbsp;</td>
                  <td style={{ border: "1.5px solid #000000", padding: "2px 8px" }}>&nbsp;</td>
                  <td style={{ border: "1.5px solid #000000", padding: "2px 8px" }}>&nbsp;</td>
                  <td style={{ border: "1.5px solid #000000", padding: "2px 8px" }}>&nbsp;</td>
                  <td style={{ border: "1.5px solid #000000", padding: "2px 8px" }}>&nbsp;</td>
                  <td
                    style={{
                      border: "1.5px solid #000000",
                      padding: "2px 8px",
                      textAlign: "center",
                      color: "#000000",
                    }}
                  >
                    -
                  </td>
                </tr>
              ))}

              {/* TOTAL ROW */}
              <tr style={{ height: "26px", fontWeight: 800 }}>
                <td
                  style={{
                    border: "1.5px solid #000000",
                    padding: "4px 8px",
                    textAlign: "center",
                    fontSize: "12px",
                  }}
                >
                  TOTAL
                </td>
                <td style={{ border: "1.5px solid #000000", padding: "4px 8px" }}>&nbsp;</td>
                <td style={{ border: "1.5px solid #000000", padding: "4px 8px" }}>&nbsp;</td>
                <td style={{ border: "1.5px solid #000000", padding: "4px 8px" }}>&nbsp;</td>
                <td
                  style={{
                    border: "1.5px solid #000000",
                    padding: "4px 8px",
                    textAlign: "center",
                    fontSize: "12px",
                  }}
                >
                  {invoice.items?.reduce(
                    (acc, it) => acc + (Number(it.regularHours) || 1),
                    0
                  ) || 0}
                </td>
                <td
                  style={{
                    border: "1.5px solid #000000",
                    padding: "4px 8px",
                    textAlign: "right",
                    fontSize: "12px",
                  }}
                >
                  {new Intl.NumberFormat("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }).format(invoice.totalAmount || 0)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
