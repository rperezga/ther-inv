"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  Trash2,
  Calendar,
  DollarSign,
  ArrowLeft,
  Save,
  CheckCircle,
  AlertCircle,
  Clock,
  UserCheck,
} from "lucide-react";
import { IWorker } from "@/lib/types";

interface InvoiceLineItem {
  workerId?: string;
  workerName: string;
  role: string;
  regularHours: number;
  regularRate: number;
  overtimeHours: number;
  overtimeRate: number;
  description: string;
  amount: number;
}

export default function NewInvoicePage() {
  const router = useRouter();

  const [workers, setWorkers] = useState<IWorker[]>([]);
  const [loadingWorkers, setLoadingWorkers] = useState(true);

  // Form State
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientAddress, setClientAddress] = useState("");

  // Dates
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [dueDate, setDueDate] = useState("");

  const [items, setItems] = useState<InvoiceLineItem[]>([]);
  const [taxRate, setTaxRate] = useState<number>(0);
  const [notes, setNotes] = useState(
    "Factura correspondiente a servicios semanales de personal de salud / cuidado. Favor transferir o emitir pago dentro del plazo estipulado."
  );

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Set default weekly dates (Last Monday to Sunday)
  useEffect(() => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 is Sunday, 1 is Monday...
    const diffToMonday = (dayOfWeek + 6) % 7;

    const lastMonday = new Date(today);
    lastMonday.setDate(today.getDate() - diffToMonday - 7);

    const lastSunday = new Date(lastMonday);
    lastSunday.setDate(lastMonday.getDate() + 6);

    const due = new Date(today);
    due.setDate(today.getDate() + 14);

    setPeriodStart(lastMonday.toISOString().split("T")[0]);
    setPeriodEnd(lastSunday.toISOString().split("T")[0]);
    setInvoiceDate(today.toISOString().split("T")[0]);
    setDueDate(due.toISOString().split("T")[0]);

    // Fetch Workers
    fetch("/api/workers?status=active")
      .then((res) => res.json())
      .then((data) => {
        if (data.workers) {
          setWorkers(data.workers);
        }
      })
      .catch((err) => console.error("Error loading workers:", err))
      .finally(() => setLoadingWorkers(false));
  }, []);

  // Set date preset helpers
  const applyWeeklyPreset = (type: "last-week" | "current-week") => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diffToMonday = (dayOfWeek + 6) % 7;

    const start = new Date(today);
    if (type === "last-week") {
      start.setDate(today.getDate() - diffToMonday - 7);
    } else {
      start.setDate(today.getDate() - diffToMonday);
    }

    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    setPeriodStart(start.toISOString().split("T")[0]);
    setPeriodEnd(end.toISOString().split("T")[0]);
  };

  // Add Item
  const handleAddWorkerItem = (workerId?: string) => {
    if (workerId) {
      const selectedWorker = workers.find((w) => w._id === workerId);
      if (selectedWorker) {
        const regRate = selectedWorker.hourlyRate || 35;
        const otRate = Math.round(regRate * 1.5 * 100) / 100;

        setItems((prev) => [
          ...prev,
          {
            workerId: selectedWorker._id,
            workerName: `${selectedWorker.firstName} ${selectedWorker.lastName}`,
            role: selectedWorker.role,
            regularHours: 40,
            regularRate: regRate,
            overtimeHours: 0,
            overtimeRate: otRate,
            description: `Turno semanal - ${selectedWorker.role}`,
            amount: 40 * regRate,
          },
        ]);
        return;
      }
    }

    // Default blank item
    setItems((prev) => [
      ...prev,
      {
        workerName: "",
        role: "Servicios Generales",
        regularHours: 40,
        regularRate: 35,
        overtimeHours: 0,
        overtimeRate: 52.5,
        description: "Servicios semanales de personal",
        amount: 40 * 35,
      },
    ]);
  };

  // Update item field
  const updateItem = (index: number, field: keyof InvoiceLineItem, value: any) => {
    setItems((prev) => {
      const next = [...prev];
      const item = { ...next[index], [field]: value };

      // Recalculate amount if hours or rates change
      if (
        field === "regularHours" ||
        field === "regularRate" ||
        field === "overtimeHours" ||
        field === "overtimeRate"
      ) {
        const regH = Number(field === "regularHours" ? value : item.regularHours) || 0;
        const regR = Number(field === "regularRate" ? value : item.regularRate) || 0;
        const otH = Number(field === "overtimeHours" ? value : item.overtimeHours) || 0;
        const otR = Number(field === "overtimeRate" ? value : item.overtimeRate) || 0;
        item.amount = Math.round((regH * regR + otH * otR) * 100) / 100;
      }

      next[index] = item;
      return next;
    });
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Calculations
  const subtotal = items.reduce((sum, it) => sum + (it.amount || 0), 0);
  const taxAmount = Math.round(((subtotal * taxRate) / 100) * 100) / 100;
  const totalAmount = Math.round((subtotal + taxAmount) * 100) / 100;

  const handleSubmit = async (targetStatus: "draft" | "pending") => {
    setError("");

    if (!clientName.trim()) {
      setError("Por favor ingresa el nombre del cliente o centro");
      return;
    }

    if (!periodStart || !periodEnd) {
      setError("Por favor define las fechas de inicio y fin del ciclo semanal");
      return;
    }

    if (items.length === 0) {
      setError("Debes añadir al menos un trabajador o servicio a la factura semanal");
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        invoiceNumber: invoiceNumber.trim() || undefined,
        clientName: clientName.trim(),
        clientEmail: clientEmail.trim(),
        clientAddress: clientAddress.trim(),
        periodStart,
        periodEnd,
        invoiceDate,
        dueDate,
        items,
        taxRate,
        status: targetStatus,
        notes,
      };

      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al crear factura");
      }

      router.push(`/dashboard/invoices/${data.invoice._id}`);
    } catch (err: any) {
      setError(err.message || "Error al procesar la factura");
      setSubmitting(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(val || 0);
  };

  return (
    <div style={{ maxWidth: "1150px", margin: "0 auto" }}>
      {/* Back button & Title */}
      <div style={{ marginBottom: "1.5rem" }}>
        <Link
          href="/dashboard/invoices"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
            color: "var(--text-muted)",
            fontSize: "0.875rem",
            marginBottom: "0.75rem",
          }}
        >
          <ArrowLeft size={16} /> Volver a facturas
        </Link>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          <div>
            <h1 style={{ fontSize: "1.75rem", marginBottom: "0.25rem" }}>
              Generar Invoice Semanal
            </h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
              Crea la factura detallada por horas de personal para el cliente y el payroll.
            </p>
          </div>

          {/* Preset Buttons */}
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              type="button"
              onClick={() => applyWeeklyPreset("last-week")}
              className="btn btn-secondary btn-sm"
            >
              <Calendar size={15} /> Semana Pasada
            </button>
            <button
              type="button"
              onClick={() => applyWeeklyPreset("current-week")}
              className="btn btn-secondary btn-sm"
            >
              <Calendar size={15} /> Semana Actual
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div
          style={{
            backgroundColor: "var(--danger-subtle)",
            color: "var(--danger)",
            border: "1px solid var(--danger-border)",
            borderRadius: "var(--radius-md)",
            padding: "0.75rem 1.25rem",
            marginBottom: "1.5rem",
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
          }}
        >
          <AlertCircle size={20} />
          <span style={{ fontWeight: 500 }}>{error}</span>
        </div>
      )}

      {/* Invoice Card Form */}
      <div className="card" style={{ marginBottom: "2rem" }}>
        {/* Client & Period Header */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "1.5rem",
            paddingBottom: "1.75rem",
            borderBottom: "1px solid var(--border-color)",
            marginBottom: "1.75rem",
          }}
        >
          {/* Client Information */}
          <div>
            <h3 style={{ fontSize: "1.05rem", marginBottom: "1rem", color: "var(--primary)" }}>
              1. Datos del Cliente / Centro Médico
            </h3>

            <div className="form-group">
              <label className="form-label" htmlFor="client-name">
                Nombre del Cliente o Centro *
              </label>
              <input
                id="client-name"
                type="text"
                required
                className="form-input"
                placeholder="Ej. Metropolitan Healthcare Center"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="client-email">
                Correo de Facturación / Contacto
              </label>
              <input
                id="client-email"
                type="email"
                className="form-input"
                placeholder="billing@cliente.com"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="client-address">
                Dirección del Centro
              </label>
              <input
                id="client-address"
                type="text"
                className="form-input"
                placeholder="Dirección, Ciudad, Estado"
                value={clientAddress}
                onChange={(e) => setClientAddress(e.target.value)}
              />
            </div>
          </div>

          {/* Invoice Dates & Details */}
          <div>
            <h3 style={{ fontSize: "1.05rem", marginBottom: "1rem", color: "var(--primary)" }}>
              2. Período Semanal y Fechas
            </h3>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "1rem",
              }}
            >
              <div className="form-group">
                <label className="form-label" htmlFor="period-start">
                  Inicio de Semana *
                </label>
                <input
                  id="period-start"
                  type="date"
                  required
                  className="form-input"
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="period-end">
                  Fin de Semana *
                </label>
                <input
                  id="period-end"
                  type="date"
                  required
                  className="form-input"
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                />
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "1rem",
              }}
            >
              <div className="form-group">
                <label className="form-label" htmlFor="invoice-date">
                  Fecha del Invoice
                </label>
                <input
                  id="invoice-date"
                  type="date"
                  className="form-input"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="due-date">
                  Fecha Vencimiento *
                </label>
                <input
                  id="due-date"
                  type="date"
                  required
                  className="form-input"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="invoice-num">
                No. Factura (Dejar vacío para correlativo automático)
              </label>
              <input
                id="invoice-num"
                type="text"
                className="form-input"
                placeholder={`INV-${new Date().getFullYear()}-XXXX`}
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Section 3: Workers & Hours Line Items */}
        <div style={{ marginBottom: "2rem" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "1rem",
              marginBottom: "1rem",
            }}
          >
            <div>
              <h3 style={{ fontSize: "1.1rem", color: "var(--primary)" }}>
                3. Trabajadores y Horas de Nómina
              </h3>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                Selecciona los miembros del equipo que laboraron esta semana o añade líneas manuales.
              </p>
            </div>

            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              {/* Select worker dropdown shortcut */}
              <select
                className="form-select"
                style={{ width: "auto", minWidth: "210px" }}
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) {
                    handleAddWorkerItem(e.target.value);
                    e.target.value = "";
                  }
                }}
              >
                <option value="" disabled>
                  + Añadir Trabajador de Agencia...
                </option>
                {workers.map((w) => (
                  <option key={w._id} value={w._id}>
                    {w.firstName} {w.lastName} ({w.role} - ${w.hourlyRate}/h)
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => handleAddWorkerItem()}
                className="btn btn-secondary btn-sm"
              >
                <Plus size={16} /> Línea Manual
              </button>
            </div>
          </div>

          {items.length === 0 ? (
            <div
              style={{
                border: "2px dashed var(--border-color)",
                borderRadius: "var(--radius-md)",
                padding: "2.5rem 1.5rem",
                textAlign: "center",
                backgroundColor: "var(--bg-subtle)",
              }}
            >
              <UserCheck size={36} color="var(--primary)" style={{ opacity: 0.6, marginBottom: "0.5rem" }} />
              <p style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                No hay trabajadores en esta factura
              </p>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
                Usa el selector arriba para agregar al personal que trabajó esta semana.
              </p>
            </div>
          ) : (
            <div className="table-container" style={{ marginBottom: "1rem" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: "22%" }}>Trabajador / Profesional</th>
                    <th style={{ width: "16%" }}>Rol / Cargo</th>
                    <th style={{ width: "11%" }}>Horas Reg.</th>
                    <th style={{ width: "11%" }}>Tarifa Reg.</th>
                    <th style={{ width: "11%" }}>Horas Extra</th>
                    <th style={{ width: "11%" }}>Tarifa Extra</th>
                    <th style={{ width: "13%" }}>Subtotal</th>
                    <th style={{ width: "5%" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, idx) => (
                    <tr key={idx}>
                      <td>
                        <input
                          type="text"
                          className="form-input"
                          style={{ padding: "0.45rem 0.6rem", fontSize: "0.875rem" }}
                          placeholder="Nombre del trabajador"
                          value={it.workerName}
                          onChange={(e) => updateItem(idx, "workerName", e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          className="form-input"
                          style={{ padding: "0.45rem 0.6rem", fontSize: "0.875rem" }}
                          placeholder="Ej. RN, PT, CNA"
                          value={it.role}
                          onChange={(e) => updateItem(idx, "role", e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          className="form-input"
                          style={{ padding: "0.45rem 0.6rem", fontSize: "0.875rem", textAlign: "right" }}
                          value={it.regularHours}
                          onChange={(e) =>
                            updateItem(idx, "regularHours", parseFloat(e.target.value) || 0)
                          }
                        />
                      </td>
                      <td>
                        <div style={{ position: "relative" }}>
                          <span
                            style={{
                              position: "absolute",
                              left: "6px",
                              top: "50%",
                              transform: "translateY(-50%)",
                              fontSize: "0.8rem",
                              color: "var(--text-muted)",
                            }}
                          >
                            $
                          </span>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            className="form-input"
                            style={{
                              padding: "0.45rem 0.4rem 0.45rem 1.2rem",
                              fontSize: "0.875rem",
                              textAlign: "right",
                            }}
                            value={it.regularRate}
                            onChange={(e) =>
                              updateItem(idx, "regularRate", parseFloat(e.target.value) || 0)
                            }
                          />
                        </div>
                      </td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          className="form-input"
                          style={{ padding: "0.45rem 0.6rem", fontSize: "0.875rem", textAlign: "right" }}
                          value={it.overtimeHours}
                          onChange={(e) =>
                            updateItem(idx, "overtimeHours", parseFloat(e.target.value) || 0)
                          }
                        />
                      </td>
                      <td>
                        <div style={{ position: "relative" }}>
                          <span
                            style={{
                              position: "absolute",
                              left: "6px",
                              top: "50%",
                              transform: "translateY(-50%)",
                              fontSize: "0.8rem",
                              color: "var(--text-muted)",
                            }}
                          >
                            $
                          </span>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            className="form-input"
                            style={{
                              padding: "0.45rem 0.4rem 0.45rem 1.2rem",
                              fontSize: "0.875rem",
                              textAlign: "right",
                            }}
                            value={it.overtimeRate}
                            onChange={(e) =>
                              updateItem(idx, "overtimeRate", parseFloat(e.target.value) || 0)
                            }
                          />
                        </div>
                      </td>
                      <td style={{ fontWeight: 700, textAlign: "right", fontSize: "0.95rem" }}>
                        {formatCurrency(it.amount)}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          style={{ color: "var(--danger)", padding: "0.3rem" }}
                          title="Eliminar fila"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Section 4: Totals and Notes */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "2rem",
            paddingTop: "1.5rem",
            borderTop: "1px solid var(--border-color)",
          }}
        >
          {/* Notes */}
          <div>
            <label className="form-label" htmlFor="invoice-notes">
              Notas y Condiciones de Pago
            </label>
            <textarea
              id="invoice-notes"
              className="form-textarea"
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Instrucciones para la transferencia o términos..."
            />
          </div>

          {/* Financial Calculation Box */}
          <div
            style={{
              backgroundColor: "var(--bg-subtle)",
              borderRadius: "var(--radius-md)",
              padding: "1.5rem",
              border: "1px solid var(--border-color)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "0.75rem",
                fontSize: "0.95rem",
              }}
            >
              <span style={{ color: "var(--text-secondary)" }}>Subtotal Horas:</span>
              <span style={{ fontWeight: 600 }}>{formatCurrency(subtotal)}</span>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "0.75rem",
                fontSize: "0.95rem",
              }}
            >
              <span style={{ color: "var(--text-secondary)" }}>Impuesto / Tax (%):</span>
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                className="form-input"
                style={{ width: "80px", textAlign: "right", padding: "0.35rem 0.5rem" }}
                value={taxRate}
                onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
              />
            </div>

            {taxRate > 0 && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "0.75rem",
                  fontSize: "0.95rem",
                }}
              >
                <span style={{ color: "var(--text-secondary)" }}>Monto de Impuesto:</span>
                <span style={{ fontWeight: 600 }}>{formatCurrency(taxAmount)}</span>
              </div>
            )}

            <div
              style={{
                borderTop: "2px solid var(--border-color)",
                paddingTop: "0.75rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
              }}
            >
              <span style={{ fontSize: "1.1rem", fontWeight: 700 }}>Total a Cobrar:</span>
              <span
                style={{
                  fontSize: "1.6rem",
                  fontWeight: 800,
                  color: "var(--primary)",
                  fontFamily: "var(--font-heading)",
                }}
              >
                {formatCurrency(totalAmount)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: "1rem",
          marginBottom: "3rem",
        }}
      >
        <button
          type="button"
          disabled={submitting}
          onClick={() => handleSubmit("draft")}
          className="btn btn-secondary"
        >
          <Save size={18} /> Guardar Borrador
        </button>

        <button
          type="button"
          disabled={submitting}
          id="submit-invoice-btn"
          onClick={() => handleSubmit("pending")}
          className="btn btn-primary"
          style={{ padding: "0.85rem 1.8rem", fontSize: "1rem" }}
        >
          {submitting ? "Generando Factura..." : "Emitir Factura Semanal"}
          {!submitting && <CheckCircle size={18} />}
        </button>
      </div>
    </div>
  );
}
