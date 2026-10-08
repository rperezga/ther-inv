"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Lock, Mail, User, AlertCircle, CheckCircle, ArrowRight } from "lucide-react";

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite") || "";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [tokenInput, setTokenInput] = useState(inviteToken);
  const [roleInfo, setRoleInfo] = useState<string | null>(null);
  const [invitedByInfo, setInvitedByInfo] = useState<string | null>(null);

  const [validatingToken, setValidatingToken] = useState(false);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (inviteToken) {
      validateInvitation(inviteToken);
    }
  }, [inviteToken]);

  const validateInvitation = async (token: string) => {
    if (!token) return;
    setValidatingToken(true);
    setError("");

    try {
      const res = await fetch(`/api/invitations/validate?token=${token}`);
      const data = await res.json();

      if (res.ok && data.valid) {
        setTokenValid(true);
        setEmail(data.email);
        setRoleInfo(data.role);
        setInvitedByInfo(data.invitedBy?.name || "Administrator");
      } else {
        setTokenValid(false);
        setError(data.error || "Invalid or expired invitation");
      }
    } catch {
      setTokenValid(false);
      setError("Failed to verify invitation token");
    } finally {
      setValidatingToken(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          invitationToken: tokenInput,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to complete registration");
      }

      if (data.user?.role === "agent") {
        router.push("/dashboard/agent");
      } else if (data.user?.role === "viewer") {
        router.push("/dashboard/viewer");
      } else {
        router.push("/dashboard/invoices");
      }
    } catch (err: any) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "480px",
        backgroundColor: "#ffffff",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--border-color)",
        boxShadow: "var(--shadow-xl)",
        padding: "2.5rem 2rem",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
        <h1 style={{ fontSize: "1.65rem", marginBottom: "0.35rem" }}>
          Accept Invitation
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
          Set up your credentials to join the THER-INV team
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

      {/* Invitation Token Input if not provided via URL */}
      {!tokenValid && (
        <div
          style={{
            marginBottom: "1.5rem",
            padding: "1rem",
            backgroundColor: "var(--bg-subtle)",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border-color)",
          }}
        >
          <label className="form-label" htmlFor="token-input">
            Invitation Code or Token
          </label>
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.35rem" }}>
            <input
              id="token-input"
              type="text"
              className="form-input"
              placeholder="Paste invitation token here..."
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
            />
            <button
              type="button"
              onClick={() => validateInvitation(tokenInput)}
              disabled={validatingToken || !tokenInput}
              className="btn btn-primary btn-sm"
            >
              {validatingToken ? "Checking..." : "Verify"}
            </button>
          </div>
        </div>
      )}

      {tokenValid && (
        <div
          style={{
            backgroundColor: "var(--success-subtle)",
            border: "1px solid var(--success-border)",
            borderRadius: "var(--radius-md)",
            padding: "0.85rem 1rem",
            marginBottom: "1.5rem",
            display: "flex",
            alignItems: "flex-start",
            gap: "0.75rem",
          }}
        >
          <CheckCircle size={20} color="var(--success)" style={{ marginTop: "2px" }} />
          <div>
            <p style={{ fontWeight: 600, color: "var(--success)", fontSize: "0.9rem" }}>
              Valid invitation from {invitedByInfo}
            </p>
            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
              Assigned role:{" "}
              <strong style={{ textTransform: "capitalize" }}>{roleInfo}</strong>
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleRegister}>
        <div className="form-group">
          <label className="form-label" htmlFor="register-name">
            Full Name
          </label>
          <div style={{ position: "relative" }}>
            <input
              id="register-name"
              type="text"
              required
              className="form-input"
              placeholder="e.g. Carmen Perez"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ paddingLeft: "2.5rem" }}
            />
            <User
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

        <div className="form-group">
          <label className="form-label" htmlFor="register-email">
            Email Address
          </label>
          <div style={{ position: "relative" }}>
            <input
              id="register-email"
              type="email"
              required
              readOnly={tokenValid === true}
              className="form-input"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                paddingLeft: "2.5rem",
                backgroundColor: tokenValid ? "var(--bg-subtle)" : undefined,
              }}
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

        <div className="form-group">
          <label className="form-label" htmlFor="register-password">
            Password
          </label>
          <div style={{ position: "relative" }}>
            <input
              id="register-password"
              type="password"
              required
              className="form-input"
              placeholder="Minimum 6 characters"
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

        <div className="form-group" style={{ marginBottom: "1.75rem" }}>
          <label className="form-label" htmlFor="register-confirm-password">
            Confirm Password
          </label>
          <div style={{ position: "relative" }}>
            <input
              id="register-confirm-password"
              type="password"
              required
              className="form-input"
              placeholder="Repeat your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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
          id="register-submit-btn"
          disabled={loading}
          className="btn btn-primary"
          style={{ width: "100%", padding: "0.85rem", fontSize: "0.95rem" }}
        >
          {loading ? "Creating account..." : "Complete Registration"}
          {!loading && <ArrowRight size={18} />}
        </button>
      </form>

      <div
        style={{
          marginTop: "1.5rem",
          textAlign: "center",
          fontSize: "0.85rem",
          color: "var(--text-muted)",
        }}
      >
        Already have an account?{" "}
        <Link href="/login" style={{ color: "var(--primary)", fontWeight: 600 }}>
          Sign In
        </Link>
      </div>
    </div>
  );
}

export default function RegisterPage() {
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
      <Suspense fallback={<div>Loading form...</div>}>
        <RegisterContent />
      </Suspense>
    </div>
  );
}
