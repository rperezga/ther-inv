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
  Briefcase,
  X,
  AlertCircle,
  Plus,
} from "lucide-react";
import { IWorker } from "@/lib/types";

const DEFAULT_ROLES = [
  "Physical Therapy (PT)",
  "Physical Therapy Assistant (PTA)",
];

export default function WorkersPage() {
  const [workers, setWorkers] = useState<IWorker[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Role Management
  const [availableRoles, setAvailableRoles] = useState<string[]>(DEFAULT_ROLES);
  const [isAddingNewRole, setIsAddingNewRole] = useState(false);
  const [customRoleInput, setCustomRoleInput] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState<IWorker | null>(null);

  // Form Fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");

  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState("");

  // Load custom roles from localStorage and initialize
  useEffect(() => {
    try {
      const saved = localStorage.getItem("therinv_custom_roles");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setAvailableRoles(Array.from(new Set([...DEFAULT_ROLES, ...parsed])));
        }
      }
    } catch (err) {
      console.error("Failed to load custom roles:", err);
    }
  }, []);

  const fetchWorkers = async () => {
    setLoading(true);
    try {
      const url = new URL("/api/workers", window.location.origin);
      if (search) url.searchParams.set("search", search);

      const res = await fetch(url.toString());
      const data = await res.json();
      if (res.ok) {
        const list: IWorker[] = data.workers || [];
        setWorkers(list);

        // Merge any existing roles from workers into available roles
        const existingRoles = list.map((w) => w.role).filter(Boolean);
        if (existingRoles.length > 0) {
          setAvailableRoles((prev) =>
            Array.from(new Set([...DEFAULT_ROLES, ...prev, ...existingRoles]))
          );
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkers();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchWorkers();
  };

  const openCreateModal = () => {
    setEditingWorker(null);
    setFirstName("");
    setLastName("");
    setRole("");
    setPhone("");
    setEmail("");
    setNotes("");
    setIsAddingNewRole(false);
    setCustomRoleInput("");
    setModalError("");
    setIsModalOpen(true);
  };

  const openEditModal = (worker: IWorker) => {
    setEditingWorker(worker);
    setFirstName(worker.firstName);
    setLastName(worker.lastName);
    setRole(worker.role);
    setPhone(worker.phone || "");
    setEmail(worker.email || "");
    setNotes(worker.notes || "");
    setIsAddingNewRole(false);
    setCustomRoleInput("");
    setModalError("");

    // Ensure worker's role is in available list
    if (worker.role && !availableRoles.includes(worker.role)) {
      setAvailableRoles((prev) => [...prev, worker.role]);
    }

    setIsModalOpen(true);
  };

  const handleRoleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === "__ADD_NEW__") {
      setIsAddingNewRole(true);
      setCustomRoleInput("");
    } else {
      setRole(val);
      setIsAddingNewRole(false);
    }
  };

  const handleAddNewRole = () => {
    const trimmed = customRoleInput.trim();
    if (!trimmed) return;

    setAvailableRoles((prev) => {
      const updated = Array.from(new Set([...prev, trimmed]));
      try {
        const customOnly = updated.filter((r) => !DEFAULT_ROLES.includes(r));
        localStorage.setItem("therinv_custom_roles", JSON.stringify(customOnly));
      } catch (err) {
        console.error("Failed to save custom roles:", err);
      }
      return updated;
    });

    setRole(trimmed);
    setIsAddingNewRole(false);
    setCustomRoleInput("");
  };

  const handleSaveWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError("");

    if (!firstName.trim() || !lastName.trim() || !role.trim()) {
      setModalError("First name, last name, and role/specialty are required");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        role: role.trim(),
        hourlyRate: editingWorker ? editingWorker.hourlyRate : 0,
        phone: phone.trim(),
        email: email.trim(),
        status: "active",
        notes: notes.trim(),
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
        throw new Error(data.error || "Failed to save staff member");
      }

      setIsModalOpen(false);
      fetchWorkers();
    } catch (err: any) {
      setModalError(err.message || "Failed to process staff member");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteWorker = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove ${name} from the agency roster?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/workers/${id}`, { method: "DELETE" });
      if (res.ok) {
        setWorkers((prev) => prev.filter((w) => w._id !== id));
      } else {
        alert("Failed to delete staff member");
      }
    } catch {
      alert("Connection error");
    }
  };

  const uniqueRolesCount = Array.from(new Set(workers.map((w) => w.role))).length;

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
            Agency Staff Directory
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
            Active roster available to assign on weekly client invoices and payroll cycles.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          id="add-worker-btn"
          className="btn btn-primary"
        >
          <UserPlus size={18} />
          <span>Add Staff Member</span>
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
            Total Staff Members
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: 800, marginTop: "0.25rem" }}>
            {workers.length}
          </div>
        </div>

        <div className="card" style={{ padding: "1rem 1.25rem" }}>
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600 }}>
            Active Roster
          </div>
          <div
            style={{
              fontSize: "1.5rem",
              fontWeight: 800,
              color: "var(--success)",
              marginTop: "0.25rem",
            }}
          >
            {workers.filter((w) => w.status === "active").length}
          </div>
        </div>

        <div className="card" style={{ padding: "1rem 1.25rem" }}>
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600 }}>
            Specialties Covered
          </div>
          <div
            style={{
              fontSize: "1.5rem",
              fontWeight: 800,
              color: "var(--primary)",
              marginTop: "0.25rem",
            }}
          >
            {uniqueRolesCount}
          </div>
        </div>
      </div>

      {/* Search Bar */}
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
        <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text-secondary)" }}>
          {workers.length} {workers.length === 1 ? "Member Registered" : "Members Registered"}
        </div>

        <form
          onSubmit={handleSearchSubmit}
          style={{ display: "flex", gap: "0.5rem", minWidth: "280px" }}
        >
          <div style={{ position: "relative", flex: 1 }}>
            <input
              type="text"
              className="form-input"
              placeholder="Search by name or specialty..."
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

      {/* Workers Table */}
      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
            Loading staff directory...
          </div>
        ) : workers.length === 0 ? (
          <div style={{ padding: "3.5rem 1.5rem", textAlign: "center" }}>
            <Users size={44} style={{ opacity: 0.35, marginBottom: "0.75rem" }} />
            <p style={{ fontWeight: 600, fontSize: "1.1rem" }}>
              No staff members found
            </p>
            <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginBottom: "1.25rem" }}>
              Add agency personnel so you can assign them to weekly client invoices.
            </p>
            <button onClick={openCreateModal} className="btn btn-primary btn-sm">
              <UserPlus size={16} /> Add Staff Member
            </button>
          </div>
        ) : (
          <div className="table-container" style={{ border: "none" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Staff Member</th>
                  <th>Role / Clinical Specialty</th>
                  <th>Contact Information</th>
                  <th>Notes</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {workers.map((w) => (
                  <tr key={w._id}>
                    <td>
                      <div style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: "0.95rem" }}>
                        {w.firstName} {w.lastName}
                      </div>
                    </td>
                    <td>
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.4rem",
                          backgroundColor: "var(--primary-subtle)",
                          color: "var(--primary)",
                          padding: "0.25rem 0.65rem",
                          borderRadius: "6px",
                          fontWeight: 600,
                          fontSize: "0.85rem",
                        }}
                      >
                        <Briefcase size={14} />
                        <span>{w.role}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                        {w.phone && (
                          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                            <Phone size={13} color="var(--text-muted)" /> {w.phone}
                          </div>
                        )}
                        {w.email && (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.4rem",
                              marginTop: "3px",
                            }}
                          >
                            <Mail size={13} color="var(--text-muted)" /> {w.email}
                          </div>
                        )}
                        {!w.phone && !w.email && <span style={{ color: "var(--text-muted)" }}>-</span>}
                      </div>
                    </td>
                    <td style={{ maxWidth: "260px" }}>
                      <span
                        style={{
                          fontSize: "0.85rem",
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
                          title="Edit Staff Member"
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
                          title="Delete Staff Member"
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
          <div className="modal-content" style={{ maxWidth: "520px" }}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontSize: "1.25rem", fontWeight: 700 }}>
                  {editingWorker ? "Edit Staff Member" : "New Agency Staff Member"}
                </h3>
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "2px" }}>
                  Enter staff details for the agency active roster
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ color: "var(--text-muted)" }}
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveWorker}>
              <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
                {modalError && (
                  <div
                    style={{
                      backgroundColor: "var(--danger-subtle)",
                      color: "var(--danger)",
                      border: "1px solid var(--danger-border)",
                      borderRadius: "var(--radius-md)",
                      padding: "0.65rem 1rem",
                      fontSize: "0.85rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <AlertCircle size={16} />
                    <span>{modalError}</span>
                  </div>
                )}

                {/* Row 1: First Name & Last Name */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "1rem",
                  }}
                >
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">First Name *</label>
                    <input
                      type="text"
                      required
                      className="form-input"
                      placeholder="e.g. Camila"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Last Name *</label>
                    <input
                      type="text"
                      required
                      className="form-input"
                      placeholder="e.g. Rodriguez"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                    />
                  </div>
                </div>

                {/* Row 2: Role / Clinical Specialty Dropdown */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Role / Clinical Specialty *</label>
                  <select
                    className="form-select"
                    required
                    value={isAddingNewRole ? "__ADD_NEW__" : role}
                    onChange={handleRoleSelectChange}
                  >
                    <option value="" disabled>
                      Select a role / clinical specialty...
                    </option>
                    {availableRoles.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                    <option value="__ADD_NEW__">✨ + Add New Role...</option>
                  </select>

                  {/* Inline Add New Role Box */}
                  {isAddingNewRole && (
                    <div
                      style={{
                        marginTop: "0.75rem",
                        padding: "0.85rem 1rem",
                        backgroundColor: "var(--primary-subtle)",
                        border: "1px solid var(--primary-border)",
                        borderRadius: "var(--radius-md)",
                      }}
                    >
                      <label
                        style={{
                          fontSize: "0.8rem",
                          fontWeight: 700,
                          color: "var(--primary)",
                          display: "block",
                          marginBottom: "0.4rem",
                        }}
                      >
                        Enter New Role or Specialty Name
                      </label>
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <input
                          type="text"
                          autoFocus
                          className="form-input"
                          placeholder="e.g. Occupational Therapy (OT)"
                          value={customRoleInput}
                          onChange={(e) => setCustomRoleInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddNewRole();
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={handleAddNewRole}
                          disabled={!customRoleInput.trim()}
                          className="btn btn-primary btn-sm"
                          style={{ whiteSpace: "nowrap" }}
                        >
                          <Plus size={14} /> Add
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddingNewRole(false);
                            setCustomRoleInput("");
                          }}
                          className="btn btn-secondary btn-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Row 3: Phone Number & Email Address */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "1rem",
                  }}
                >
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Phone Number</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="(305) 555-0100"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Email Address</label>
                    <input
                      type="email"
                      className="form-input"
                      placeholder="staff@agency.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                {/* Row 4: Notes & Preferences */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Notes & Preferences</label>
                  <textarea
                    className="form-textarea"
                    rows={3}
                    placeholder="Certifications, shift availability, license details..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer" style={{ marginTop: "1.25rem" }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="btn btn-primary">
                  {saving
                    ? "Saving..."
                    : editingWorker
                    ? "Save Changes"
                    : "Create Staff Member"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
