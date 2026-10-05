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
  const [role, setRole] = useState<"manager" | "viewer">("viewer");
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState("");
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
    setLastCreatedUrl(null);

    if (!email.trim()) {
      setFormError("Please enter an email address");
      return;
    }

    setSending(true);

    try {
      const res = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to generate invitation");
      }

      const fullUrl = `${window.location.origin}${data.inviteUrl}`;
      setLastCreatedUrl(fullUrl);
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

  const formatDate = (d?: string | Date) => {
    if (!d) return "-";
    return new Date(d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div style={{ maxWidth: "1150px", margin: "0 auto" }}>
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

          {lastCreatedUrl && (
            <div
              style={{
                backgroundColor: "var(--success-subtle)",
                border: "1px solid var(--success-border)",
                borderRadius: "var(--radius-md)",
                padding: "1rem",
                marginBottom: "1.25rem",
              }}
            >
              <p style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--success)", marginBottom: "0.5rem" }}>
                Invitation link generated successfully!
              </p>
              <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
                Share this secure link directly with the user:
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
                onChange={(e) => setRole(e.target.value as "manager" | "viewer")}
              >
                <option value="viewer">
                  Viewer (Read-only access to invoices and reports)
                </option>
                <option value="manager">
                  Manager (Create & edit invoices, manage staff directory)
                </option>
              </select>
            </div>

            <button
              type="submit"
              disabled={sending}
              id="send-invitation-btn"
              className="btn btn-primary"
              style={{ width: "100%", marginTop: "0.5rem" }}
            >
              {sending ? "Generating Invitation..." : "Generate Invitation Link"}
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

                <span className={`badge badge-role-${u.role}`}>
                  {u.role === "admin"
                    ? "Admin"
                    : u.role === "manager"
                    ? "Manager"
                    : "Viewer"}
                </span>
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
                        {inv.role === "manager" ? "Manager" : "Viewer"}
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
