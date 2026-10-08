"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar as CalendarIcon,
  User,
  Plus,
  Check,
  Clock,
  ChevronLeft,
  ChevronRight,
  LogOut,
  AlertCircle,
  Trash2,
  Sparkles,
  Stethoscope,
  FileCheck2,
  CalendarCheck,
} from "lucide-react";
import { IAgentVisit, IUser } from "@/lib/types";

// Helper to format date to "YYYY-MM-DD"
function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Helper to format date for display in Spanish/English
function formatDisplayDate(dateKey: string): string {
  if (!dateKey) return "";
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("es-ES", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export default function AgentPortalPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<IUser | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // Form states
  const [patientName, setPatientName] = useState("");
  const [serviceType, setServiceType] = useState("PT Visit");
  const [notes, setNotes] = useState("");
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState(false);

  // Visits list state
  const [visits, setVisits] = useState<IAgentVisit[]>([]);
  const [loadingVisits, setLoadingVisits] = useState(true);
  const [activeTab, setActiveTab] = useState<"form" | "history">("form");

  const agentRole = (currentUser as any)?.agentType === "PTA" ? "PTA" : "PT";
  const isPTA = agentRole === "PTA";

  // Fast service definitions
  const serviceOptions = useMemo(() => {
    if (isPTA) {
      return [
        { id: "Visit", label: "Standard Visit" },
        { id: "Missed Visit", label: "Missed Visit" },
        { id: "Special Rate", label: "Special Rate" },
      ];
    }
    return [
      { id: "SOC", label: "Start of Care" },
      { id: "Eval", label: "Evaluation" },
      { id: "ReEval", label: "Re-Evaluation" },
      { id: "ReCert", label: "Recertification" },
      { id: "Disch", label: "Discharge" },
      { id: "Missed Visit", label: "Missed Visit" },
    ];
  }, [isPTA]);

  // Set initial serviceType when options change
  useEffect(() => {
    if (serviceOptions.length > 0 && !serviceOptions.some((s) => s.id === serviceType)) {
      setServiceType(serviceOptions[0].id);
    }
  }, [serviceOptions, serviceType]);

  // Load User Info
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => {
        if (!res.ok) throw new Error("No autenticado");
        return res.json();
      })
      .then((data) => {
        if (data.user) {
          setCurrentUser(data.user);
        } else {
          router.replace("/login");
        }
      })
      .catch(() => router.replace("/login"))
      .finally(() => setLoadingUser(false));
  }, [router]);

  // Load Past Visits
  const loadVisits = async () => {
    try {
      const res = await fetch("/api/agent/visits");
      const data = await res.json();
      if (res.ok && data.visits) {
        setVisits(data.visits);
      }
    } catch (err) {
      console.error("Error loading visits:", err);
    } finally {
      setLoadingVisits(false);
    }
  };

  useEffect(() => {
    loadVisits();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.replace("/login");
    } catch {
      router.replace("/login");
    }
  };

  // Generate Calendar Weeks:
  // Show past 3 weeks, current week, and next week (5 weeks total)
  const calendarWeeks = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Current week Sunday (or Monday depending on start)
    const currentDayOfWeek = today.getDay(); // 0 is Sunday
    // Start of current week (Sunday)
    const currentWeekStart = new Date(today);
    currentWeekStart.setDate(today.getDate() - currentDayOfWeek);

    // 3 weeks ago Sunday
    const calendarStart = new Date(currentWeekStart);
    calendarStart.setDate(calendarStart.getDate() - 21); // 3 weeks back

    const weeks: {
      weekIndex: number;
      label: string;
      isCurrentWeek: boolean;
      days: { date: Date; key: string; isToday: boolean; isPast: boolean; isFuture: boolean }[];
    }[] = [];

    // Build 5 consecutive weeks (3 past, 1 current, 1 next)
    for (let w = 0; w < 5; w++) {
      const weekStartDate = new Date(calendarStart);
      weekStartDate.setDate(calendarStart.getDate() + w * 7);

      const days = [];
      let isCurrentWeek = false;

      for (let d = 0; d < 7; d++) {
        const dayDate = new Date(weekStartDate);
        dayDate.setDate(weekStartDate.getDate() + d);
        const key = toDateKey(dayDate);

        const isToday = dayDate.getTime() === today.getTime();
        if (isToday) isCurrentWeek = true;

        days.push({
          date: dayDate,
          key,
          isToday,
          isPast: dayDate.getTime() < today.getTime(),
          isFuture: dayDate.getTime() > today.getTime(),
        });
      }

      let label = `Semana ${w + 1}`;
      if (w === 0) label = "Hace 3 semanas";
      else if (w === 1) label = "Hace 2 semanas";
      else if (w === 2) label = "Semana anterior";
      else if (w === 3) label = "Semana actual";
      else if (w === 4) label = "Semana próxima";

      weeks.push({
        weekIndex: w,
        label,
        isCurrentWeek: w === 3,
        days,
      });
    }

    return weeks;
  }, []);

  // Toggle date selection (can select 1 or multiple non-consecutive days)
  const toggleDateSelection = (key: string) => {
    setFormError("");
    setSelectedDates((prev) => {
      if (prev.includes(key)) {
        return prev.filter((d) => d !== key);
      } else {
        return [...prev, key].sort();
      }
    });
  };

  // Submit Visit Form
  const handleSubmitVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess(false);

    if (!patientName.trim()) {
      setFormError("Por favor escribe el nombre del paciente.");
      return;
    }

    if (selectedDates.length === 0) {
      setFormError("Debes seleccionar al menos un día en el calendario.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/agent/visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientName,
          serviceType,
          visitDates: selectedDates,
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al registrar la visita");
      }

      setFormSuccess(true);
      setPatientName("");
      setSelectedDates([]);
      setNotes("");
      loadVisits();

      setTimeout(() => {
        setFormSuccess(false);
      }, 3500);
    } catch (err: any) {
      setFormError(err.message || "Error al enviar la visita");
    } finally {
      setSubmitting(false);
    }
  };

  // Delete a pending visit
  const handleDeleteVisit = async (id?: string) => {
    if (!id) return;
    if (!confirm("¿Deseas eliminar este registro de visita?")) return;

    try {
      const res = await fetch(`/api/agent/visits?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setVisits((prev) => prev.filter((v) => v._id !== id));
      }
    } catch {
      alert("Error al eliminar la visita");
    }
  };

  if (loadingUser) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f8fafc",
          color: "#64748b",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              border: "3px solid #cbd5e1",
              borderTopColor: "#2563eb",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
              margin: "0 auto 12px",
            }}
          />
          <p style={{ fontSize: "0.9rem", fontWeight: 500 }}>Cargando portal de agente...</p>
        </div>
      </div>
    );
  }

  const dayHeaders = ["D", "L", "M", "M", "J", "V", "S"];

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#f8fafc",
        display: "flex",
        flexDirection: "column",
        color: "#0f172a",
        fontFamily: "var(--font-body, -apple-system, sans-serif)",
      }}
    >
      {/* Top Bar with Responsive Optimization */}
      <header className="agent-header">
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              backgroundColor: "#2563eb",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: "1rem",
              boxShadow: "0 2px 4px rgba(37,99,235,0.25)",
            }}
          >
            T
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: "1.05rem", lineHeight: 1.2 }}>
              THER-INV
            </div>
            <div
              style={{
                fontSize: "0.72rem",
                color: "#059669",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  backgroundColor: "#059669",
                  display: "inline-block",
                }}
              />
              Portal de Agente
            </div>
          </div>
        </div>

        {/* User Info & Logout Pill */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              padding: "0.35rem 0.65rem",
              borderRadius: "9999px",
              backgroundColor: "#f1f5f9",
              fontSize: "0.8rem",
              fontWeight: 600,
              color: "#334155",
            }}
          >
            <User size={13} style={{ color: "#2563eb" }} />
            <span style={{ maxWidth: "140px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {currentUser?.name || "Agente"}
            </span>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            title="Cerrar sesión"
            style={{
              padding: "0.45rem",
              borderRadius: "8px",
              backgroundColor: "#fef2f2",
              color: "#dc2626",
              border: "1px solid #fee2e2",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <LogOut size={15} />
          </button>
        </div>
      </header>

      {/* Main Container with Responsive Classes */}
      <main className="agent-portal-main">
        {/* Navigation Tabs (Segmented Control) */}
        <div className="agent-tabs-container">
          <button
            type="button"
            onClick={() => setActiveTab("form")}
            className={`agent-tab-btn ${activeTab === "form" ? "active" : ""}`}
          >
            <Plus size={16} />
            Registrar Visita
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`agent-tab-btn ${activeTab === "history" ? "active" : ""}`}
          >
            <CalendarCheck size={16} />
            Mis Registros
            {visits.length > 0 && (
              <span className="agent-tab-badge">
                {visits.length}
              </span>
            )}
          </button>
        </div>

        {activeTab === "form" ? (
          /* FORM VIEW */
          <div className="agent-form-card">
            {/* Header info */}
            <div style={{ marginBottom: "1.25rem" }}>
              <h1 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0f172a", marginBottom: "0.25rem" }}>
                Registro Rápido de Visitas
              </h1>
              <p style={{ fontSize: "0.82rem", color: "#64748b" }}>
                Ingresa el paciente y toca en el calendario los días en que fue atendido.
              </p>
            </div>

            {/* Success message */}
            {formSuccess && (
              <div
                style={{
                  backgroundColor: "#ecfdf5",
                  border: "1px solid #a7f3d0",
                  color: "#065f46",
                  borderRadius: "10px",
                  padding: "0.85rem 1rem",
                  marginBottom: "1rem",
                  fontSize: "0.85rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.6rem",
                }}
              >
                <Check size={18} style={{ color: "#059669", flexShrink: 0 }} />
                <span>
                  <strong>¡Visita registrada con éxito!</strong> Los días fueron guardados y quedan listos para su facturación semanal.
                </span>
              </div>
            )}

            {/* Error message */}
            {formError && (
              <div
                style={{
                  backgroundColor: "#fef2f2",
                  border: "1px solid #fecaca",
                  color: "#b91c1c",
                  borderRadius: "10px",
                  padding: "0.85rem 1rem",
                  marginBottom: "1rem",
                  fontSize: "0.85rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.6rem",
                }}
              >
                <AlertCircle size={18} style={{ color: "#dc2626", flexShrink: 0 }} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitVisit} className="agent-form-inner">
              <div className="agent-form-split">
                {/* Column 1: Patient info, service type, notes, submit button */}
                <div className="agent-col-fields">
                  {/* Patient Name Input */}
                  <div style={{ marginBottom: "1.1rem" }}>
                    <label
                      htmlFor="patient-name-input"
                      style={{
                        display: "block",
                        fontSize: "0.85rem",
                        fontWeight: 700,
                        color: "#1e293b",
                        marginBottom: "0.4rem",
                      }}
                    >
                      Nombre del Paciente <span style={{ color: "#dc2626" }}>*</span>
                    </label>
                    <div style={{ position: "relative" }}>
                      <input
                        id="patient-name-input"
                        type="text"
                        required
                        placeholder="Ej. Juan Pérez o Smith, John"
                        value={patientName}
                        onChange={(e) => setPatientName(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "0.75rem 1rem 0.75rem 2.4rem",
                          borderRadius: "10px",
                          border: "1.5px solid #cbd5e1",
                          fontSize: "0.95rem",
                          color: "#0f172a",
                          backgroundColor: "#ffffff",
                          outline: "none",
                          transition: "border-color 0.15s ease",
                        }}
                        onFocus={(e) => (e.target.style.borderColor = "#2563eb")}
                        onBlur={(e) => (e.target.style.borderColor = "#cbd5e1")}
                      />
                      <User
                        size={17}
                        style={{
                          position: "absolute",
                          left: "0.8rem",
                          top: "50%",
                          transform: "translateY(-50%)",
                          color: "#94a3b8",
                        }}
                      />
                    </div>
                  </div>

                  {/* Dynamic Fast Service Type Buttons based on Agent Role (PT vs PTA) */}
                  <div style={{ marginBottom: "1.1rem" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.4rem" }}>
                      <label
                        style={{
                          fontSize: "0.85rem",
                          fontWeight: 700,
                          color: "#1e293b",
                        }}
                      >
                        Tipo de Servicio
                      </label>
                      <span
                        style={{
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: "6px",
                          backgroundColor: isPTA ? "#fef3c7" : "#eff6ff",
                          color: isPTA ? "#b45309" : "#1d4ed8",
                          border: isPTA ? "1px solid #fde68a" : "1px solid #bfdbfe",
                        }}
                      >
                        Rol: {agentRole}
                      </span>
                    </div>

                    <div className="agent-service-grid">
                      {serviceOptions.map((opt) => {
                        const isSelected = serviceType === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setServiceType(opt.id)}
                            style={{
                              padding: "0.6rem 0.4rem",
                              borderRadius: "10px",
                              border: isSelected ? "2px solid #2563eb" : "1px solid #cbd5e1",
                              backgroundColor: isSelected ? "#eff6ff" : "#ffffff",
                              color: isSelected ? "#1d4ed8" : "#334155",
                              fontWeight: isSelected ? 800 : 600,
                              fontSize: "0.82rem",
                              cursor: "pointer",
                              transition: "all 0.15s ease",
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "2px",
                              textAlign: "center",
                              boxShadow: isSelected ? "0 2px 5px rgba(37,99,235,0.15)" : "none",
                            }}
                          >
                            <span style={{ fontSize: "0.92rem", fontWeight: 800 }}>{opt.id}</span>
                            <span
                              style={{
                                fontSize: "0.68rem",
                                color: isSelected ? "#2563eb" : "#64748b",
                                lineHeight: 1.1,
                              }}
                            >
                              {opt.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Optional Notes */}
                  <div style={{ marginBottom: "1.1rem" }}>
                    <label
                      htmlFor="visit-notes"
                      style={{
                        display: "block",
                        fontSize: "0.85rem",
                        fontWeight: 700,
                        color: "#1e293b",
                        marginBottom: "0.4rem",
                      }}
                    >
                      Notas adicionales (opcional)
                    </label>
                    <textarea
                      id="visit-notes"
                      rows={2}
                      placeholder="Ej. Visita realizada en la mañana, notas pendientes..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "0.6rem 0.85rem",
                        borderRadius: "10px",
                        border: "1.5px solid #cbd5e1",
                        fontSize: "0.88rem",
                        color: "#0f172a",
                        backgroundColor: "#ffffff",
                        outline: "none",
                        resize: "none",
                      }}
                    />
                  </div>

                  {/* Submit CTA Button (Desktop left-aligned, full width on mobile) */}
                  <button
                    type="submit"
                    disabled={submitting || selectedDates.length === 0}
                    style={{
                      width: "100%",
                      padding: "0.85rem",
                      borderRadius: "12px",
                      border: "none",
                      backgroundColor:
                        selectedDates.length === 0 ? "#94a3b8" : "#2563eb",
                      color: "#ffffff",
                      fontSize: "0.95rem",
                      fontWeight: 700,
                      cursor: selectedDates.length === 0 ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.5rem",
                      boxShadow:
                        selectedDates.length === 0
                          ? "none"
                          : "0 4px 12px rgba(37,99,235,0.3)",
                      transition: "background-color 0.15s ease",
                      marginTop: "auto",
                    }}
                  >
                    {submitting ? (
                      <>
                        <div
                          style={{
                            width: "18px",
                            height: "18px",
                            border: "2px solid #ffffff",
                            borderTopColor: "transparent",
                            borderRadius: "50%",
                            animation: "spin 0.6s linear infinite",
                          }}
                        />
                        <span>Guardando visitas...</span>
                      </>
                    ) : (
                      <>
                        <Check size={18} />
                        <span>
                          Guardar Visitas ({selectedDates.length}{" "}
                          {selectedDates.length === 1 ? "día" : "días"})
                        </span>
                      </>
                    )}
                  </button>
                </div>

                {/* Column 2: Interactive Multi-Week Calendar Picker */}
                <div className="agent-col-calendar">
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: "0.4rem",
                    }}
                  >
                    <label
                      style={{
                        fontSize: "0.85rem",
                        fontWeight: 700,
                        color: "#1e293b",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.35rem",
                      }}
                    >
                      <CalendarIcon size={16} style={{ color: "#2563eb" }} />
                      Días de Visita (Selección Múltiple) <span style={{ color: "#dc2626" }}>*</span>
                    </label>
                    {selectedDates.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedDates([])}
                        style={{
                          fontSize: "0.75rem",
                          color: "#dc2626",
                          fontWeight: 600,
                          cursor: "pointer",
                          textDecoration: "underline",
                        }}
                      >
                        Limpiar ({selectedDates.length})
                      </button>
                    )}
                  </div>

                  <p style={{ fontSize: "0.76rem", color: "#64748b", marginBottom: "0.5rem" }}>
                    Toca uno o varios días en los que atendiste a este paciente:
                  </p>

                  {/* Calendar Grid Container */}
                  <div className="agent-calendar-box">
                    {/* Days Header */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(7, 1fr)",
                        textAlign: "center",
                        fontWeight: 700,
                        fontSize: "0.72rem",
                        color: "#64748b",
                        marginBottom: "0.35rem",
                      }}
                    >
                      {dayHeaders.map((dh, idx) => (
                        <div key={idx}>{dh}</div>
                      ))}
                    </div>

                    {/* Weeks Rows */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                      {calendarWeeks.map((week) => (
                        <div key={week.weekIndex}>
                          <div
                            style={{
                              fontSize: "0.68rem",
                              fontWeight: 700,
                              color: week.isCurrentWeek ? "#2563eb" : "#94a3b8",
                              textTransform: "uppercase",
                              letterSpacing: "0.03em",
                              marginBottom: "0.2rem",
                              display: "flex",
                              alignItems: "center",
                              gap: "0.3rem",
                            }}
                          >
                            {week.isCurrentWeek && (
                              <span
                                style={{
                                  width: "6px",
                                  height: "6px",
                                  borderRadius: "50%",
                                  backgroundColor: "#2563eb",
                                }}
                              />
                            )}
                            {week.label}
                          </div>

                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "repeat(7, 1fr)",
                              gap: "0.25rem",
                            }}
                          >
                            {week.days.map((day) => {
                              const isSelected = selectedDates.includes(day.key);
                              return (
                                <button
                                  key={day.key}
                                  type="button"
                                  onClick={() => toggleDateSelection(day.key)}
                                  className="agent-day-btn"
                                  style={{
                                    borderRadius: "8px",
                                    border: isSelected
                                      ? "2px solid #2563eb"
                                      : day.isToday
                                      ? "1.5px solid #93c5fd"
                                      : "1px solid #e2e8f0",
                                    backgroundColor: isSelected
                                      ? "#2563eb"
                                      : day.isToday
                                      ? "#eff6ff"
                                      : "#ffffff",
                                    color: isSelected
                                      ? "#ffffff"
                                      : day.isToday
                                      ? "#1d4ed8"
                                      : "#1e293b",
                                    fontWeight: isSelected || day.isToday ? 800 : 500,
                                    fontSize: "0.85rem",
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    cursor: "pointer",
                                    transition: "all 0.1s ease",
                                    boxShadow: isSelected
                                      ? "0 2px 4px rgba(37,99,235,0.2)"
                                      : "none",
                                    position: "relative",
                                  }}
                                >
                                  <span>{day.date.getDate()}</span>
                                  {day.isToday && !isSelected && (
                                    <span
                                      style={{
                                        fontSize: "0.55rem",
                                        lineHeight: 1,
                                        fontWeight: 700,
                                        color: "#2563eb",
                                        marginTop: "1px",
                                      }}
                                    >
                                      HOY
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Selected Dates Badges Summary */}
                  {selectedDates.length > 0 && (
                    <div
                      style={{
                        marginTop: "0.6rem",
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "0.35rem",
                        alignItems: "center",
                        maxHeight: "65px",
                        overflowY: "auto",
                      }}
                    >
                      <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#334155" }}>
                        Seleccionados ({selectedDates.length}):
                      </span>
                      {selectedDates.map((dKey) => (
                        <span
                          key={dKey}
                          onClick={() => toggleDateSelection(dKey)}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            backgroundColor: "#eff6ff",
                            border: "1px solid #bfdbfe",
                            color: "#1d4ed8",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            padding: "0.15rem 0.5rem",
                            borderRadius: "9999px",
                            cursor: "pointer",
                          }}
                          title="Haz clic para quitar"
                        >
                          {formatDisplayDate(dKey)}
                          <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "#2563eb" }}>
                            ×
                          </span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </form>
          </div>
        ) : (
          /* HISTORY VIEW */
          <div className="agent-history-card">
            <div style={{ marginBottom: "1rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <h2 style={{ fontSize: "1.2rem", fontWeight: 800, color: "#0f172a" }}>
                  Mis Visitas Guardadas
                </h2>
                <p style={{ fontSize: "0.82rem", color: "#64748b" }}>
                  Historial de registros enviados para facturación semanal
                </p>
              </div>

              <button
                type="button"
                onClick={loadVisits}
                style={{
                  fontSize: "0.8rem",
                  color: "#2563eb",
                  fontWeight: 600,
                  padding: "0.35rem 0.75rem",
                  borderRadius: "8px",
                  backgroundColor: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem",
                }}
              >
                Actualizar
              </button>
            </div>

            {loadingVisits ? (
              <div
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: "14px",
                  padding: "2.5rem",
                  textAlign: "center",
                  color: "#64748b",
                  border: "1px solid #e2e8f0",
                }}
              >
                Cargando historial de visitas...
              </div>
            ) : visits.length === 0 ? (
              <div
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: "14px",
                  padding: "3rem 1.5rem",
                  textAlign: "center",
                  border: "1px solid #e2e8f0",
                }}
              >
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "50%",
                    backgroundColor: "#eff6ff",
                    color: "#2563eb",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 0.75rem",
                  }}
                >
                  <CalendarCheck size={24} />
                </div>
                <h3 style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: "0.35rem" }}>
                  No tienes visitas registradas aún
                </h3>
                <p style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: "1.25rem" }}>
                  Usa la pestaña &quot;Registrar Visita&quot; para enviar tu primera atención con los días del calendario.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab("form")}
                  style={{
                    backgroundColor: "#2563eb",
                    color: "#ffffff",
                    fontWeight: 700,
                    fontSize: "0.88rem",
                    padding: "0.65rem 1.4rem",
                    borderRadius: "10px",
                    cursor: "pointer",
                    border: "none",
                  }}
                >
                  Registrar mi primera visita
                </button>
              </div>
            ) : (
              <div className="agent-history-grid">
                {visits.map((v) => (
                  <div
                    key={v._id}
                    className="agent-history-item"
                    style={{
                      backgroundColor: "#ffffff",
                      borderRadius: "12px",
                      border: "1px solid #e2e8f0",
                      padding: "1rem",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: "0.98rem", color: "#0f172a" }}>
                            {v.patientName}
                          </div>
                          <div style={{ fontSize: "0.78rem", color: "#64748b", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                            <span style={{ fontWeight: 600, color: "#2563eb" }}>{v.serviceType || "Visit"}</span>
                            <span>•</span>
                            <span>{v.visitDates.length} {v.visitDates.length === 1 ? "visita" : "visitas"}</span>
                          </div>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <span
                            style={{
                              fontSize: "0.7rem",
                              fontWeight: 700,
                              padding: "0.2rem 0.5rem",
                              borderRadius: "6px",
                              backgroundColor:
                                v.status === "invoiced"
                                  ? "#ecfdf5"
                                  : v.status === "approved"
                                  ? "#eff6ff"
                                  : "#fffbeb",
                              color:
                                v.status === "invoiced"
                                  ? "#065f46"
                                  : v.status === "approved"
                                  ? "#1d4ed8"
                                  : "#b45309",
                              border:
                                v.status === "invoiced"
                                  ? "1px solid #a7f3d0"
                                  : v.status === "approved"
                                  ? "1px solid #bfdbfe"
                                  : "1px solid #fde68a",
                              textTransform: "uppercase",
                            }}
                          >
                            {v.status === "invoiced"
                              ? "Facturado"
                              : v.status === "approved"
                              ? "Aprobado"
                              : "Pendiente"}
                          </span>

                          {v.status !== "invoiced" && (
                            <button
                              type="button"
                              onClick={() => handleDeleteVisit(v._id)}
                              title="Eliminar registro"
                              style={{
                                padding: "0.35rem",
                                borderRadius: "6px",
                                color: "#dc2626",
                                cursor: "pointer",
                                border: "none",
                                background: "none",
                              }}
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Dates list */}
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginTop: "0.5rem" }}>
                        {v.visitDates.map((dt) => (
                          <span
                            key={dt}
                            style={{
                              fontSize: "0.72rem",
                              backgroundColor: "#f1f5f9",
                              color: "#334155",
                              padding: "0.15rem 0.45rem",
                              borderRadius: "6px",
                              fontWeight: 600,
                            }}
                          >
                            📅 {formatDisplayDate(dt)}
                          </span>
                        ))}
                      </div>
                    </div>

                    {v.notes && (
                      <p style={{ fontSize: "0.78rem", color: "#64748b", marginTop: "0.6rem", fontStyle: "italic", borderTop: "1px dashed #f1f5f9", paddingTop: "0.4rem" }}>
                        &quot;{v.notes}&quot;
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <style jsx global>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* Mobile First defaults */
        .agent-header {
          position: sticky;
          top: 0;
          z-index: 40;
          background-color: #ffffff;
          border-bottom: 1px solid #e2e8f0;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04);
          padding: 0.75rem 1rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          flex-shrink: 0;
        }

        .agent-portal-main {
          flex: 1;
          width: 100%;
          max-width: 580px;
          margin: 0 auto;
          padding: 0.85rem 1rem 2.5rem 1rem;
          box-sizing: border-box;
        }

        .agent-tabs-container {
          display: grid;
          grid-template-columns: 1fr 1fr;
          background-color: #e2e8f0;
          padding: 3px;
          border-radius: 12px;
          margin-bottom: 1rem;
          flex-shrink: 0;
        }

        .agent-tab-btn {
          padding: 0.65rem;
          border-radius: 9px;
          font-size: 0.88rem;
          font-weight: 700;
          border: none;
          cursor: pointer;
          transition: all 0.15s ease;
          background-color: transparent;
          color: #64748b;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.45rem;
        }

        .agent-tab-btn.active {
          background-color: #ffffff;
          color: #1e293b;
          box-shadow: 0 1px 3px rgba(0,0,0,0.08);
        }

        .agent-tab-badge {
          background-color: #2563eb;
          color: #ffffff;
          font-size: 0.72rem;
          padding: 1px 6px;
          border-radius: 9999px;
          font-weight: 800;
        }

        .agent-form-card,
        .agent-history-card {
          background-color: #ffffff;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 2px 10px rgba(0,0,0,0.04);
          padding: 1.15rem;
          box-sizing: border-box;
        }

        .agent-form-inner {
          display: flex;
          flex-direction: column;
        }

        .agent-form-split {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .agent-col-fields {
          display: flex;
          flex-direction: column;
        }

        .agent-col-calendar {
          display: flex;
          flex-direction: column;
        }

        .agent-service-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.45rem;
        }

        .agent-calendar-box {
          background-color: #f8fafc;
          border: 1px solid #e2e8f0;
          borderRadius: 12px;
          padding: 0.65rem;
        }

        .agent-day-btn {
          aspect-ratio: 1/1;
          min-height: 38px;
        }

        .agent-history-grid {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        /* Desktop Optimization: Full Width & Zero Window Scroll (>= 1024px) */
        @media (min-width: 1024px) {
          html, body {
            overflow: hidden !important;
            height: 100vh !important;
          }

          .agent-header {
            padding: 0.75rem 2rem;
            height: 60px;
            box-sizing: border-box;
          }

          .agent-portal-main {
            max-width: 100% !important;
            width: 100% !important;
            height: calc(100vh - 60px);
            padding: 1rem 2rem;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            box-sizing: border-box;
          }

          .agent-tabs-container {
            max-width: 440px;
            margin: 0 auto 0.75rem auto;
            flex-shrink: 0;
          }

          .agent-form-card {
            flex: 1;
            height: 100%;
            display: flex;
            flex-direction: column;
            padding: 1.25rem 2rem;
            overflow: hidden;
            box-shadow: 0 4px 20px rgba(0,0,0,0.05);
          }

          .agent-form-inner {
            flex: 1;
            height: 100%;
            overflow: hidden;
          }

          .agent-form-split {
            display: grid;
            grid-template-columns: 380px 1fr;
            gap: 2.25rem;
            height: 100%;
            align-items: stretch;
          }

          .agent-col-fields {
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            height: 100%;
          }

          .agent-service-grid {
            grid-template-columns: repeat(3, 1fr);
            gap: 0.45rem;
          }

          .agent-col-calendar {
            display: flex;
            flex-direction: column;
            height: 100%;
            overflow: hidden;
          }

          .agent-calendar-box {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: space-evenly;
            padding: 0.75rem 1rem;
            border-radius: 14px;
            overflow: hidden;
          }

          .agent-day-btn {
            min-height: 34px !important;
            aspect-ratio: auto !important;
            height: 38px;
          }

          /* History Tab Desktop Optimization */
          .agent-history-card {
            flex: 1;
            height: 100%;
            display: flex;
            flex-direction: column;
            padding: 1.5rem 2rem;
            overflow: hidden;
          }

          .agent-history-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
            gap: 1rem;
            overflow-y: auto;
            flex: 1;
            padding-right: 0.5rem;
          }
        }

        /* Extra Large Desktop Adaptations (>= 1400px) */
        @media (min-width: 1400px) {
          .agent-form-split {
            grid-template-columns: 440px 1fr;
            gap: 3rem;
          }

          .agent-history-grid {
            grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          }
        }
      `}</style>
    </div>
  );
}
