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
    "Weekly agency invoice corresponding to healthcare professional services. Net 14 payment terms. Please submit payment via wire transfer or ACH."
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
            description: `Weekly shift - ${selectedWorker.role}`,
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
        role: "General Healthcare Services",
        regularHours: 40,
        regularRate: 35,
        overtimeHours: 0,
        overtimeRate: 52.5,
        description: "Weekly clinical shifts",
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
      setError("Please enter the client or healthcare facility name");
      return;
    }

    if (!periodStart || !periodEnd) {
      setError("Please define the weekly payroll start and end dates");
      return;
    }

    if (items.length === 0) {
      setError("Please add at least one staff member or service to the invoice");
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
        throw new Error(data.error || "Failed to create invoice");
      }

      router.push(`/dashboard/invoices/${data.invoice._id}`);
    } catch (err: any) {
      setError(err.message || "Failed to process invoice");
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
          <ArrowLeft size={16} /> Back to invoices
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
              Generate Weekly Invoice
            </h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
              Create an itemized client bill based on staff hours for this weekly payroll cycle.
            </p>
          </div>

          {/* Preset Buttons */}
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              type="button"
              onClick={() => applyWeeklyPreset("last-week")}
              className="btn btn-secondary btn-sm"
            >
              <Calendar size={15} /> Last Week
            </button>
            <button
              type="button"
              onClick={() => applyWeeklyPreset("current-week")}
              className="btn btn-secondary btn-sm"
            >
              <Calendar size={15} /> Current Week
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
              1. Client / Healthcare Facility Details
            </h3>

            <div className="form-group">
              <label className="form-label" htmlFor="client-name">
                Client or Facility Name *
              </label>
              <input
                id="client-name"
                type="text"
                required
                className="form-input"
                placeholder="e.g. Metropolitan Healthcare Center"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="client-email">
                Billing Contact Email
              </label>
              <input
                id="client-email"
                type="email"
                className="form-input"
                placeholder="billing@facility.com"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="client-address">
                Facility Address
              </label>
              <input
                id="client-address"
                type="text"
                className="form-input"
                placeholder="Address, City, State, Zip Code"
                value={clientAddress}
                onChange={(e) => setClientAddress(e.target.value)}
              />
            </div>
          </div>

          {/* Invoice Dates & Details */}
          <div>
            <h3 style={{ fontSize: "1.05rem", marginBottom: "1rem", color: "var(--primary)" }}>
              2. Weekly Period & Billing Dates
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
                  Week Start Date *
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
                  Week End Date *
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
                  Invoice Date
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
                  Payment Due Date *
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
                Invoice # (Leave empty for auto-generated sequence)
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
                3. Agency Staff & Payroll Hours
              </h3>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                Select agency team members who worked shifts this week or add custom service lines.
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
                  + Add Agency Staff Member...
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
                <Plus size={16} /> Manual Line
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
                No staff members added to this invoice yet
              </p>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
                Use the dropdown above to add team members who worked this week.
              </p>
            </div>
          ) : (
            <div className="table-container" style={{ marginBottom: "1rem" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: "22%" }}>Staff Member</th>
                    <th style={{ width: "16%" }}>Role / Title</th>
                    <th style={{ width: "11%" }}>Reg. Hours</th>
                    <th style={{ width: "11%" }}>Reg. Rate</th>
                    <th style={{ width: "11%" }}>OT Hours</th>
                    <th style={{ width: "11%" }}>OT Rate</th>
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
                          placeholder="Staff member name"
                          value={it.workerName}
                          onChange={(e) => updateItem(idx, "workerName", e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          className="form-input"
                          style={{ padding: "0.45rem 0.6rem", fontSize: "0.875rem" }}
                          placeholder="e.g. RN, PT, CNA"
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
                          title="Remove line item"
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
              Payment Terms & Notes
            </label>
            <textarea
              id="invoice-notes"
              className="form-textarea"
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Payment instructions, bank wire details, or notes..."
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
              <span style={{ color: "var(--text-secondary)" }}>Hours Subtotal:</span>
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
              <span style={{ color: "var(--text-secondary)" }}>Tax Rate (%):</span>
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
                <span style={{ color: "var(--text-secondary)" }}>Tax Amount:</span>
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
              <span style={{ fontSize: "1.1rem", fontWeight: 700 }}>Total Billed:</span>
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
          <Save size={18} /> Save Draft
        </button>

        <button
          type="button"
          disabled={submitting}
          id="submit-invoice-btn"
          onClick={() => handleSubmit("pending")}
          className="btn btn-primary"
          style={{ padding: "0.85rem 1.8rem", fontSize: "1rem" }}
        >
          {submitting ? "Generating Invoice..." : "Issue Weekly Invoice"}
          {!submitting && <CheckCircle size={18} />}
        </button>
      </div>
    </div>
  );
}
