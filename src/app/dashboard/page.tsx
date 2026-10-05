"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  DollarSign,
  Clock,
  CheckCircle2,
  Users,
  PlusCircle,
  FileText,
  ArrowUpRight,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import { IInvoice, IWorker } from "@/lib/types";

interface StatsData {
  totalBilled: number;
  totalPaid: number;
  totalPending: number;
  totalInvoices: number;
  activeWorkersCount: number;
  totalWorkersCount: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [recentInvoices, setRecentInvoices] = useState<IInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/stats")
      .then((res) => res.json())
      .then((data) => {
        if (data.stats) {
          setStats(data.stats);
          setRecentInvoices(data.recentInvoices || []);
        }
      })
      .catch((err) => console.error("Error loading stats:", err))
      .finally(() => setLoading(false));
  }, []);

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
      {/* Title & Welcome Section */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "1rem",
          marginBottom: "1.75rem",
        }}
      >
        <div>
          <h1 style={{ fontSize: "1.75rem", marginBottom: "0.25rem" }}>
            Panel de Control
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
            Resumen semanal de invoices, nómina y personal activo de la agencia.
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.75rem" }}>
          <Link
            href="/dashboard/invoices/new"
            id="dash-new-invoice-btn"
            className="btn btn-primary"
          >
            <PlusCircle size={18} />
            <span>Crear Invoice Semanal</span>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div
            className="stat-icon-wrapper"
            style={{ backgroundColor: "var(--primary-subtle)", color: "var(--primary)" }}
          >
            <DollarSign size={26} />
          </div>
          <div className="stat-info">
            <div className="stat-value">
              {loading ? "..." : formatCurrency(stats?.totalBilled || 0)}
            </div>
            <div className="stat-label">Total Facturado</div>
          </div>
        </div>

        <div className="stat-card">
          <div
            className="stat-icon-wrapper"
            style={{ backgroundColor: "var(--warning-subtle)", color: "var(--warning)" }}
          >
            <Clock size={26} />
          </div>
          <div className="stat-info">
            <div className="stat-value">
              {loading ? "..." : formatCurrency(stats?.totalPending || 0)}
            </div>
            <div className="stat-label">Pendiente de Cobro</div>
          </div>
        </div>

        <div className="stat-card">
          <div
            className="stat-icon-wrapper"
            style={{ backgroundColor: "var(--success-subtle)", color: "var(--success)" }}
          >
            <CheckCircle2 size={26} />
          </div>
          <div className="stat-info">
            <div className="stat-value">
              {loading ? "..." : formatCurrency(stats?.totalPaid || 0)}
            </div>
            <div className="stat-label">Cobrado con Éxito</div>
          </div>
        </div>

        <div className="stat-card">
          <div
            className="stat-icon-wrapper"
            style={{ backgroundColor: "#f3e8ff", color: "#9333ea" }}
          >
            <Users size={26} />
          </div>
          <div className="stat-info">
            <div className="stat-value">
              {loading ? "..." : stats?.activeWorkersCount ?? 0}
            </div>
            <div className="stat-label">
              Trabajadores Activos ({stats?.totalWorkersCount ?? 0} totales)
            </div>
          </div>
        </div>
      </div>

      {/* Quick Weekly Cycle Banner */}
      <div
        style={{
          background: "linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)",
          borderRadius: "var(--radius-lg)",
          color: "#ffffff",
          padding: "1.75rem 2rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1.5rem",
          marginBottom: "2rem",
          boxShadow: "0 10px 25px -5px rgba(37, 99, 235, 0.35)",
        }}
      >
        <div style={{ maxWidth: "600px" }}>
          <span
            style={{
              display: "inline-block",
              padding: "0.2rem 0.6rem",
              backgroundColor: "rgba(255, 255, 255, 0.2)",
              borderRadius: "9999px",
              fontSize: "0.75rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: "0.5rem",
            }}
          >
            Ciclo Semanal de Nómina
          </span>
          <h2 style={{ color: "#ffffff", fontSize: "1.35rem", marginBottom: "0.35rem" }}>
            ¿Listo para emitir el invoice semanal de tu cliente?
          </h2>
          <p style={{ color: "rgba(255, 255, 255, 0.85)", fontSize: "0.9rem" }}>
            Selecciona las fechas de la semana, añade los trabajadores que prestaron
            servicio y genera la factura con desglose detallado de horas y tarifas.
          </p>
        </div>

        <Link
          href="/dashboard/invoices/new"
          className="btn"
          style={{
            backgroundColor: "#ffffff",
            color: "var(--primary)",
            fontWeight: 700,
            padding: "0.75rem 1.4rem",
            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
          }}
        >
          Iniciar Invoice Semanal <ArrowUpRight size={18} />
        </Link>
      </div>

      {/* Recent Invoices Table */}
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">Facturas Semanales Recientes</h2>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "2px" }}>
              Últimos invoices creados en la plataforma
            </p>
          </div>
          <Link
            href="/dashboard/invoices"
            style={{
              fontSize: "0.875rem",
              color: "var(--primary)",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: "0.25rem",
            }}
          >
            Ver todos los invoices <ArrowUpRight size={16} />
          </Link>
        </div>

        {recentInvoices.length === 0 && !loading ? (
          <div
            style={{
              textAlign: "center",
              padding: "3rem 1rem",
              color: "var(--text-muted)",
            }}
          >
            <FileText size={40} style={{ opacity: 0.4, marginBottom: "0.75rem" }} />
            <p style={{ fontWeight: 600, fontSize: "1rem", color: "var(--text-primary)" }}>
              No hay facturas registradas aún
            </p>
            <p style={{ fontSize: "0.875rem", marginBottom: "1.25rem" }}>
              Crea tu primer invoice semanal para comenzar el seguimiento
            </p>
            <Link href="/dashboard/invoices/new" className="btn btn-primary btn-sm">
              <PlusCircle size={16} /> Crear Primer Invoice
            </Link>
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>No. Invoice</th>
                  <th>Cliente</th>
                  <th>Período Semanal</th>
                  <th>Personal Facturado</th>
                  <th>Total</th>
                  <th>Estado</th>
                  <th style={{ textAlign: "right" }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {recentInvoices.map((inv) => (
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
                    <td>
                      <span
                        style={{
                          fontSize: "0.825rem",
                          backgroundColor: "var(--bg-subtle)",
                          padding: "0.2rem 0.5rem",
                          borderRadius: "4px",
                          fontWeight: 500,
                        }}
                      >
                        {inv.items?.length || 0} trabajadores
                      </span>
                    </td>
                    <td style={{ fontWeight: 700 }}>
                      {formatCurrency(inv.totalAmount)}
                    </td>
                    <td>{getStatusBadge(inv.status)}</td>
                    <td style={{ textAlign: "right" }}>
                      <Link
                        href={`/dashboard/invoices/${inv._id}`}
                        className="btn btn-secondary btn-sm"
                      >
                        Ver Detalle
                      </Link>
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
