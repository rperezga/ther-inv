"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, Mail, AlertCircle, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Invalid credentials");
      }

      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to connect to server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--bg-app)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "460px",
          backgroundColor: "#ffffff",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--border-color)",
          boxShadow: "var(--shadow-xl)",
          padding: "2.5rem 2rem",
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "14px",
              backgroundColor: "var(--primary)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: "1.5rem",
              margin: "0 auto 1rem",
              boxShadow: "0 4px 12px rgba(37, 99, 235, 0.25)",
            }}
          >
            T
          </div>
          <h1 style={{ fontSize: "1.65rem", marginBottom: "0.35rem" }}>
            Welcome to THER-INV
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            Sign in to manage agency weekly invoices and payroll
          </p>
        </div>

        {error && (
          <div
            style={{
              backgroundColor: "var(--danger-subtle)",
              color: "var(--danger)",
              border: "1px solid var(--danger-border)",
              borderRadius: "var(--radius-md)",
              padding: "0.75rem 1rem",
              marginBottom: "1.25rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              fontSize: "0.875rem",
            }}
          >
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {seedStatus && (
          <div
            style={{
              backgroundColor: "var(--primary-subtle)",
              color: "var(--primary)",
              border: "1px solid var(--primary-border)",
              borderRadius: "var(--radius-md)",
              padding: "0.75rem 1rem",
              marginBottom: "1.25rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              fontSize: "0.875rem",
            }}
          >
            <Sparkles size={18} />
            <span>{seedStatus}</span>
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label" htmlFor="email-input">
              Email Address
            </label>
            <div style={{ position: "relative" }}>
              <input
                id="email-input"
                type="email"
                required
                className="form-input"
                placeholder="user@agency.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ paddingLeft: "2.5rem" }}
              />
              <Mail
                size={18}
                style={{
                  position: "absolute",
                  left: "0.85rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text-muted)",
                }}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: "1.75rem" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <label className="form-label" htmlFor="password-input">
                Password
              </label>
            </div>
            <div style={{ position: "relative" }}>
              <input
                id="password-input"
                type="password"
                required
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingLeft: "2.5rem" }}
              />
              <Lock
                size={18}
                style={{
                  position: "absolute",
                  left: "0.85rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text-muted)",
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            id="login-submit-btn"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: "100%", padding: "0.85rem", fontSize: "0.95rem" }}
          >
            {loading ? "Signing in..." : "Sign In to Portal"}
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        {/* Register invitation footnote */}
        <div
          style={{
            marginTop: "1.5rem",
            textAlign: "center",
            fontSize: "0.85rem",
            color: "var(--text-muted)",
          }}
        >
          Have an invitation?{" "}
          <Link
            href="/register"
            style={{ color: "var(--primary)", fontWeight: 600 }}
          >
            Register here
          </Link>
        </div>
      </div>
    </div>
  );
}
