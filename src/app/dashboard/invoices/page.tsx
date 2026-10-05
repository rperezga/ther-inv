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
} from "lucide-react";
import { IInvoice } from "@/lib/types";

export default function InvoicesListPage() {
  const [invoices, setInvoices] = useState<IInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const url = new URL("/api/invoices", window.location.origin);
      if (statusFilter !== "all") url.searchParams.set("status", statusFilter);
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
    fetchInvoices();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchInvoices();
  };

  const handleDelete = async (id: string, invoiceNum: string) => {
    if (!confirm(`Are you sure you want to delete invoice ${invoiceNum}?`)) {
      return;
    }

    setDeletingId(id);
    try {
      const res = await fetch(`/api/invoices/${id}`, { method: "DELETE" });
      if (res.ok) {
        setInvoices((prev) => prev.filter((inv) => inv._id !== id));
      } else {
        alert("Failed to delete invoice");
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <span className="badge badge-paid">Paid</span>;
      case "pending":
        return <span className="badge badge-pending">Pending</span>;
      case "draft":
        return <span className="badge badge-draft">Draft</span>;
      case "cancelled":
        return <span className="badge badge-cancelled">Cancelled</span>;
      default:
        return <span className="badge">{status}</span>;
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
          marginBottom: "1.75rem",
        }}
      >
        <div>
          <h1 style={{ fontSize: "1.75rem", marginBottom: "0.25rem" }}>
            Weekly Invoices
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
            Manage and track all issued client invoices across weekly payroll periods.
          </p>
        </div>

        <Link
          href="/dashboard/invoices/new"
          id="invoices-create-btn"
          className="btn btn-primary"
        >
          <PlusCircle size={18} />
          <span>New Weekly Invoice</span>
        </Link>
      </div>

      {/* Filters and Search Bar */}
      <div
        className="card"
        style={{
          marginBottom: "1.5rem",
          padding: "1rem 1.25rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        {/* Status Filter Buttons */}
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {["all", "pending", "paid", "draft"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`btn btn-sm ${
                statusFilter === st ? "btn-primary" : "btn-secondary"
              }`}
              style={{ textTransform: "capitalize" }}
            >
              {st === "all"
                ? "All"
                : st === "pending"
                ? "Pending"
                : st === "paid"
                ? "Paid"
                : "Drafts"}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <form
          onSubmit={handleSearchSubmit}
          style={{ display: "flex", gap: "0.5rem", minWidth: "260px" }}
        >
          <div style={{ position: "relative", flex: 1 }}>
            <input
              type="text"
              className="form-input"
              placeholder="Search by client or invoice #..."
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
      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
            Loading invoices...
          </div>
        ) : invoices.length === 0 ? (
          <div style={{ padding: "3.5rem 1.5rem", textAlign: "center" }}>
            <FileText size={48} style={{ opacity: 0.35, marginBottom: "1rem" }} />
            <p style={{ fontWeight: 600, fontSize: "1.1rem" }}>
              No invoices found
            </p>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
              Try changing the search filter or generate a new weekly invoice.
            </p>
            <Link href="/dashboard/invoices/new" className="btn btn-primary btn-sm">
              <PlusCircle size={16} /> Create Invoice Now
            </Link>
          </div>
        ) : (
          <div className="table-container" style={{ border: "none" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Client Name</th>
                  <th>Weekly Period</th>
                  <th>Issue Date</th>
                  <th>Due Date</th>
                  <th>Staff Count</th>
                  <th>Total Amount</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv._id}>
                    <td style={{ fontWeight: 700, color: "var(--primary)" }}>
                      <Link href={`/dashboard/invoices/${inv._id}`}>
                        {inv.invoiceNumber}
                      </Link>
                    </td>
                    <td style={{ fontWeight: 600 }}>{inv.clientName}</td>
                    <td style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                      {formatDate(inv.periodStart)} – {formatDate(inv.periodEnd)}
                    </td>
                    <td style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                      {formatDate(inv.invoiceDate)}
                    </td>
                    <td style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                      {formatDate(inv.dueDate)}
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: "0.8rem",
                          backgroundColor: "var(--bg-subtle)",
                          padding: "0.2rem 0.5rem",
                          borderRadius: "4px",
                          fontWeight: 500,
                        }}
                      >
                        {inv.items?.length || 0} staff
                      </span>
                    </td>
                    <td style={{ fontWeight: 800, fontSize: "0.95rem" }}>
                      {formatCurrency(inv.totalAmount)}
                    </td>
                    <td>{getStatusBadge(inv.status)}</td>
                    <td style={{ textAlign: "right" }}>
                      <div
                        style={{
                          display: "inline-flex",
                          gap: "0.5rem",
                          justifyContent: "flex-end",
                        }}
                      >
                        <Link
                          href={`/dashboard/invoices/${inv._id}`}
                          className="btn btn-secondary btn-sm"
                          title="View Invoice"
                        >
                          <Eye size={15} />
                        </Link>
                        <button
                          onClick={() => handleDelete(inv._id!, inv.invoiceNumber)}
                          disabled={deletingId === inv._id}
                          className="btn btn-sm"
                          style={{
                            color: "var(--danger)",
                            border: "1px solid var(--danger-border)",
                            backgroundColor: "var(--danger-subtle)",
                          }}
                          title="Delete Invoice"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
