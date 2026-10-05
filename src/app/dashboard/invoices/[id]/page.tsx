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
        if (!res.ok) throw new Error("Factura no encontrada");
        return res.json();
      })
      .then((data) => {
        if (data.invoice) setInvoice(data.invoice);
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
    return new Date(dateStr).toLocaleDateString("es-ES", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div style={{ padding: "4rem", textAlign: "center", color: "var(--text-muted)" }}>
        Cargando detalle de la factura...
      </div>
    );
  }

  if (!invoice) {
    return (
      <div style={{ textAlign: "center", padding: "4rem 1rem" }}>
        <h2 style={{ marginBottom: "1rem" }}>Factura no encontrada</h2>
        <Link href="/dashboard/invoices" className="btn btn-primary">
          <ArrowLeft size={16} /> Volver a facturas
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
          <ArrowLeft size={16} /> Volver al listado
        </Link>

        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          {/* Quick status dropdown */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
              Estado:
            </span>
            <select
              className="form-select"
              style={{ width: "auto", padding: "0.4rem 0.75rem", fontSize: "0.85rem" }}
              value={invoice.status}
              disabled={updatingStatus}
              onChange={(e) => handleStatusChange(e.target.value)}
            >
              <option value="draft">Borrador</option>
              <option value="pending">Pendiente</option>
              <option value="paid">Pagado</option>
              <option value="cancelled">Cancelado</option>
            </select>
          </div>

          <button
            onClick={handlePrint}
            id="print-invoice-btn"
            className="btn btn-primary btn-sm"
          >
            <Printer size={16} />
            <span>Imprimir / Descargar PDF</span>
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
              Servicios Profesionales de Personal & Nómina
            </p>
            <p style={{ fontSize: "0.85rem", color: "#64748b" }}>
              Email: contact@therina-agency.com | Tel: (305) 555-0100
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
                  ? "PAGADO"
                  : invoice.status === "pending"
                  ? "PENDIENTE DE PAGO"
                  : invoice.status === "draft"
                  ? "BORRADOR"
                  : "CANCELADO"}
              </span>
            </div>

            <div style={{ marginTop: "0.75rem", fontSize: "0.85rem", color: "#475569" }}>
              <div>
                <strong>Fecha Emisión:</strong> {formatDate(invoice.invoiceDate)}
              </div>
              <div style={{ marginTop: "0.2rem" }}>
                <strong>Vencimiento:</strong> {formatDate(invoice.dueDate)}
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
              Facturado A:
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
              Período de Nómina Semanal:
            </div>
            <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "#0f172a" }}>
              {formatDate(invoice.periodStart)} al {formatDate(invoice.periodEnd)}
            </div>
            <div style={{ fontSize: "0.85rem", color: "#475569", marginTop: "0.4rem" }}>
              Personal asignado: <strong>{invoice.items?.length || 0} trabajadores</strong>
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
                  Trabajador / Cargo
                </th>
                <th style={{ padding: "0.75rem 0.5rem", textAlign: "right" }}>
                  Horas Reg.
                </th>
                <th style={{ padding: "0.75rem 0.5rem", textAlign: "right" }}>
                  Tarifa
                </th>
                <th style={{ padding: "0.75rem 0.5rem", textAlign: "right" }}>
                  Horas Extra
                </th>
                <th style={{ padding: "0.75rem 0.5rem", textAlign: "right" }}>
                  Tarifa OT
                </th>
                <th style={{ padding: "0.75rem 0.5rem", textAlign: "right" }}>
                  Importe
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
              Notas y Términos:
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
                "Gracias por su preferencia. Favor emitir pago mediante transferencia bancaria antes de la fecha de vencimiento."}
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
              <span>Subtotal:</span>
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
                <span>Impuesto ({invoice.taxRate}%):</span>
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
                Total a Pagar:
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
