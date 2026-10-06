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
      label: "Overview",
      href: "/dashboard",
      icon: LayoutDashboard,
      active: pathname === "/dashboard",
    },
    {
      label: "Weekly Invoices",
      href: "/dashboard/invoices",
      icon: FileText,
      active: pathname === "/dashboard/invoices",
    },
    {
      label: "Create Invoice",
      href: "/dashboard/invoices/new",
      icon: PlusCircle,
      active: pathname === "/dashboard/invoices/new",
      hidden: user?.role === "viewer",
    },
    {
      label: "Staff Directory",
      href: "/dashboard/workers",
      icon: Users,
      active: pathname === "/dashboard/workers",
    },
    {
      label: "Team & Invites",
      href: "/dashboard/invitations",
      icon: UserPlus,
      active: pathname === "/dashboard/invitations",
      hidden: user?.role === "viewer",
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
              Agency Invoicing & Payroll
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

        {/* Sidebar Footer User Info */}
        <div
          style={{
            padding: "1rem 1.25rem",
            borderTop: "1px solid var(--border-color)",
            backgroundColor: "#f8fafc",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
            <div
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "50%",
                backgroundColor: "var(--primary-subtle)",
                color: "var(--primary)",
                border: "1px solid var(--primary-border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: "0.95rem",
              }}
            >
              {user?.name?.charAt(0).toUpperCase() || "U"}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontWeight: 600,
                  fontSize: "0.875rem",
                  color: "var(--text-primary)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {user?.name}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                <span className={`badge badge-role-${user?.role || "viewer"}`}>
                  {user?.role === "admin" ? "Admin" : user?.role === "manager" ? "Manager" : "Viewer"}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            id="sidebar-logout-btn"
            className="btn btn-secondary btn-sm"
            style={{ width: "100%", justifyContent: "center" }}
          >
            <LogOut size={15} /> Sign Out
          </button>
        </div>
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
                fontWeight: 500,
              }}
            >
              Weekly Invoicing & Payroll
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
                <span className="btn-responsive-text">New Invoice</span>
              </Link>
            )}

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
              <UserCheck size={16} color="var(--primary)" />
              <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>
                {user?.name?.split(" ")[0]}
              </span>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className={pathname === "/dashboard/workers" ? "content-body-full" : "content-body"}>
          {children}
        </main>

        {/* Mobile Navigation Bottom Bar */}
        <nav className="mobile-nav-bar">
          <Link
            href="/dashboard"
            className={`mobile-nav-btn ${pathname === "/dashboard" ? "active" : ""}`}
          >
            <LayoutDashboard size={20} />
            <span>Home</span>
          </Link>
          <Link
            href="/dashboard/invoices"
            className={`mobile-nav-btn ${pathname === "/dashboard/invoices" ? "active" : ""}`}
          >
            <FileText size={20} />
            <span>Invoices</span>
          </Link>
          {user?.role !== "viewer" && (
            <Link
              href="/dashboard/invoices/new"
              className={`mobile-nav-btn ${pathname === "/dashboard/invoices/new" ? "active" : ""}`}
            >
              <PlusCircle size={20} />
              <span>Create</span>
            </Link>
          )}
          <Link
            href="/dashboard/workers"
            className={`mobile-nav-btn ${pathname === "/dashboard/workers" ? "active" : ""}`}
          >
            <Users size={20} />
            <span>Staff</span>
          </Link>
          {user?.role !== "viewer" && (
            <Link
              href="/dashboard/invitations"
              className={`mobile-nav-btn ${pathname === "/dashboard/invitations" ? "active" : ""}`}
            >
              <UserPlus size={20} />
              <span>Team</span>
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
