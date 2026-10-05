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
    if (!confirm(`¿Estás seguro de que deseas eliminar la factura ${invoiceNum}?`)) {
      return;
    }

    setDeletingId(id);
    try {
      const res = await fetch(`/api/invoices/${id}`, { method: "DELETE" });
      if (res.ok) {
        setInvoices((prev) => prev.filter((inv) => inv._id !== id));
      } else {
        alert("Error al eliminar la factura");
      }
    } catch {
      alert("Error al conectar con el servidor");
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
    return new Date(dateStr).toLocaleDateString("es-ES", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <span className="badge badge-paid">Pagado</span>;
      case "pending":
        return <span className="badge badge-pending">Pendiente</span>;
      case "draft":
        return <span className="badge badge-draft">Borrador</span>;
      case "cancelled":
        return <span className="badge badge-cancelled">Cancelado</span>;
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
            Invoices y Facturas Semanales
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
            Gestiona todas las facturas emitidas por cada ciclo de payroll.
          </p>
        </div>

        <Link
          href="/dashboard/invoices/new"
          id="invoices-create-btn"
          className="btn btn-primary"
        >
          <PlusCircle size={18} />
          <span>Nuevo Invoice Semanal</span>
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
                ? "Todos"
                : st === "pending"
                ? "Pendientes"
                : st === "paid"
                ? "Pagados"
                : "Borradores"}
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
              placeholder="Buscar por cliente o No..."
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
            Buscar
          </button>
        </form>
      </div>

      {/* Invoices List Table */}
      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
            Cargando invoices...
          </div>
        ) : invoices.length === 0 ? (
          <div style={{ padding: "3.5rem 1.5rem", textAlign: "center" }}>
            <FileText size={48} style={{ opacity: 0.35, marginBottom: "1rem" }} />
            <p style={{ fontWeight: 600, fontSize: "1.1rem" }}>
              No se encontraron facturas
            </p>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
              Intenta cambiar los filtros o crea un nuevo invoice semanal.
            </p>
            <Link href="/dashboard/invoices/new" className="btn btn-primary btn-sm">
              <PlusCircle size={16} /> Crear Invoice Ahora
            </Link>
          </div>
        ) : (
          <div className="table-container" style={{ border: "none" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>No. Invoice</th>
                  <th>Cliente</th>
                  <th>Período Semanal</th>
                  <th>Fecha Emisión</th>
                  <th>Vencimiento</th>
                  <th>Trabajadores</th>
                  <th>Total</th>
                  <th>Estado</th>
                  <th style={{ textAlign: "right" }}>Acciones</th>
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
                        {inv.items?.length || 0} personas
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
                          title="Ver Factura"
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
                          title="Eliminar Factura"
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
