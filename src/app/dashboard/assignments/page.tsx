"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  Users,
  Search,
  Check,
  DollarSign,
  AlertCircle,
  Save,
  CheckCircle2,
  ShieldAlert,
  ChevronRight,
  Briefcase,
  Layers,
  Sparkles,
} from "lucide-react";
import { IWorker, IAgencyAssignment } from "@/lib/types";

// The agencies provided by the user
const DEFAULT_AGENCIES = [
  "A&A HEALTH SERVICE",
  "ALC",
  "INNOVATION",
  "MEDCARE",
  "OASIS",
  "USAD",
];

// Service types requested: SOC, ReCert, ReEval, Eval, Disch, NoBill, Missed Visit
interface ServiceDefinition {
  id: string;
  label: string;
  description: string;
  isBillable: boolean;
}

const SERVICE_DEFINITIONS: ServiceDefinition[] = [
  { id: "SOC", label: "SOC", description: "Start of Care (Inicio de atención)", isBillable: true },
  { id: "ReCert", label: "ReCert", description: "Recertification (Recertificación)", isBillable: true },
  { id: "ReEval", label: "ReEval", description: "Re-evaluation (Reevaluación)", isBillable: true },
  { id: "Eval", label: "Eval", description: "Initial Evaluation (Evaluación)", isBillable: true },
  { id: "Disch", label: "Disch", description: "Discharge (Alta)", isBillable: true },
  { id: "Missed Visit", label: "Missed Visit", description: "Visita perdida / No concretada", isBillable: true },
  { id: "NoBill", label: "NoBill", description: "Non-billable administrative service", isBillable: false },
];

function getRoleAbbr(roleStr: string): string {
  if (!roleStr) return "";
  const match = roleStr.match(/\(([^)]+)\)/);
  if (match) return match[1].trim();
  const lower = roleStr.toLowerCase().trim();
  if (lower === "physical therapy assistant" || lower === "pta") return "PTA";
  if (lower === "physical therapy" || lower === "pt") return "PT";
  return roleStr.trim();
}

