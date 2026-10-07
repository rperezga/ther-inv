"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FileText,
  Shield,
  User,
  Eye,
  Printer,
  Download,
  Calendar,
  Layers,
  Search,
} from "lucide-react";
import { IInvoice, IUser } from "@/lib/types";
import { formatCurrency } from "@/lib/calculations";

export default function ViewerPortalPage() {
  const [user, setUser] = useState<IUser | null>(null);
  const [invoices, setInvoices] = useState<IInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.user) setUser(data.user);
      })
      .catch((err) => console.error(err));

    fetchSubmittedInvoices();
  }, []);

  const fetchSubmittedInvoices = async () => {
    setLoading(true);
    try {
      // The API endpoint automatically filters out drafts for viewer role
      const res = await fetch("/api/invoices");
      const data = await res.json();
      if (res.ok) {
        setInvoices(data.invoices || []);
      }
    } catch (err) {
      console.error("Error loading submitted invoices:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (d?: string | Date) => {
    if (!d) return "-";
    return new Date(d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleDirectPrint = (id: string) => {
    window.open(`/dashboard/invoices/${id}?print=true`, "_blank");
  };

  const filteredInvoices = invoices.filter((inv) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    const invNum = inv.invoiceNumber.toLowerCase();
    const client = inv.clientName.toLowerCase();
    const agent = (inv.items?.[0]?.workerName || "").toLowerCase();
    return invNum.includes(term) || client.includes(term) || agent.includes(term);
  });

  return (
    <div style={{ width: "100%", maxWidth: "100%" }}>
      {/* Header */}
      <div style={{ marginBottom: "1.25rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "1.6rem", fontWeight: 800, marginBottom: "0.2rem" }}>
            Viewer Portal • Submitted Invoices
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem" }}>
            Review, download, and print official invoices submitted by management.
          </p>
        </div>

        {/* Search */}
        <div style={{ position: "relative", minWidth: "260px" }}>
          <input
            type="text"
            className="form-input"
            placeholder="Search submitted invoices..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: "2.2rem", height: "36px", fontSize: "0.85rem" }}
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
            Loading submitted invoices...
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div style={{ padding: "3.5rem 1.5rem", textAlign: "center" }}>
            <FileText size={48} style={{ opacity: 0.35, marginBottom: "1rem" }} />
            <p style={{ fontWeight: 600, fontSize: "1.1rem" }}>
              No submitted invoices available
            </p>
            <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", maxWidth: "480px", margin: "0 auto" }}>
              Invoices are managed and prepared as drafts by management (Therina). Once an invoice is submitted, it will immediately appear here for your review.
            </p>
          </div>
        ) : (
          <div className="table-container" style={{ border: "none" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Lot / Cycle</th>
                  <th>Clinical Agent</th>
                  <th>Agency</th>
                  <th>Period</th>
                  <th>Issue Date</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((inv) => {
                  const agent = inv.items?.[0]?.workerName || "Agent Staff";
                  const lotInfo = (inv as any).lotId;

                  return (
                    <tr key={inv._id}>
                      {/* Invoice # */}
                      <td style={{ fontWeight: 700, color: "var(--primary)", whiteSpace: "nowrap" }}>
                        <Link href={`/dashboard/invoices/${inv._id}`}>
                          {inv.invoiceNumber}
                        </Link>
                      </td>

                      {/* Lot / Cycle */}
                      <td>
                        <span
                          style={{
                            fontSize: "0.75rem",
                            backgroundColor: "#f1f5f9",
                            color: "#334155",
                            padding: "0.2rem 0.5rem",
                            borderRadius: "4px",
                            fontWeight: 700,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.25rem",
                            whiteSpace: "nowrap",
                          }}
                        >
                          <Layers size={11} color="var(--primary)" />
                          {lotInfo?.lotCode || (inv.lotNumber ? `LOT-${String(inv.lotNumber).padStart(2, "0")}` : "LOT-01")}
                        </span>
                      </td>

                      {/* Agent */}
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                          <User size={14} color="var(--primary)" />
                          <span style={{ fontWeight: 600 }}>{agent}</span>
                        </div>
                      </td>

                      {/* Agency */}
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
                      <td>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            padding: "0.2rem 0.6rem",
                            borderRadius: "9999px",
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            backgroundColor: "#eff6ff",
                            color: "#1d4ed8",
                            border: "1px solid #bfdbfe",
                          }}
                        >
                          {inv.status === "paid" ? "PAID" : "SUBMITTED"}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                        <div style={{ display: "inline-flex", gap: "0.35rem", alignItems: "center" }}>
                          <Link
                            href={`/dashboard/invoices/${inv._id}`}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: "0.35rem 0.55rem" }}
                            title="View Invoice"
                          >
                            <Eye size={14} />
                            <span style={{ fontSize: "0.78rem" }}>View</span>
                          </Link>

                          <button
                            onClick={() => handleDirectPrint(inv._id!)}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: "0.35rem 0.55rem" }}
                            title="Download PDF"
                          >
                            <Download size={14} />
                            <span style={{ fontSize: "0.78rem" }}>Download</span>
                          </button>

                          <button
                            onClick={() => handleDirectPrint(inv._id!)}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: "0.35rem 0.55rem" }}
                            title="Print Invoice"
                          >
                            <Printer size={14} />
                            <span style={{ fontSize: "0.78rem" }}>Print</span>
                          </button>
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
    </div>
  );
}
