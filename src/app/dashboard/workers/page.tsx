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
  Send,
  Key,
  Check,
  ShieldCheck,
  Clock,
  Sparkles,
} from "lucide-react";
import { IWorker } from "@/lib/types";

// Extended worker interface for Staff Directory with linked user and invitation status
interface IEnrichedWorker extends IWorker {
  userAccount?: {
    id: string;
    name: string;
    email: string;
    role: string;
    agentType?: string;
    hasAccount: boolean;
  } | null;
  pendingInvite?: {
    token: string;
    role: string;
    agentType?: string;
    expiresAt: string;
    isPending: boolean;
  } | null;
}

const DEFAULT_ROLES = [
  "Physical Therapy (PT)",
  "Physical Therapy Assistant (PTA)",
];

function getRoleAbbreviation(roleStr: string): string {
  if (!roleStr) return "";
  const match = roleStr.match(/\(([^)]+)\)/);
  if (match) return match[1].trim();

  const lower = roleStr.toLowerCase().trim();
  if (lower === "physical therapy assistant" || lower === "pta") return "PTA";
  if (lower === "physical therapy" || lower === "physical therapist" || lower === "pt") return "PT";
  if (lower === "occupational therapy assistant" || lower === "ota") return "OTA";
  if (lower === "occupational therapy" || lower === "occupational therapist" || lower === "ot") return "OT";
  if (lower === "speech language pathologist" || lower === "slp") return "SLP";
  if (lower === "certified nursing assistant" || lower === "cna") return "CNA";
  if (lower === "registered nurse" || lower === "rn") return "RN";

  return roleStr.trim();
}

function getRoleBadgeStyle(roleStr: string): { bg: string; color: string; border: string } {
  const abbr = getRoleAbbreviation(roleStr).toUpperCase();
  if (abbr === "PT") {
    return {
      bg: "#eff6ff", // blue-50
      color: "#1d4ed8", // blue-700
      border: "#bfdbfe", // blue-200
    };
  }
  if (abbr === "PTA") {
    return {
      bg: "#ecfdf5", // emerald-50
      color: "#047857", // emerald-700
      border: "#a7f3d0", // emerald-200
    };
  }
  if (abbr === "OT" || abbr === "OTA") {
    return {
      bg: "#fef3c7", // amber-50
      color: "#b45309", // amber-700
      border: "#fde68a", // amber-200
    };
  }
  if (abbr === "SLP") {
    return {
      bg: "#faf5ff", // purple-50
      color: "#7e22ce", // purple-700
      border: "#e9d5ff", // purple-200
    };
  }
  return {
    bg: "#f1f5f9", // slate-100
    color: "#334155", // slate-700
    border: "#cbd5e1", // slate-300
  };
}

