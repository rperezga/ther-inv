"use client";

import { useEffect, useState } from "react";
import {
  UserPlus,
  Mail,
  Shield,
  Copy,
  Check,
  Trash2,
  Clock,
  UserCheck,
  AlertCircle,
  Users,
} from "lucide-react";
import { IInvitation, IUser } from "@/lib/types";

export default function InvitationsPage() {
  const [invitations, setInvitations] = useState<IInvitation[]>([]);
  const [users, setUsers] = useState<IUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"agent" | "manager" | "viewer">("agent");
  const [agentType, setAgentType] = useState<"PT" | "PTA">("PT");
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState("");
  const [emailStatus, setEmailStatus] = useState<{ sent: boolean; message: string } | null>(null);
  const [lastCreatedUrl, setLastCreatedUrl] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const fetchInvitations = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/invitations");
      const data = await res.json();
      if (res.ok) {
        setInvitations(data.invitations || []);
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvitations();
  }, []);

  const handleCreateInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setEmailStatus(null);
    setLastCreatedUrl(null);

    if (!email.trim()) {
      setFormError("Please enter an email address");
      return;
    }

    if (role === "agent" && (!agentType || (agentType !== "PT" && agentType !== "PTA"))) {
      setFormError("Debes seleccionar obligatoriamente si el Agente es PT o PTA");
      return;
    }

    setSending(true);

    try {
      const res = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          role,
          agentType: role === "agent" ? agentType : undefined,
          expirationHours: 24,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to generate invitation");
      }

      const fullUrl = data.fullInviteUrl || `${window.location.origin}${data.inviteUrl}`;
      setLastCreatedUrl(fullUrl);
      if (data.emailSent) {
        setEmailStatus({
          sent: true,
          message: `Invitación enviada por email a ${email} como ${role === "agent" ? `Agente (${agentType})` : role} vía Resend (válida por 24 horas).`,
        });
      } else if (data.emailError) {
        setEmailStatus({
          sent: false,
          message: `Enlace generado con éxito. (Aviso de email: ${data.emailError}). Puedes copiar el link abajo.`,
        });
      }
      setEmail("");
      fetchInvitations();
    } catch (err: any) {
      setFormError(err.message || "Failed to create invitation");
    } finally {
      setSending(false);
    }
  };

  const handleCopyLink = (token: string) => {
    const fullUrl = `${window.location.origin}/register?invite=${token}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2500);
  };

  const handleDeleteInvite = async (id: string) => {
    if (!confirm("Are you sure you want to revoke this invitation?")) return;

    try {
      const res = await fetch(`/api/invitations?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setInvitations((prev) => prev.filter((it) => it._id !== id));
      }
    } catch {
      alert("Failed to revoke invitation");
    }
  };

  const handleRoleChange = async (userId: string, newRole: "agent" | "manager" | "viewer", newAgentType?: "PT" | "PTA") => {
    try {
      const res = await fetch("/api/invitations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: newRole, agentType: newAgentType }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to update role");
        return;
      }
      setUsers((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, role: newRole, agentType: newAgentType || u.agentType } : u))
      );
    } catch {
      alert("Failed to update role");
    }
  };

  const handleAgentTypeChange = async (userId: string, newType: "PT" | "PTA") => {
    try {
      const res = await fetch("/api/invitations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, agentType: newType }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to update agent type");
        return;
      }
      setUsers((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, agentType: newType } : u))
      );
    } catch {
      alert("Failed to update agent type");
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

  return (
    <div style={{ width: "100%", maxWidth: "100%", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.75rem", marginBottom: "0.25rem" }}>
          Invitations & Team Management
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
          As an administrator or manager (Therina), securely invite new users and assign
          their access roles and permissions.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "2rem",
          marginBottom: "2.5rem",
        }}
      >
        {/* Send Invitation Card */}
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Send New Invitation</h2>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                Generate a secure registration link for a new team member
              </p>
            </div>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                backgroundColor: "var(--primary-subtle)",
                color: "var(--primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <UserPlus size={20} />
            </div>
          </div>

          {formError && (
            <div
              style={{
                backgroundColor: "var(--danger-subtle)",
                color: "var(--danger)",
                border: "1px solid var(--danger-border)",
                borderRadius: "var(--radius-md)",
                padding: "0.65rem 1rem",
                marginBottom: "1rem",
                fontSize: "0.85rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <AlertCircle size={16} />
              <span>{formError}</span>
            </div>
          )}

          {emailStatus && (
            <div
              style={{
                backgroundColor: emailStatus.sent ? "var(--success-subtle)" : "#fef3c7",
                color: emailStatus.sent ? "var(--success)" : "#92400e",
                border: emailStatus.sent ? "1px solid var(--success-border)" : "1px solid #fde68a",
                borderRadius: "var(--radius-md)",
                padding: "0.75rem 1rem",
                marginBottom: "1rem",
                fontSize: "0.85rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <Mail size={16} />
              <span>{emailStatus.message}</span>
            </div>
          )}

          {lastCreatedUrl && (
            <div
              style={{
                backgroundColor: "var(--bg-subtle)",
                border: "1px solid var(--border-color)",
                borderRadius: "var(--radius-md)",
                padding: "1rem",
                marginBottom: "1.25rem",
              }}
            >
              <p style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.35rem" }}>
                Enlace de invitación seguro (expira en 24 horas):
              </p>
              <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
                Comparte este enlace directamente o el usuario puede abrir el email recibido:
              </p>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <input
                  type="text"
                  readOnly
                  value={lastCreatedUrl}
                  className="form-input"
                  style={{ fontSize: "0.8rem", backgroundColor: "#ffffff" }}
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(lastCreatedUrl);
                    alert("Invitation link copied to clipboard");
                  }}
                  className="btn btn-primary btn-sm"
                >
                  Copy
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleCreateInvitation}>
            <div className="form-group">
              <label className="form-label" htmlFor="invite-email">
                Invitee Email Address *
              </label>
              <div style={{ position: "relative" }}>
                <input
                  id="invite-email"
                  type="email"
                  required
                  className="form-input"
                  placeholder="name@agency.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ paddingLeft: "2.3rem" }}
                />
                <Mail
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

            <div className="form-group">
              <label className="form-label">Role & Access Level</label>
              <select
                className="form-select"
                value={role}
                onChange={(e) => setRole(e.target.value as "agent" | "manager" | "viewer")}
              >
                <option value="agent">
                  Clinical Agent (Direct invoice drafting, timesheets, personal access)
                </option>
                <option value="viewer">
                  Viewer (Read-only access to invoices and reports)
                </option>
                <option value="manager">
                  Manager (Create & edit invoices, manage staff directory)
                </option>
              </select>
            </div>

            {/* Mandatory Agent Type Selection when role is agent */}
            {role === "agent" && (
              <div
                className="form-group"
                style={{
                  backgroundColor: "#eff6ff",
                  padding: "0.85rem",
                  borderRadius: "10px",
                  border: "1.5px solid #bfdbfe",
                }}
              >
                <label
                  className="form-label"
                  style={{
                    color: "#1e40af",
                    fontWeight: 700,
                    marginBottom: "0.4rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span>Tipo de Agente (Obligatorio) *</span>
                  <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#2563eb" }}>
                    Determina sus servicios rápidos
                  </span>
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                  <button
                    type="button"
                    onClick={() => setAgentType("PT")}
                    style={{
                      padding: "0.6rem",
                      borderRadius: "8px",
                      border: agentType === "PT" ? "2px solid #2563eb" : "1px solid #cbd5e1",
                      backgroundColor: agentType === "PT" ? "#2563eb" : "#ffffff",
                      color: agentType === "PT" ? "#ffffff" : "#1e293b",
                      fontWeight: 700,
                      fontSize: "0.88rem",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                    }}
                  >
                    <span>PT</span>
                    <span style={{ fontSize: "0.68rem", opacity: agentType === "PT" ? 0.9 : 0.7 }}>
                      Physical Therapist
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAgentType("PTA")}
                    style={{
                      padding: "0.6rem",
                      borderRadius: "8px",
                      border: agentType === "PTA" ? "2px solid #2563eb" : "1px solid #cbd5e1",
                      backgroundColor: agentType === "PTA" ? "#2563eb" : "#ffffff",
                      color: agentType === "PTA" ? "#ffffff" : "#1e293b",
                      fontWeight: 700,
                      fontSize: "0.88rem",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                    }}
                  >
                    <span>PTA</span>
                    <span style={{ fontSize: "0.68rem", opacity: agentType === "PTA" ? 0.9 : 0.7 }}>
                      Therapy Assistant
                    </span>
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={sending}
              id="send-invitation-btn"
              className="btn btn-primary"
              style={{ width: "100%", marginTop: "0.5rem" }}
            >
              {sending ? "Sending Invitation via Resend..." : "Send Invitation via Email"}
            </button>
          </form>
        </div>

        {/* System Active Users Card */}
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Active System Users</h2>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                Current team members with portal access
              </p>
            </div>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                backgroundColor: "var(--success-subtle)",
                color: "var(--success)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Users size={20} />
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {users.map((u) => (
              <div
                key={u._id || u.email}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0.75rem 1rem",
                  backgroundColor: "var(--bg-subtle)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-color)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "50%",
                      backgroundColor: "#ffffff",
                      border: "1px solid var(--border-color)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      color: "var(--primary)",
                    }}
                  >
                    {u.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{u.name}</div>
                    <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                      {u.email}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  {u.name?.toLowerCase().includes("therina") ? (
                    <span className="badge badge-role-manager">MANAGER</span>
                  ) : (
                    <>
                      <select
                        className="form-select"
                        style={{
                          width: "auto",
                          padding: "0.25rem 0.5rem",
                          fontSize: "0.78rem",
                          fontWeight: 600,
                          borderRadius: "6px",
                          cursor: "pointer",
                          backgroundColor:
                            u.role === "manager"
                              ? "#f0fdf4"
                              : u.role === "agent"
                              ? "#ecfdf5"
                              : "#f1f5f9",
                          borderColor:
                            u.role === "manager"
                              ? "#bbf7d0"
                              : u.role === "agent"
                              ? "#a7f3d0"
                              : "#cbd5e1",
                          color:
                            u.role === "manager"
                              ? "#166534"
                              : u.role === "agent"
                              ? "#065f46"
                              : "#334155",
                        }}
                        value={u.role || "agent"}
                        onChange={(e) => {
                          if (u._id) {
                            handleRoleChange(u._id, e.target.value as "agent" | "manager" | "viewer");
                          }
                        }}
                      >
                        <option value="agent">AGENT</option>
                        <option value="viewer">VIEWER</option>
                        <option value="manager">MANAGER</option>
                      </select>

                      {/* Agent Type selector when role is agent */}
                      {u.role === "agent" && (
                        <select
                          className="form-select"
                          title="Cambiar tipo de agente"
                          style={{
                            width: "auto",
                            padding: "0.25rem 0.45rem",
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            borderRadius: "6px",
                            cursor: "pointer",
                            backgroundColor: u.agentType === "PTA" ? "#fef3c7" : "#eff6ff",
                            borderColor: u.agentType === "PTA" ? "#fde68a" : "#bfdbfe",
                            color: u.agentType === "PTA" ? "#b45309" : "#1d4ed8",
                          }}
                          value={u.agentType || "PT"}
                          onChange={(e) => {
                            if (u._id) {
                              handleAgentTypeChange(u._id, e.target.value as "PT" | "PTA");
                            }
                          }}
                        >
                          <option value="PT">PT</option>
                          <option value="PTA">PTA</option>
                        </select>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Invitations History Table */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid var(--border-color)" }}>
          <h2 className="card-title">Sent Invitations History</h2>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "2px" }}>
            Status of issued invitation links
          </p>
        </div>

        {loading ? (
          <div style={{ padding: "2.5rem", textAlign: "center", color: "var(--text-muted)" }}>
            Loading invitations...
          </div>
        ) : invitations.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
            No invitations sent yet.
          </div>
        ) : (
          <div className="table-container" style={{ border: "none" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Recipient Email</th>
                  <th>Assigned Role</th>
                  <th>Invited By</th>
                  <th>Expires On</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {invitations.map((inv) => (
                  <tr key={inv._id}>
                    <td style={{ fontWeight: 600 }}>{inv.email}</td>
                    <td>
                      <span className={`badge badge-role-${inv.role}`}>
                        {inv.role === "manager"
                          ? "Manager"
                          : inv.role === "agent"
                          ? `Agent ${inv.agentType ? `(${inv.agentType})` : ""}`
                          : "Viewer"}
                      </span>
                    </td>
                    <td style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                      {inv.invitedBy?.name || "Administrator"}
                    </td>
                    <td style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                      {formatDate(inv.expiresAt)}
                    </td>
                    <td>
                      {inv.status === "accepted" ? (
                        <span className="badge badge-paid">Accepted</span>
                      ) : inv.status === "pending" ? (
                        <span className="badge badge-pending">Pending</span>
                      ) : (
                        <span className="badge badge-cancelled">Expired</span>
                      )}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div
                        style={{
                          display: "inline-flex",
                          gap: "0.5rem",
                          justifyContent: "flex-end",
                        }}
                      >
                        {inv.status === "pending" && (
                          <button
                            onClick={() => handleCopyLink(inv.token)}
                            className="btn btn-secondary btn-sm"
                            title="Copy Link"
                          >
                            {copiedToken === inv.token ? (
                              <Check size={14} color="var(--success)" />
                            ) : (
                              <Copy size={14} />
                            )}
                            <span style={{ fontSize: "0.75rem" }}>
                              {copiedToken === inv.token ? "Copied" : "Copy"}
                            </span>
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteInvite(inv._id!)}
                          className="btn btn-sm"
                          style={{
                            color: "var(--danger)",
                            border: "1px solid var(--danger-border)",
                            backgroundColor: "var(--danger-subtle)",
                          }}
                          title="Revoke"
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
    </div>
  );
}
