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

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.replace("/login");
    } catch {
      router.replace("/login");
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
            {user?.role !== "viewer" && (
              <Link
                href="/dashboard/invoices/new"
                id="header-create-invoice-btn"
                className="btn btn-primary btn-sm"
              >
                <PlusCircle size={16} />
                <span className="btn-responsive-text">New Weekly Invoice</span>
              </Link>
            )}

            {/* User Profile Chip with Role */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.35rem 0.65rem",
                backgroundColor: "var(--bg-subtle)",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-color)",
              }}
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
              <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>
                {user?.name}
              </span>
              <span className={`badge badge-role-${user?.role || "viewer"}`} style={{ fontSize: "0.68rem", padding: "0.15rem 0.45rem" }}>
                {user?.role === "admin" ? "Admin" : user?.role === "manager" ? "Manager" : "Viewer"}
              </span>
            </div>

            {/* Topbar Sign Out Button */}
            <button
              onClick={handleLogout}
              id="header-logout-btn"
              className="btn btn-secondary btn-sm"
              style={{
                padding: "0.4rem 0.75rem",
                fontSize: "0.82rem",
                display: "flex",
                alignItems: "center",
                gap: "0.35rem",
              }}
              title="Sign Out"
            >
              <LogOut size={14} />
              <span className="btn-responsive-text">Sign Out</span>
            </button>
          </div>
        </header>

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