function formatPhoneNumber(val?: string): string {
  if (!val) return "";
  const cleaned = val.replace(/\D/g, "");
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  if (cleaned.length === 11 && cleaned.startsWith("1")) {
    return `${cleaned.slice(1, 4)}-${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  return val;
}

export default function WorkersPage() {
  const [workers, setWorkers] = useState<IEnrichedWorker[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Role Management
  const [availableRoles, setAvailableRoles] = useState<string[]>(DEFAULT_ROLES);
  const [isAddingNewRole, setIsAddingNewRole] = useState(false);
  const [customRoleInput, setCustomRoleInput] = useState("");

  // Worker Edit / Create Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState<IEnrichedWorker | null>(null);

  // Form Fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");

  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState("");

  // Inviting / Action feedback
  const [invitingEmail, setInvitingEmail] = useState<string | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState("");

  // Change Password Modal State
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [selectedWorkerForPassword, setSelectedWorkerForPassword] = useState<IEnrichedWorker | null>(null);
  const [confirmFirstNameInput, setConfirmFirstNameInput] = useState("");
  const [passwordModalError, setPasswordModalError] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

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

  const fetchWorkers = async (queryOverride?: string) => {
    setLoading(true);
    try {
      const url = new URL("/api/workers", window.location.origin);
      const queryText = queryOverride !== undefined ? queryOverride : search;
      if (queryText) url.searchParams.set("search", queryText);

      const res = await fetch(url.toString());
      const data = await res.json();
      if (res.ok) {
        const list: IEnrichedWorker[] = data.workers || [];
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

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearch(val);
    fetchWorkers(val);
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

  const openEditModal = (worker: IEnrichedWorker) => {
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
      fetchWorkers(search);

      if (data.autoInvite?.sent) {
        setActionSuccessMsg(`Staff member created and invitation email automatically sent to ${email.trim()}!`);
        setTimeout(() => setActionSuccessMsg(""), 5000);
      }
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

  // Send or resend invitation email
  const handleSendInvite = async (worker: IEnrichedWorker) => {
    const workerEmail = worker.email?.trim();
    if (!workerEmail) {
      alert("This staff member does not have an email address configured. Please edit the member first to add an email.");
      return;
    }

    const abbr = getRoleAbbreviation(worker.role).toUpperCase();
    const agentType = abbr === "PTA" ? "PTA" : "PT";

    setInvitingEmail(workerEmail);
    try {
      const res = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: workerEmail,
          role: "agent",
          agentType,
          expirationHours: 24,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to send invitation");
        return;
      }

      setActionSuccessMsg(`Invitation successfully sent to ${workerEmail}!`);
      setTimeout(() => setActionSuccessMsg(""), 5000);
      fetchWorkers(search);
    } catch (err: any) {
      alert("Error sending invitation email: " + (err.message || "Network error"));
    } finally {
      setInvitingEmail(null);
    }
  };

  // Open Change Password modal
  const openPasswordModal = (worker: IEnrichedWorker) => {
    setSelectedWorkerForPassword(worker);
    setConfirmFirstNameInput("");
    setPasswordModalError("");
    setPasswordModalOpen(true);
  };

  // Submit Password Reset Request
  const handleSubmitPasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordModalError("");

    if (!selectedWorkerForPassword || !selectedWorkerForPassword.userAccount) {
      setPasswordModalError("No linked user account found for this worker.");
      return;
    }

    const expectedFirstName = selectedWorkerForPassword.firstName.trim().toLowerCase();
    const providedFirstName = confirmFirstNameInput.trim().toLowerCase();

    if (expectedFirstName !== providedFirstName) {
      setPasswordModalError(`Please type "${selectedWorkerForPassword.firstName}" exactly to confirm this action.`);
      return;
    }

    setChangingPassword(true);

    try {
      const res = await fetch("/api/users/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedWorkerForPassword.userAccount.id,
          confirmFirstName: confirmFirstNameInput.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to request password reset");
      }

      setPasswordModalOpen(false);
      setActionSuccessMsg(
        `A 24-hour password setup link was emailed to ${selectedWorkerForPassword.email}. Previous password deactivated.`
      );
      setTimeout(() => setActionSuccessMsg(""), 6000);
      fetchWorkers(search);
    } catch (err: any) {
      setPasswordModalError(err.message || "Failed to process password reset");
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div style={{ width: "100%" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
          marginBottom: "1.25rem",
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

      {/* Global Success Notification Toast */}
      {actionSuccessMsg && (
        <div
          style={{
            backgroundColor: "#ecfdf5",
            border: "1px solid #a7f3d0",
            color: "#065f46",
            borderRadius: "10px",
            padding: "0.85rem 1.25rem",
            marginBottom: "1.25rem",
            fontSize: "0.9rem",
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
            boxShadow: "0 2px 5px rgba(5,150,105,0.1)",
          }}
        >
          <Check size={18} style={{ color: "#059669", flexShrink: 0 }} />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* Real-time Search Bar */}
      <div
        className="card"
        style={{
          marginBottom: "1.25rem",
          padding: "0.85rem 1.25rem",
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

        <div style={{ position: "relative", minWidth: "320px", flex: "1 1 320px", maxWidth: "480px" }}>
          <input
            type="text"
            className="form-input"
            placeholder="Search by name, role, phone or email..."
            value={search}
            onChange={handleSearchChange}
            style={{ paddingLeft: "2.3rem", width: "100%" }}
            id="worker-search-input"
          />
          <Search
            size={16}
            style={{
              position: "absolute",
              left: "0.85rem",
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--text-muted)",
              pointerEvents: "none",
            }}
          />
        </div>
      </div>

      {/* Workers Table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
            Loading staff directory...
          </div>
        ) : workers.length === 0 ? (
          <div style={{ padding: "3.5rem 1.5rem", textAlign: "center" }}>
            <Users size={44} style={{ opacity: 0.35, marginBottom: "0.75rem" }} />
            <p style={{ fontWeight: 600, fontSize: "1.1rem" }}>
              {search ? "No staff members match your search" : "No staff members found"}
            </p>
            <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginBottom: "1.25rem" }}>
              {search
                ? "Try searching with a different name, specialty, phone or email."
                : "Add agency personnel so you can assign them to weekly client invoices."}
            </p>
            {!search && (
              <button onClick={openCreateModal} className="btn btn-primary btn-sm">
                <UserPlus size={16} /> Add Staff Member
              </button>
            )}
          </div>
        ) : (
          <div className="table-container" style={{ border: "none" }}>
            <table className="data-table" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th>Staff Member</th>
                  <th>Initials</th>
                  <th>Role</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Access & Account</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {workers.map((w) => {
                  const badgeStyle = getRoleBadgeStyle(w.role);
                  const abbr = getRoleAbbreviation(w.role);
                  const hasUserAccount = Boolean(w.userAccount?.hasAccount);
                  const hasPendingInvite = Boolean(w.pendingInvite?.isPending);
                  const isInvitingThis = invitingEmail === w.email;

                  return (
                    <tr key={w._id}>
                      <td>
                        <div style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: "0.95rem" }}>
                          {w.firstName} {w.lastName}
                        </div>
                        {w.notes && (
                          <div
                            style={{
                              fontSize: "0.76rem",
                              color: "var(--text-muted)",
                              maxWidth: "240px",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              marginTop: "2px",
                            }}
                          >
                            {w.notes}
                          </div>
                        )}
                      </td>
                      <td>
                        <span
                          style={{
                            fontWeight: 800,
                            fontSize: "0.82rem",
                            letterSpacing: "0.05em",
                            backgroundColor: "var(--primary-subtle)",
                            color: "var(--primary)",
                            border: "1px solid var(--primary-border)",
                            padding: "0.2rem 0.5rem",
                            borderRadius: "5px",
                            display: "inline-block",
                          }}
                        >
                          {w.initials || "—"}
                        </span>
                      </td>
                      <td>
                        <div
                          title={w.role}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.35rem",
                            backgroundColor: badgeStyle.bg,
                            color: badgeStyle.color,
                            border: `1px solid ${badgeStyle.border}`,
                            padding: "0.25rem 0.65rem",
                            borderRadius: "6px",
                            fontWeight: 700,
                            fontSize: "0.82rem",
                            letterSpacing: "0.02em",
                          }}
                        >
                          <Briefcase size={13} />
                          <span>{abbr}</span>
                        </div>
                      </td>
                      <td>
                        {w.phone ? (
                          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                            <Phone size={13} color="var(--text-muted)" />
                            <span>{formatPhoneNumber(w.phone)}</span>
                          </div>
                        ) : (
                          <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>-</span>
                        )}
                      </td>
                      <td>
                        {w.email ? (
                          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                            <Mail size={13} color="var(--text-muted)" />
                            <span>{w.email}</span>
                          </div>
                        ) : (
                          <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>-</span>
                        )}
                      </td>

                      {/* Access & Account Column */}
                      <td>
                        {hasUserAccount ? (
                          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                fontSize: "0.75rem",
                                fontWeight: 700,
                                padding: "0.2rem 0.55rem",
                                borderRadius: "6px",
                                backgroundColor: "#ecfdf5",
                                color: "#065f46",
                                border: "1px solid #a7f3d0",
                              }}
                            >
                              <ShieldCheck size={12} style={{ color: "#059669" }} />
                              Active Account
                            </span>
                            <button
                              type="button"
                              onClick={() => openPasswordModal(w)}
                              className="btn btn-secondary btn-sm"
                              style={{
                                fontSize: "0.75rem",
                                padding: "0.25rem 0.6rem",
                                gap: "0.3rem",
                                borderColor: "#cbd5e1",
                              }}
                              title="Reset user login password"
                            >
                              <Key size={13} style={{ color: "#475569" }} />
                              <span>Change Password</span>
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                            {hasPendingInvite ? (
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  fontSize: "0.75rem",
                                  fontWeight: 700,
                                  padding: "0.2rem 0.55rem",
                                  borderRadius: "6px",
                                  backgroundColor: "#fffbeb",
                                  color: "#b45309",
                                  border: "1px solid #fde68a",
                                }}
                              >
                                <Clock size={12} style={{ color: "#d97706" }} />
                                Invite Sent
                              </span>
                            ) : (
                              <span
                                style={{
                                  fontSize: "0.75rem",
                                  fontWeight: 600,
                                  color: "var(--text-muted)",
                                }}
                              >
                                No Account
                              </span>
                            )}

                            <button
                              type="button"
                              onClick={() => handleSendInvite(w)}
                              disabled={!w.email || isInvitingThis}
                              className="btn btn-sm"
                              style={{
                                fontSize: "0.75rem",
                                padding: "0.25rem 0.65rem",
                                gap: "0.3rem",
                                backgroundColor: !w.email ? "#f1f5f9" : "#eff6ff",
                                color: !w.email ? "#94a3b8" : "#1d4ed8",
                                border: !w.email ? "1px solid #e2e8f0" : "1px solid #bfdbfe",
                                cursor: !w.email ? "not-allowed" : "pointer",
                                fontWeight: 700,
                              }}
                              title={
                                !w.email
                                  ? "Add an email to enable invitations"
                                  : hasPendingInvite
                                  ? "Resend 24-hour invitation link"
                                  : "Send invitation to create an Agent user account"
                              }
                            >
                              <Send size={12} />
                              <span>
                                {isInvitingThis
                                  ? "Sending..."
                                  : hasPendingInvite
                                  ? "Resend Invite"
                                  : "Send Invite"}
                              </span>
                            </button>
                          </div>
                        )}
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
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Change Password Confirmation Modal */}
      {passwordModalOpen && selectedWorkerForPassword && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "480px" }}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontSize: "1.2rem", fontWeight: 800 }}>
                  Change Agent Password
                </h3>
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "2px" }}>
                  Reset login credentials for {selectedWorkerForPassword.firstName} {selectedWorkerForPassword.lastName}
                </p>
              </div>
              <button
                onClick={() => setPasswordModalOpen(false)}
                style={{ color: "var(--text-muted)" }}
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitPasswordChange}>
              <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
                {passwordModalError && (
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
                    <span>{passwordModalError}</span>
                  </div>
                )}

                <div
                  style={{
                    backgroundColor: "#fef3c7",
                    border: "1px solid #fde68a",
                    color: "#92400e",
                    padding: "0.85rem 1rem",
                    borderRadius: "8px",
                    fontSize: "0.85rem",
                    lineHeight: 1.45,
                  }}
                >
                  <div style={{ fontWeight: 700, marginBottom: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <span>⚠️ Security Confirmation</span>
                  </div>
                  <span>
                    To prevent accidental changes, confirm the staff member&apos;s first name. This action will <strong>deactivate the agent&apos;s current password</strong> and email them a secure <strong>24-hour link</strong> to create their new password.
                  </span>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">
                    Confirm First Name (Type &quot;<strong>{selectedWorkerForPassword.firstName}</strong>&quot;) *
                  </label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder={`Type ${selectedWorkerForPassword.firstName} to confirm`}
                    value={confirmFirstNameInput}
                    onChange={(e) => setConfirmFirstNameInput(e.target.value)}
                    autoFocus
                  />
                  <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "5px" }}>
                    An email with instructions to set a new password will be sent to <strong>{selectedWorkerForPassword.email}</strong>.
                  </p>
                </div>
              </div>

              <div className="modal-footer" style={{ marginTop: "1.25rem" }}>
                <button
                  type="button"
                  onClick={() => setPasswordModalOpen(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    changingPassword ||
                    confirmFirstNameInput.trim().toLowerCase() !==
                      selectedWorkerForPassword.firstName.trim().toLowerCase()
                  }
                  className="btn btn-primary"
                >
                  {changingPassword ? "Sending Reset Email..." : "Send Reset Email & Deactivate Old Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                      placeholder="305-555-0100"
                      value={phone}
                      onChange={(e) => {
                        const raw = e.target.value;
                        const cleaned = raw.replace(/\D/g, "").slice(0, 10);
                        if (cleaned.length > 6) {
                          setPhone(`${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`);
                        } else if (cleaned.length > 3) {
                          setPhone(`${cleaned.slice(0, 3)}-${cleaned.slice(3)}`);
                        } else {
                          setPhone(cleaned);
                        }
                      }}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <label className="form-label">Email Address</label>
                      {!editingWorker && (
                        <span style={{ fontSize: "0.72rem", color: "#2563eb", fontWeight: 600 }}>
                          ✨ Sends auto-invite
                        </span>
                      )}
                    </div>
                    <input
                      type="email"
                      className="form-input"
                      placeholder="staff@agency.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                    {!editingWorker && (
                      <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px" }}>
                        Entering an email automatically creates an Agent invitation for portal access.
                      </p>
                    )}
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
