"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  FileText,
  PlusCircle,
  Users,
  UserPlus,
  LogOut,
  Menu,
  X,
  Shield,
  UserCheck,
  Building2,
  KeyRound,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { IUser } from "@/lib/types";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<IUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Dropdown & Change Password Modal states
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passSubmitting, setPassSubmitting] = useState(false);
  const [passError, setPassError] = useState("");
  const [passSuccess, setPassSuccess] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => {
        if (!res.ok) throw new Error("No autenticado");
        return res.json();
      })
      .then((data) => {
        if (data.user) {
          setUser(data.user);
        } else {
          router.replace("/login");
        }
      })
      .catch(() => {
        router.replace("/login");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [router]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("#user-dropdown-container")) {
        setUserDropdownOpen(false);
      }
    };
    if (userDropdownOpen) {
      document.addEventListener("click", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("click", handleOutsideClick);
    };
  }, [userDropdownOpen]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.replace("/login");
    } catch {
      router.replace("/login");
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError("");
    setPassSuccess(false);

    if (newPassword.length < 6) {
      setPassError("New password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPassError("New passwords do not match.");
      return;
    }

    setPassSubmitting(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update password");
      }

      setPassSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => {
        setShowPasswordModal(false);
        setPassSuccess(false);
      }, 1800);
    } catch (err: any) {
      setPassError(err.message || "Failed to update password");
    } finally {
      setPassSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          backgroundColor: "var(--bg-app)",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              border: "3px solid #e2e8f0",
              borderTopColor: "var(--primary)",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              margin: "0 auto 1rem",
            }}
          />
          <p style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>
            Verificando sesión segura...
          </p>
          <style jsx>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  const navItems = [
    {
      label: "Invoices",
      href: "/dashboard/invoices",
      icon: FileText,
      active: pathname.startsWith("/dashboard/invoices") || pathname === "/dashboard",
      hidden: user?.role === "viewer",
    },
    {
      label: "Staff Directory",
      href: "/dashboard/workers",
      icon: Users,
      active: pathname === "/dashboard/workers",
      hidden: user?.role === "viewer",
    },
    {
      label: "Agency Assignments",
      href: "/dashboard/assignments",
      icon: Building2,
      active: pathname === "/dashboard/assignments",
      hidden: user?.role === "viewer",
    },
    {
      label: "Team & Invites",
      href: "/dashboard/invitations",
      icon: UserPlus,
      active: pathname === "/dashboard/invitations",
      hidden: user?.role === "viewer",
    },
    {
      label: "Viewer Portal",
      href: "/dashboard/viewer",
      icon: FileText,
      active: pathname === "/dashboard/viewer",
      hidden: user?.role !== "viewer",
    },
  ];

  return (
    <div className="app-container">
      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="modal-overlay"
          style={{ zIndex: 45 }}
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`sidebar ${mobileMenuOpen ? "open" : ""}`}>
        <div className="sidebar-header">
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "9px",
              backgroundColor: "var(--primary)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: "1.1rem",
            }}
          >
            T
          </div>
          <div style={{ flex: 1 }}>
            <span
              style={{
                fontFamily: "var(--font-heading)",
                fontWeight: 800,
                fontSize: "1.1rem",
                color: "var(--text-primary)",
                display: "block",
              }}
            >
              THER-INV
            </span>
            <span
              style={{
                fontSize: "0.68rem",
                color: "var(--text-muted)",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              Agency Invoicing
            </span>
          </div>
          {mobileMenuOpen && (
            <button
              onClick={() => setMobileMenuOpen(false)}
              style={{ color: "var(--text-muted)", padding: "0.25rem" }}
            >
              <X size={20} />
            </button>
          )}
        </div>

        <nav className="sidebar-nav">
          {navItems
            .filter((it) => !it.hidden)
            .map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`nav-item ${item.active ? "active" : ""}`}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="main-content">
        {/* Sticky Header */}
        <header className="top-header">
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <button
              onClick={() => setMobileMenuOpen(true)}
              style={{
                display: "none",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--text-primary)",
              }}
              className="mobile-hamburger-btn"
              id="mobile-drawer-toggle"
            >
              <Menu size={22} />
            </button>
            <span
              style={{
                fontSize: "0.95rem",
                color: "var(--text-secondary)",
                fontWeight: 600,
                letterSpacing: "0.01em",
              }}
            >
              Weekly Invoicing
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            {/* User Profile Chip with Role */}
            {/* User Profile Dropdown Pill */}
            <div id="user-dropdown-container" style={{ position: "relative" }}>
              <button
                type="button"
                onClick={() => setUserDropdownOpen((prev) => !prev)}
                id="user-profile-dropdown-btn"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.35rem 0.65rem",
                  backgroundColor: userDropdownOpen ? "var(--bg-subtle)" : "var(--bg-subtle)",
                  borderRadius: "var(--radius-md)",
                  border: userDropdownOpen ? "1px solid var(--primary)" : "1px solid var(--border-color)",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  outline: "none",
                }}
                title="Account options"
              >
                <div
                  style={{
                    width: "24px",
                    height: "24px",
                    borderRadius: "50%",
                    backgroundColor: "var(--primary-subtle)",
                    color: "var(--primary)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: "0.75rem",
                  }}
                >
                  {user?.name?.charAt(0).toUpperCase() || "U"}
                </div>
                <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)" }}>
                  {user?.name}
                </span>
                <span
                  className={`badge badge-role-${user?.role || "viewer"}`}
                  style={{ fontSize: "0.68rem", padding: "0.15rem 0.45rem" }}
                >
                  {user?.role === "admin" ? "Admin" : user?.role === "manager" ? "Manager" : "Viewer"}
                </span>
                <ChevronDown
                  size={14}
                  style={{
                    color: "var(--text-muted)",
                    transform: userDropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.15s ease",
                  }}
                />
              </button>

              {/* Dropdown Menu */}
              {userDropdownOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 6px)",
                    right: 0,
                    minWidth: "200px",
                    backgroundColor: "#ffffff",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border-color)",
                    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
                    zIndex: 60,
                    overflow: "hidden",
                    padding: "0.35rem",
                  }}
                >
                  <div
                    style={{
                      padding: "0.5rem 0.75rem",
                      borderBottom: "1px solid var(--border-color)",
                      marginBottom: "0.25rem",
                    }}
                  >
                    <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-primary)" }}>
                      {user?.name}
                    </div>
                    <div style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>
                      {user?.email}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setUserDropdownOpen(false);
                      setShowPasswordModal(true);
                      setPassError("");
                      setPassSuccess(false);
                    }}
                    id="dropdown-change-password-btn"
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.6rem",
                      padding: "0.5rem 0.75rem",
                      fontSize: "0.85rem",
                      color: "var(--text-primary)",
                      background: "none",
                      border: "none",
                      borderRadius: "var(--radius-sm)",
                      cursor: "pointer",
                      textAlign: "left",
                      fontWeight: 500,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-subtle)")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                  >
                    <KeyRound size={15} color="var(--primary)" />
                    <span>Change Password</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleLogout}
                    id="dropdown-logout-btn"
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.6rem",
                      padding: "0.5rem 0.75rem",
                      fontSize: "0.85rem",
                      color: "var(--danger)",
                      background: "none",
                      border: "none",
                      borderRadius: "var(--radius-sm)",
                      cursor: "pointer",
                      textAlign: "left",
                      fontWeight: 500,
                      marginTop: "2px",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--danger-subtle)")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                  >
                    <LogOut size={15} color="var(--danger)" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Change Password Modal */}
        {showPasswordModal && (
          <div className="modal-overlay" style={{ zIndex: 100 }}>
            <div
              className="modal-content"
              style={{
                maxWidth: "440px",
                padding: "1.75rem",
                borderRadius: "var(--radius-lg)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "1.25rem",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "8px",
                      backgroundColor: "var(--primary-subtle)",
                      color: "var(--primary)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <KeyRound size={18} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: "1.15rem", fontWeight: 700, margin: 0 }}>
                      Change Password
                    </h3>
                    <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: 0 }}>
                      Update your account security credentials
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowPasswordModal(false)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--text-muted)",
                    padding: "0.25rem",
                  }}
                >
                  <X size={20} />
                </button>
              </div>

              {passError && (
                <div
                  style={{
                    backgroundColor: "var(--danger-subtle)",
                    color: "var(--danger)",
                    border: "1px solid var(--danger-border)",
                    borderRadius: "var(--radius-md)",
                    padding: "0.65rem 0.85rem",
                    marginBottom: "1rem",
                    fontSize: "0.825rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <AlertCircle size={16} />
                  <span>{passError}</span>
                </div>
              )}

              {passSuccess && (
                <div
                  style={{
                    backgroundColor: "var(--success-subtle)",
                    color: "var(--success)",
                    border: "1px solid var(--success-border)",
                    borderRadius: "var(--radius-md)",
                    padding: "0.65rem 0.85rem",
                    marginBottom: "1rem",
                    fontSize: "0.825rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <CheckCircle2 size={16} />
                  <span>Password updated successfully!</span>
                </div>
              )}

              <form onSubmit={handleChangePassword}>
                <div className="form-group" style={{ marginBottom: "1rem" }}>
                  <label className="form-label" style={{ fontSize: "0.85rem" }}>
                    Current Password *
                  </label>
                  <input
                    type="password"
                    required
                    id="current-password-input"
                    className="form-input"
                    placeholder="Enter current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: "1rem" }}>
                  <label className="form-label" style={{ fontSize: "0.85rem" }}>
                    New Password *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    id="new-password-input"
                    className="form-input"
                    placeholder="At least 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: "1.5rem" }}>
                  <label className="form-label" style={{ fontSize: "0.85rem" }}>
                    Confirm New Password *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    id="confirm-password-input"
                    className="form-input"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>

                <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    onClick={() => setShowPasswordModal(false)}
                    className="btn btn-secondary"
                    style={{ padding: "0.5rem 1rem" }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={passSubmitting || passSuccess}
                    id="submit-change-password-btn"
                    className="btn btn-primary"
                    style={{ padding: "0.5rem 1.25rem" }}
                  >
                    {passSubmitting ? "Updating..." : "Update Password"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Content Body */}
        <main
          className={
            pathname === "/dashboard/workers" ||
            pathname === "/dashboard/assignments" ||
            pathname === "/dashboard/invoices" ||
            pathname === "/dashboard/invoices/new" ||
            pathname === "/dashboard/invitations" ||
            pathname === "/dashboard/viewer"
              ? "content-body-full"
              : "content-body"
          }
        >
          {children}
        </main>

        {/* Mobile Navigation Bottom Bar */}
        <nav className="mobile-nav-bar">
          {user?.role !== "viewer" ? (
            <>
              <Link
                href="/dashboard/invoices"
                className={`mobile-nav-btn ${pathname.startsWith("/dashboard/invoices") || pathname === "/dashboard" ? "active" : ""}`}
              >
                <FileText size={20} />
                <span>Invoices</span>
              </Link>
              <Link
                href="/dashboard/workers"
                className={`mobile-nav-btn ${pathname === "/dashboard/workers" ? "active" : ""}`}
              >
                <Users size={20} />
                <span>Staff</span>
              </Link>
              <Link
                href="/dashboard/assignments"
                className={`mobile-nav-btn ${pathname === "/dashboard/assignments" ? "active" : ""}`}
              >
                <Building2 size={20} />
                <span>Agencies</span>
              </Link>
              <Link
                href="/dashboard/invitations"
                className={`mobile-nav-btn ${pathname === "/dashboard/invitations" ? "active" : ""}`}
              >
                <UserPlus size={20} />
                <span>Team</span>
              </Link>
            </>
          ) : (
            <Link
              href="/dashboard/viewer"
              className={`mobile-nav-btn ${pathname === "/dashboard/viewer" ? "active" : ""}`}
            >
              <FileText size={20} />
              <span>Viewer</span>
            </Link>
          )}
        </nav>
      </div>

      <style jsx global>{`
        @media (max-width: 1024px) {
          .mobile-hamburger-btn {
            display: inline-flex !important;
          }
        }
      `}</style>
    </div>
  );
}
