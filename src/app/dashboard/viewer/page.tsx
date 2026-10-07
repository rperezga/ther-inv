"use client";

import { useEffect, useState } from "react";
import { FileText, Shield, User, Clock, CheckCircle2 } from "lucide-react";
import { IUser } from "@/lib/types";

export default function ViewerPortalPage() {
  const [user, setUser] = useState<IUser | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.user) setUser(data.user);
      })
      .catch((err) => console.error(err));
  }, []);

  return (
    <div style={{ width: "100%", maxWidth: "100%" }}>
      {/* Header */}
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.6rem", fontWeight: 800, marginBottom: "0.2rem" }}>
          Viewer Portal
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem" }}>
          Read-only access and activity dashboard for invited review members.
        </p>
      </div>

      <div
        className="card"
        style={{
          padding: "2rem",
          display: "flex",
          flexDirection: "column",
          gap: "1.25rem",
          maxWidth: "680px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              backgroundColor: "var(--primary-subtle)",
              color: "var(--primary)",
              border: "1px solid var(--primary-border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: "1.2rem",
            }}
          >
            {user?.name?.charAt(0).toUpperCase() || "V"}
          </div>

          <div>
            <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)" }}>
              Welcome, {user?.name || "Viewer"}
            </div>
            <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
              {user?.email} • <span className="badge badge-role-viewer">Viewer Account</span>
            </div>
          </div>
        </div>

        <div
          style={{
            padding: "1rem 1.25rem",
            backgroundColor: "var(--bg-subtle)",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border-color)",
            fontSize: "0.88rem",
            color: "var(--text-secondary)",
            lineHeight: 1.6,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.35rem" }}>
            <Shield size={16} color="var(--primary)" />
            <span>Viewer Access Information</span>
          </div>
          Your account is currently set to <strong>Viewer mode</strong>. You can review shared files and reports. If you require higher administrative or manager privileges to create or issue weekly invoices, please reach out to your administrator or Therina (Manager).
        </div>
      </div>
    </div>
  );
}
