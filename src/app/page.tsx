"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FileText, Shield, Users, ArrowRight, CheckCircle } from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => {
        if (res.ok) {
          router.replace("/dashboard/invoices");
        } else {
          setChecking(false);
        }
      })
      .catch(() => setChecking(false));
  }, [router]);

  if (checking) {
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
            Loading THER-INV...
          </p>
          <style jsx>{`
            @keyframes spin {
              0% {
                transform: rotate(0deg);
              }
              100% {
                transform: rotate(360deg);
              }
            }
          `}</style>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--bg-app)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <header
        style={{
          height: "72px",
          backgroundColor: "#ffffff",
          borderBottom: "1px solid var(--border-color)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 2rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "10px",
              backgroundColor: "var(--primary)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: "1.2rem",
            }}
          >
            T
          </div>
          <div>
            <span
              style={{
                fontFamily: "var(--font-heading)",
                fontWeight: 800,
                fontSize: "1.25rem",
                color: "var(--text-primary)",
              }}
            >
              THER-INV
            </span>
            <span
              style={{
                display: "block",
                fontSize: "0.7rem",
                color: "var(--text-muted)",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                marginTop: "-3px",
              }}
            >
              Agency Invoicing & Payroll
            </span>
          </div>
        </div>

        <div>
          <Link href="/login" id="home-login-btn" className="btn btn-primary">
            Sign In
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "3rem 1.5rem",
        }}
      >
        <div style={{ maxWidth: "860px", textAlign: "center" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.35rem 0.9rem",
              backgroundColor: "var(--primary-subtle)",
              color: "var(--primary)",
              borderRadius: "9999px",
              fontSize: "0.85rem",
              fontWeight: 600,
              marginBottom: "1.5rem",
              border: "1px solid var(--primary-border)",
            }}
          >
            <Shield size={16} /> Private & Secure System
          </div>

          <h1
            style={{
              fontSize: "clamp(2.2rem, 5vw, 3.5rem)",
              lineHeight: 1.15,
              fontWeight: 800,
              marginBottom: "1.25rem",
              color: "var(--text-primary)",
            }}
          >
            Weekly Invoicing & Payroll for Agencies
          </h1>

          <p
            style={{
              fontSize: "1.15rem",
              color: "var(--text-secondary)",
              maxWidth: "680px",
              margin: "0 auto 2.5rem",
              lineHeight: 1.6,
            }}
          >
            A modern, private platform to generate weekly client invoices, maintain active
            agency staff, manage role-based invitations, and ensure effortless payroll
            billing with high visibility on desktop and mobile.
          </p>

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "1rem",
              flexWrap: "wrap",
              marginBottom: "3.5rem",
            }}
          >
            <Link
              href="/login"
              id="hero-start-btn"
              className="btn btn-primary btn-lg"
              style={{ padding: "0.9rem 2rem", fontSize: "1.05rem" }}
            >
              Access Portal <ArrowRight size={18} />
            </Link>
          </div>

          {/* Value Props */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "1.5rem",
              textAlign: "left",
            }}
          >
            <div className="card">
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "10px",
                  backgroundColor: "var(--primary-subtle)",
                  color: "var(--primary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "1rem",
                }}
              >
                <FileText size={22} />
              </div>
              <h3 style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>
                Weekly Invoices
              </h3>
              <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>
                Automatically calculate regular hours, overtime, rates, and totals
                instantly for each weekly payroll period.
              </p>
            </div>

            <div className="card">
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "10px",
                  backgroundColor: "var(--success-subtle)",
                  color: "var(--success)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "1rem",
                }}
              >
                <Users size={22} />
              </div>
              <h3 style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>
                Staff Directory
              </h3>
              <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>
                Maintain an updated directory of all agency workers (RN, PT, CNA,
                therapists) and their customizable hourly rates.
              </p>
            </div>

            <div className="card">
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "10px",
                  backgroundColor: "var(--warning-subtle)",
                  color: "var(--warning)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "1rem",
                }}
              >
                <Shield size={22} />
              </div>
              <h3 style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>
                Invitations & Roles
              </h3>
              <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>
                Therina and administrators can send secure invitation links with
                granular roles (Manager or Viewer).
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer
        style={{
          borderTop: "1px solid var(--border-color)",
          backgroundColor: "#ffffff",
          padding: "1.5rem 2rem",
          textAlign: "center",
          fontSize: "0.85rem",
          color: "var(--text-muted)",
        }}
      >
        <div>THER-INV © {new Date().getFullYear()} — All rights reserved.</div>
      </footer>
    </div>
  );
}
