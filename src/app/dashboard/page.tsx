"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.user?.role === "viewer") {
          router.replace("/dashboard/viewer");
        } else if (data.user?.role === "agent") {
          router.replace("/dashboard/agent");
        } else {
          router.replace("/dashboard/invoices");
        }
      })
      .catch(() => router.replace("/login"));
  }, [router]);

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "60vh",
        color: "var(--text-muted)",
        fontSize: "0.95rem",
      }}
    >
      Loading Invoices...
    </div>
  );
}