function getRoleBadgeStyle(roleStr: string): { bg: string; color: string; border: string } {
  const abbr = getRoleAbbr(roleStr).toUpperCase();
  if (abbr === "PT") {
    return { bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" };
  }
  if (abbr === "PTA") {
    return { bg: "#ecfdf5", color: "#047857", border: "#a7f3d0" };
  }
  return { bg: "#f1f5f9", color: "#334155", border: "#cbd5e1" };
}

export default function AgencyAssignmentsPage() {
  const [workers, setWorkers] = useState<IWorker[]>([]);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>("");
  const [selectedAgency, setSelectedAgency] = useState<string>(DEFAULT_AGENCIES[0]);
  const [loading, setLoading] = useState(true);
  const [searchWorker, setSearchWorker] = useState("");

  // Working state for assignments of current selected worker: agencyName -> { serviceType: rate }
  const [workingRates, setWorkingRates] = useState<Record<string, Record<string, number | "">>>({});

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Fetch workers roster
  const fetchWorkers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/workers?status=active");
      const data = await res.json();
      if (res.ok && data.workers) {
        const list: IWorker[] = data.workers;
        setWorkers(list);

        if (list.length > 0) {
          // If none selected, pick first
          setSelectedWorkerId((prev) => (prev && list.some((w) => w._id === prev) ? prev : list[0]._id!));
        }
      }
    } catch (err) {
      console.error("Failed to load workers:", err);
      setErrorMessage("Could not load staff roster.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkers();
  }, []);

  // Sync workingRates whenever selectedWorkerId or workers change
  useEffect(() => {
    const worker = workers.find((w) => w._id === selectedWorkerId);
    if (!worker) return;

    const initialMap: Record<string, Record<string, number | "">> = {};
    DEFAULT_AGENCIES.forEach((agency) => {
      initialMap[agency] = {};
      SERVICE_DEFINITIONS.forEach((srv) => {
        initialMap[agency][srv.id] = "";
      });
    });

    if (worker.agencyAssignments && Array.isArray(worker.agencyAssignments)) {
      worker.agencyAssignments.forEach((assign) => {
        if (!initialMap[assign.agencyName]) {
          initialMap[assign.agencyName] = {};
        }
        if (assign.services && Array.isArray(assign.services)) {
          assign.services.forEach((s) => {
            initialMap[assign.agencyName][s.serviceType] = s.rate;
          });
        }
      });
    }

    setWorkingRates(initialMap);
    setSaveSuccess(false);
    setErrorMessage("");
  }, [selectedWorkerId, workers]);

  const selectedWorker = workers.find((w) => w._id === selectedWorkerId);

  // Filter workers by search
  const filteredWorkers = workers.filter((w) => {
    const q = searchWorker.toLowerCase().trim();
    if (!q) return true;
    return (
      w.firstName.toLowerCase().includes(q) ||
      w.lastName.toLowerCase().includes(q) ||
      w.role.toLowerCase().includes(q)
    );
  });

  const handleRateChange = (agency: string, serviceId: string, valStr: string) => {
    setSaveSuccess(false);
    setWorkingRates((prev) => {
      const agencyRates = { ...(prev[agency] || {}) };
      if (valStr === "") {
        agencyRates[serviceId] = "";
      } else {
        const num = parseFloat(valStr);
        agencyRates[serviceId] = isNaN(num) ? "" : num;
      }
      return {
        ...prev,
        [agency]: agencyRates,
      };
    });
  };

  const handleSaveAssignments = async () => {
    if (!selectedWorker) return;

    setSaving(true);
    setErrorMessage("");
    setSaveSuccess(false);

    try {
      // Build IAgencyAssignment[] payload
      const assignmentsPayload: IAgencyAssignment[] = [];

      Object.entries(workingRates).forEach(([agencyName, servicesObj]) => {
        const activeServices = Object.entries(servicesObj)
          .filter(([_, rateVal]) => rateVal !== "" && rateVal !== undefined && Number(rateVal) >= 0)
          .map(([serviceType, rateVal]) => ({
            serviceType,
            rate: Number(rateVal) || 0,
          }));

        if (activeServices.length > 0) {
          assignmentsPayload.push({
            agencyName,
            services: activeServices,
          });
        }
      });

      const res = await fetch(`/api/workers/${selectedWorker._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agencyAssignments: assignmentsPayload,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save agency assignments");
      }

      // Update in local state
      setWorkers((prev) =>
        prev.map((w) =>
          w._id === selectedWorker._id ? { ...w, agencyAssignments: assignmentsPayload } : w
        )
      );

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || "An error occurred while saving.");
    } finally {
      setSaving(false);
    }
  };

  // Helper count of configured agencies for current worker
  const configuredAgenciesCount = selectedWorker?.agencyAssignments?.length || 0;

  return (
    <div style={{ width: "100%" }}>
      {/* Page Title */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
          marginBottom: "1.25rem",
        }}
      >
        <div>
          <h1 style={{ fontSize: "1.75rem", marginBottom: "0.25rem", display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <Building2 size={26} color="var(--primary)" />
            Agency Assignments & Service Rates
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
            Assign partner agencies and configure per-service payment rates ($) for each clinical staff member to automate invoice generation.
          </p>
        </div>

        {selectedWorker && (
          <button
            onClick={handleSaveAssignments}
            disabled={saving}
            className="btn btn-primary"
            style={{ minWidth: "160px" }}
          >
            {saving ? (
              <span>Saving...</span>
            ) : saveSuccess ? (
              <>
                <CheckCircle2 size={18} />
                <span>Saved!</span>
              </>
            ) : (
              <>
                <Save size={18} />
                <span>Save Rates</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Notifications */}
      {saveSuccess && (
        <div
          style={{
            backgroundColor: "var(--success-subtle)",
            color: "var(--success)",
            border: "1px solid var(--success-border)",
            borderRadius: "var(--radius-md)",
            padding: "0.75rem 1.25rem",
            marginBottom: "1.25rem",
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
            fontWeight: 600,
          }}
        >
          <CheckCircle2 size={18} />
          <span>Agency assignments and service rates successfully updated for {selectedWorker?.firstName} {selectedWorker?.lastName}!</span>
        </div>
      )}

      {errorMessage && (
        <div
          style={{
            backgroundColor: "var(--danger-subtle)",
            color: "var(--danger)",
            border: "1px solid var(--danger-border)",
            borderRadius: "var(--radius-md)",
            padding: "0.75rem 1.25rem",
            marginBottom: "1.25rem",
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
            fontWeight: 600,
          }}
        >
          <AlertCircle size={18} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Split Layout: 100% full screen width */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "320px 1fr",
          gap: "1.25rem",
          alignItems: "start",
        }}
      >
        {/* Left Column: Staff Roster Selector */}
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div
            style={{
              padding: "1rem 1.25rem",
              borderBottom: "1px solid var(--border-color)",
              backgroundColor: "var(--bg-subtle)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
              <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <Users size={16} color="var(--primary)" /> Staff Members
              </span>
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600 }}>
                {workers.length} active
              </span>
            </div>

            {/* Instant Search */}
            <div style={{ position: "relative" }}>
              <input
                type="text"
                className="form-input"
                placeholder="Search staff..."
                value={searchWorker}
                onChange={(e) => setSearchWorker(e.target.value)}
                style={{ paddingLeft: "2.1rem", fontSize: "0.85rem", height: "36px" }}
              />
              <Search
                size={14}
                style={{
                  position: "absolute",
                  left: "0.7rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text-muted)",
                }}
              />
            </div>
          </div>

          {/* Worker List Items */}
          <div style={{ maxHeight: "calc(100vh - 280px)", overflowY: "auto" }}>
            {loading ? (
              <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>
                Loading staff...
              </div>
            ) : filteredWorkers.length === 0 ? (
              <div style={{ padding: "2rem 1rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.9rem" }}>
                No staff members found
              </div>
            ) : (
              filteredWorkers.map((w) => {
                const isSelected = w._id === selectedWorkerId;
                const badgeStyle = getRoleBadgeStyle(w.role);
                const abbr = getRoleAbbr(w.role);
                const assignedCount = w.agencyAssignments?.length || 0;

                return (
                  <button
                    key={w._id}
                    onClick={() => setSelectedWorkerId(w._id!)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      width: "100%",
                      padding: "0.9rem 1.25rem",
                      border: "none",
                      borderBottom: "1px solid var(--border-color)",
                      backgroundColor: isSelected ? "var(--primary-subtle)" : "transparent",
                      borderLeft: isSelected ? "4px solid var(--primary)" : "4px solid transparent",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "background-color 0.15s ease",
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: "0.92rem", color: isSelected ? "var(--primary)" : "var(--text-primary)" }}>
                        {w.firstName} {w.lastName}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginTop: "0.25rem" }}>
                        <span
                          style={{
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            padding: "0.15rem 0.45rem",
                            borderRadius: "4px",
                            backgroundColor: badgeStyle.bg,
                            color: badgeStyle.color,
                            border: `1px solid ${badgeStyle.border}`,
                          }}
                        >
                          {abbr}
                        </span>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                          {assignedCount} {assignedCount === 1 ? "agency" : "agencies"}
                        </span>
                      </div>
                    </div>

                    <ChevronRight size={16} color={isSelected ? "var(--primary)" : "var(--text-muted)"} />
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Agency Tabs & Service Rates Matrix */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {selectedWorker ? (
            <>
              {/* Worker Profile Mini-Banner */}
              <div
                className="card"
                style={{
                  padding: "1.1rem 1.5rem",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "1rem",
                  backgroundColor: "#ffffff",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                    <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--text-primary)" }}>
                      {selectedWorker.firstName} {selectedWorker.lastName}
                    </h2>
                    <span
                      style={{
                        fontSize: "0.8rem",
                        fontWeight: 700,
                        padding: "0.2rem 0.6rem",
                        borderRadius: "6px",
                        backgroundColor: getRoleBadgeStyle(selectedWorker.role).bg,
                        color: getRoleBadgeStyle(selectedWorker.role).color,
                        border: `1px solid ${getRoleBadgeStyle(selectedWorker.role).border}`,
                      }}
                    >
                      {selectedWorker.role}
                    </span>
                  </div>
                  <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
                    {selectedWorker.email || "No email"} • {selectedWorker.phone || "No phone"}
                  </p>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <div
                    style={{
                      padding: "0.4rem 0.8rem",
                      backgroundColor: "var(--bg-subtle)",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--border-color)",
                      textAlign: "right",
                    }}
                  >
                    <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 600 }}>
                      CONFIGURED AGENCIES
                    </div>
                    <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--primary)" }}>
                      {configuredAgenciesCount} / {DEFAULT_AGENCIES.length}
                    </div>
                  </div>
                </div>
              </div>

              {/* Agency Tabs Strip */}
              <div
                style={{
                  display: "flex",
                  gap: "0.5rem",
                  overflowX: "auto",
                  paddingBottom: "4px",
                }}
              >
                {DEFAULT_AGENCIES.map((agency) => {
                  const isCurrentAgency = selectedAgency === agency;
                  // Check if this agency has any rates configured for the current worker
                  const agencyRatesMap = workingRates[agency] || {};
                  const configuredServices = Object.values(agencyRatesMap).filter(
                    (v) => v !== "" && v !== undefined && Number(v) > 0
                  ).length;

                  return (
                    <button
                      key={agency}
                      onClick={() => setSelectedAgency(agency)}
                      style={{
                        padding: "0.65rem 1.1rem",
                        borderRadius: "8px",
                        border: isCurrentAgency ? "2px solid var(--primary)" : "1px solid var(--border-color)",
                        backgroundColor: isCurrentAgency ? "var(--primary)" : "#ffffff",
                        color: isCurrentAgency ? "#ffffff" : "var(--text-primary)",
                        fontWeight: 700,
                        fontSize: "0.85rem",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        whiteSpace: "nowrap",
                        boxShadow: isCurrentAgency ? "var(--shadow-sm)" : "none",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <span>{agency}</span>
                      {configuredServices > 0 && (
                        <span
                          style={{
                            fontSize: "0.7rem",
                            backgroundColor: isCurrentAgency ? "rgba(255,255,255,0.25)" : "var(--success-subtle)",
                            color: isCurrentAgency ? "#ffffff" : "var(--success)",
                            border: isCurrentAgency ? "none" : "1px solid var(--success-border)",
                            padding: "0.1rem 0.4rem",
                            borderRadius: "10px",
                            fontWeight: 800,
                          }}
                        >
                          {configuredServices}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Active Agency Services Rates Matrix */}
              <div className="card" style={{ padding: "1.5rem" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "1rem",
                    marginBottom: "1.5rem",
                    paddingBottom: "1rem",
                    borderBottom: "1px solid var(--border-color)",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--text-primary)" }}>
                        {selectedAgency}
                      </span>
                      <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                        • Per-Service Pay Rates ($)
                      </span>
                    </div>
                    <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
                      Set the payment rate for each visit type performed by {selectedWorker.firstName} for {selectedAgency}.
                    </p>
                  </div>

                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button
                      type="button"
                      onClick={() => {
                        // Quick fill helper with default placeholder (e.g. $65)
                        const defaultFill = prompt(
                          `Enter standard rate ($) to apply to all billable services for ${selectedAgency}:`,
                          "65"
                        );
                        if (defaultFill !== null) {
                          const num = parseFloat(defaultFill);
                          if (!isNaN(num)) {
                            SERVICE_DEFINITIONS.forEach((srv) => {
                              if (srv.isBillable) {
                                handleRateChange(selectedAgency, srv.id, String(num));
                              }
                            });
                          }
                        }
                      }}
                      className="btn btn-secondary btn-sm"
                      title="Quick fill all services with one standard rate"
                    >
                      <Sparkles size={14} /> Quick Autofill Billables
                    </button>
                  </div>
                </div>

                {/* Service Rates Grid */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                    gap: "1.25rem",
                  }}
                >
                  {SERVICE_DEFINITIONS.map((service) => {
                    const currentRateVal = workingRates[selectedAgency]?.[service.id] ?? "";
                    const isConfigured = currentRateVal !== "" && Number(currentRateVal) > 0;

                    return (
                      <div
                        key={service.id}
                        style={{
                          border: isConfigured ? "1.5px solid var(--primary-border)" : "1px solid var(--border-color)",
                          backgroundColor: isConfigured ? "#f8fbff" : "#ffffff",
                          borderRadius: "var(--radius-md)",
                          padding: "1rem 1.25rem",
                          transition: "border-color 0.15s ease",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                              <span style={{ fontWeight: 800, fontSize: "1rem", color: "var(--text-primary)" }}>
                                {service.label}
                              </span>
                              {!service.isBillable && (
                                <span
                                  style={{
                                    fontSize: "0.7rem",
                                    padding: "0.15rem 0.4rem",
                                    borderRadius: "4px",
                                    backgroundColor: "var(--bg-subtle)",
                                    color: "var(--text-muted)",
                                    fontWeight: 600,
                                  }}
                                >
                                  No Billable
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "2px" }}>
                              {service.description}
                            </div>
                          </div>
                        </div>

                        {/* Rate Input */}
                        <div style={{ marginTop: "0.75rem" }}>
                          <label
                            style={{
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              color: "var(--text-secondary)",
                              display: "block",
                              marginBottom: "0.3rem",
                              textTransform: "uppercase",
                              letterSpacing: "0.03em",
                            }}
                          >
                            Pay Rate ($ per visit)
                          </label>
                          <div style={{ position: "relative" }}>
                            <span
                              style={{
                                position: "absolute",
                                left: "0.75rem",
                                top: "50%",
                                transform: "translateY(-50%)",
                                color: "var(--text-muted)",
                                fontWeight: 700,
                              }}
                            >
                              $
                            </span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder={service.id === "NoBill" ? "0.00" : "e.g. 70.00"}
                              value={currentRateVal}
                              onChange={(e) => handleRateChange(selectedAgency, service.id, e.target.value)}
                              className="form-input"
                              style={{
                                paddingLeft: "1.8rem",
                                fontWeight: 700,
                                fontSize: "0.95rem",
                                color: isConfigured ? "var(--primary)" : "var(--text-primary)",
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Bottom Action Footer inside card */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    alignItems: "center",
                    gap: "1rem",
                    marginTop: "1.75rem",
                    paddingTop: "1.25rem",
                    borderTop: "1px solid var(--border-color)",
                  }}
                >
                  <button
                    onClick={handleSaveAssignments}
                    disabled={saving}
                    className="btn btn-primary"
                    style={{ minWidth: "160px" }}
                  >
                    {saving ? (
                      <span>Saving...</span>
                    ) : saveSuccess ? (
                      <>
                        <CheckCircle2 size={18} />
                        <span>Saved!</span>
                      </>
                    ) : (
                      <>
                        <Save size={18} />
                        <span>Save All Rates</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="card" style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
              Please select a clinical staff member from the left list.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
