"use client";

import { useEffect, useState } from "react";
import {
  Users,
  UserPlus,
  Search,
  Edit2,
  Trash2,
  Phone,
  Mail,
  DollarSign,
  Briefcase,
  CheckCircle,
  X,
  AlertCircle,
} from "lucide-react";
import { IWorker } from "@/lib/types";

export default function WorkersPage() {
  const [workers, setWorkers] = useState<IWorker[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState<IWorker | null>(null);

  // Form Fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState("");
  const [hourlyRate, setHourlyRate] = useState<number | string>(35);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [ssnLast4, setSsnLast4] = useState("");
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [notes, setNotes] = useState("");

  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState("");

  const fetchWorkers = async () => {
    setLoading(true);
    try {
      const url = new URL("/api/workers", window.location.origin);
      if (statusFilter !== "all") url.searchParams.set("status", statusFilter);
      if (search) url.searchParams.set("search", search);

      const res = await fetch(url.toString());
      const data = await res.json();
      if (res.ok) {
        setWorkers(data.workers || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkers();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchWorkers();
  };

  const openCreateModal = () => {
    setEditingWorker(null);
    setFirstName("");
    setLastName("");
    setRole("");
    setHourlyRate(35);
    setPhone("");
    setEmail("");
    setSsnLast4("");
    setStatus("active");
    setNotes("");
    setModalError("");
    setIsModalOpen(true);
  };

  const openEditModal = (worker: IWorker) => {
    setEditingWorker(worker);
    setFirstName(worker.firstName);
    setLastName(worker.lastName);
    setRole(worker.role);
    setHourlyRate(worker.hourlyRate);
    setPhone(worker.phone || "");
    setEmail(worker.email || "");
    setSsnLast4(worker.ssnLast4 || "");
    setStatus(worker.status);
    setNotes(worker.notes || "");
    setModalError("");
    setIsModalOpen(true);
  };

  const handleSaveWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError("");

    if (!firstName.trim() || !lastName.trim() || !role.trim()) {
      setModalError("Nombre, apellidos y cargo son requeridos");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        firstName,
        lastName,
        role,
        hourlyRate: Number(hourlyRate),
        phone,
        email,
        ssnLast4,
        status,
        notes,
      };

      const url = editingWorker ? `/api/workers/${editingWorker._id}` : "/api/workers";
      const method = editingWorker ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al guardar trabajador");
      }

      setIsModalOpen(false);
      fetchWorkers();
    } catch (err: any) {
      setModalError(err.message || "Error al procesar trabajador");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteWorker = async (id: string, name: string) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar a ${name} de la lista de la agencia?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/workers/${id}`, { method: "DELETE" });
      if (res.ok) {
        setWorkers((prev) => prev.filter((w) => w._id !== id));
      } else {
        alert("Error al eliminar trabajador");
      }
    } catch {
      alert("Error de conexión");
    }
  };

  const activeCount = workers.filter((w) => w.status === "active").length;
  const avgRate =
    workers.length > 0
      ? workers.reduce((acc, curr) => acc + (curr.hourlyRate || 0), 0) / workers.length
      : 0;

  return (
    <div>
      {/* Header */}
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
            Directorio de Trabajadores de la Agencia
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
            Personal activo disponible para asignar en las facturas semanales de clientes.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          id="add-worker-btn"
          className="btn btn-primary"
        >
          <UserPlus size={18} />
          <span>Añadir Trabajador</span>
        </button>
      </div>

      {/* Mini Stats Banner */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        <div className="card" style={{ padding: "1rem 1.25rem" }}>
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600 }}>
            Total Personal
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: 800, marginTop: "0.25rem" }}>
            {workers.length}
          </div>
        </div>

        <div className="card" style={{ padding: "1rem 1.25rem" }}>
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600 }}>
            Activos para Facturación
          </div>
          <div
            style={{
              fontSize: "1.5rem",
              fontWeight: 800,
              color: "var(--success)",
              marginTop: "0.25rem",
            }}
          >
            {activeCount}
          </div>
        </div>

        <div className="card" style={{ padding: "1rem 1.25rem" }}>
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600 }}>
            Tarifa Promedio ($/hora)
          </div>
          <div
            style={{
              fontSize: "1.5rem",
              fontWeight: 800,
              color: "var(--primary)",
              marginTop: "0.25rem",
            }}
          >
            ${avgRate.toFixed(2)}/h
          </div>
        </div>
      </div>

      {/* Search & Filters */}
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
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            onClick={() => setStatusFilter("all")}
            className={`btn btn-sm ${statusFilter === "all" ? "btn-primary" : "btn-secondary"}`}
          >
            Todos ({workers.length})
          </button>
          <button
            onClick={() => setStatusFilter("active")}
            className={`btn btn-sm ${statusFilter === "active" ? "btn-primary" : "btn-secondary"}`}
          >
            Activos
          </button>
          <button
            onClick={() => setStatusFilter("inactive")}
            className={`btn btn-sm ${statusFilter === "inactive" ? "btn-primary" : "btn-secondary"}`}
          >
            Inactivos
          </button>
        </div>

        <form
          onSubmit={handleSearchSubmit}
          style={{ display: "flex", gap: "0.5rem", minWidth: "260px" }}
        >
          <div style={{ position: "relative", flex: 1 }}>
            <input
              type="text"
              className="form-input"
              placeholder="Buscar por nombre o rol..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: "2.2rem" }}
            />
            <Search
              size={16}
              style={{
                position: "absolute",
                left: "0.75rem",
                top: "50%",
                transform: "translateY(-50)",
                color: "var(--text-muted)",
              }}
            />
          </div>
          <button type="submit" className="btn btn-secondary btn-sm">
            Buscar
          </button>
        </form>
      </div>

      {/* Workers Table */}
      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
            Cargando trabajadores...
          </div>
        ) : workers.length === 0 ? (
          <div style={{ padding: "3.5rem 1.5rem", textAlign: "center" }}>
            <Users size={44} style={{ opacity: 0.35, marginBottom: "0.75rem" }} />
            <p style={{ fontWeight: 600, fontSize: "1.1rem" }}>
              No se encontraron trabajadores
            </p>
            <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginBottom: "1.25rem" }}>
              Añade al personal de la agencia para poder agregarlos a los invoices semanales.
            </p>
            <button onClick={openCreateModal} className="btn btn-primary btn-sm">
              <UserPlus size={16} /> Añadir Trabajador
            </button>
          </div>
        ) : (
          <div className="table-container" style={{ border: "none" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nombre y Apellidos</th>
                  <th>Rol / Especialidad</th>
                  <th>Tarifa Estándar</th>
                  <th>Contacto</th>
                  <th>Estado</th>
                  <th>Notas</th>
                  <th style={{ textAlign: "right" }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {workers.map((w) => (
                  <tr key={w._id}>
                    <td>
                      <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>
                        {w.firstName} {w.lastName}
                      </div>
                      {w.ssnLast4 && (
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                          SSN: ***-**-{w.ssnLast4}
                        </div>
                      )}
                    </td>
                    <td>
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.35rem",
                          backgroundColor: "var(--primary-subtle)",
                          color: "var(--primary)",
                          padding: "0.2rem 0.55rem",
                          borderRadius: "4px",
                          fontWeight: 600,
                          fontSize: "0.825rem",
                        }}
                      >
                        <Briefcase size={13} />
                        <span>{w.role}</span>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>
                        ${w.hourlyRate}/h
                      </span>
                    </td>
                    <td>
                      <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                        {w.phone && (
                          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                            <Phone size={13} color="var(--text-muted)" /> {w.phone}
                          </div>
                        )}
                        {w.email && (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.35rem",
                              marginTop: "2px",
                            }}
                          >
                            <Mail size={13} color="var(--text-muted)" /> {w.email}
                          </div>
                        )}
                        {!w.phone && !w.email && <span style={{ color: "var(--text-muted)" }}>-</span>}
                      </div>
                    </td>
                    <td>
                      {w.status === "active" ? (
                        <span className="badge badge-active">Activo</span>
                      ) : (
                        <span className="badge badge-inactive">Inactivo</span>
                      )}
                    </td>
                    <td style={{ maxWidth: "200px" }}>
                      <span
                        style={{
                          fontSize: "0.8rem",
                          color: "var(--text-muted)",
                          display: "block",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {w.notes || "-"}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div
                        style={{
                          display: "inline-flex",
                          gap: "0.4rem",
                          justifyContent: "flex-end",
                        }}
                      >
                        <button
                          onClick={() => openEditModal(w)}
                          className="btn btn-secondary btn-sm"
                          title="Editar Trabajador"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() =>
                            handleDeleteWorker(w._id!, `${w.firstName} ${w.lastName}`)
                          }
                          className="btn btn-sm"
                          style={{
                            color: "var(--danger)",
                            border: "1px solid var(--danger-border)",
                            backgroundColor: "var(--danger-subtle)",
                          }}
                          title="Eliminar Trabajador"
                        >
                          <Trash2 size={14} />
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

      {/* Add / Edit Worker Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontSize: "1.2rem" }}>
                {editingWorker ? "Editar Trabajador" : "Nuevo Trabajador de Agencia"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ color: "var(--text-muted)" }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveWorker}>
              <div className="modal-body">
                {modalError && (
                  <div
                    style={{
                      backgroundColor: "var(--danger-subtle)",
                      color: "var(--danger)",
                      border: "1px solid var(--danger-border)",
                      borderRadius: "var(--radius-md)",
                      padding: "0.65rem 1rem",
                      marginBottom: "1rem",
                      fontSize: "0.85rem",
                    }}
                  >
                    {modalError}
                  </div>
                )}

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "1rem",
                  }}
                >
                  <div className="form-group">
                    <label className="form-label">Nombre *</label>
                    <input
                      type="text"
                      required
                      className="form-input"
                      placeholder="Ej. Camila"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Apellidos *</label>
                    <input
                      type="text"
                      required
                      className="form-input"
                      placeholder="Ej. Rodriguez"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                    />
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1.3fr 1fr",
                    gap: "1rem",
                  }}
                >
                  <div className="form-group">
                    <label className="form-label">Rol / Cargo Especialidad *</label>
                    <input
                      type="text"
                      required
                      className="form-input"
                      placeholder="Ej. Registered Nurse (RN), PT, CNA"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Tarifa ($/Hora) *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="1"
                      className="form-input"
                      placeholder="45"
                      value={hourlyRate}
                      onChange={(e) => setHourlyRate(e.target.value)}
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
                    <label className="form-label">Teléfono</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="(305) 555-0100"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Correo Electrónico</label>
                    <input
                      type="email"
                      className="form-input"
                      placeholder="trabajador@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
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
                    <label className="form-label">Últimos 4 Dígitos SSN</label>
                    <input
                      type="text"
                      maxLength={4}
                      className="form-input"
                      placeholder="1234"
                      value={ssnLast4}
                      onChange={(e) => setSsnLast4(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Estado en la Agencia</label>
                    <select
                      className="form-select"
                      value={status}
                      onChange={(e) => setStatus(e.target.value as "active" | "inactive")}
                    >
                      <option value="active">Activo (Disponible)</option>
                      <option value="inactive">Inactivo</option>
                    </select>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Notas Adicionales</label>
                  <textarea
                    className="form-textarea"
                    rows={2}
                    placeholder="Disponibilidad horaria, certificaciones o preferencias..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn btn-secondary"
                >
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="btn btn-primary">
                  {saving ? "Guardando..." : editingWorker ? "Guardar Cambios" : "Crear Trabajador"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
