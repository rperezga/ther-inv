"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  Users,
  Search,
  Save,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Briefcase,
  Sparkles,
} from "lucide-react";
import { IWorker, IAgencyAssignment } from "@/lib/types";

// The partner agencies
const DEFAULT_AGENCIES = [
  "A&A HEALTH SERVICE",
  "ALC",
  "INNOVATION",
  "MEDCARE",
  "OASIS",
  "USAD",
];

// Service types: SOC, ReCert, ReEval, Eval, Disch, Missed Visit, NoBill
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
  { id: "Special Rate", label: "Special Rate", description: "Custom agreed special visit rate", isBillable: true },
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

function formatPhoneNumber(val?: string): string {
  if (!val) return "";
  const cleaned = val.replace(/\D/g, "");
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  if (cleaned.length === 11 && cleaned.startsWith("1")) {
    return `${cleaned.slice(1, 4)}-${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  return val;
}

export default function AgencyAssignmentsPage() {
  const [workers, setWorkers] = useState<IWorker[]>([]);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>("");
  const [selectedAgency, setSelectedAgency] = useState<string>(DEFAULT_AGENCIES[0]);
  const [loading, setLoading] = useState(true);
  const [searchWorker, setSearchWorker] = useState("");

  // Working state for assignments of current selected worker: agencyName -> { serviceType: rate }
  // Always whole integer numbers (closed amounts, no cents)
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
            // Guarantee closed integers without decimals
            initialMap[assign.agencyName][s.serviceType] = Math.round(Number(s.rate) || 0);
          });
        }
      });
    }

    setWorkingRates(initialMap);
    setSaveSuccess(false);
    setErrorMessage("");
  }, [selectedWorkerId, workers]);

  const selectedWorker = workers.find((w) => w._id === selectedWorkerId);

  // Filter workers in real-time
  const filteredWorkers = workers.filter((w) => {
    const q = searchWorker.toLowerCase().trim();
    if (!q) return true;
    return (
      w.firstName.toLowerCase().includes(q) ||
      w.lastName.toLowerCase().includes(q) ||
      w.role.toLowerCase().includes(q)
    );
  });

  const handleRateChange = (agency: string, serviceId: string, rawVal: string) => {
    setSaveSuccess(false);
    // Sanitize to only whole positive integers (no decimals, no cents)
    const cleaned = rawVal.replace(/[^0-9]/g, "");

    setWorkingRates((prev) => {
      const agencyRates = { ...(prev[agency] || {}) };
      if (cleaned === "") {
        agencyRates[serviceId] = "";
      } else {
        const intVal = parseInt(cleaned, 10);
        agencyRates[serviceId] = isNaN(intVal) ? "" : intVal;
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
      const assignmentsPayload: IAgencyAssignment[] = [];

      Object.entries(workingRates).forEach(([agencyName, servicesObj]) => {
        const activeServices = Object.entries(servicesObj)
          .filter(([_, rateVal]) => rateVal !== "" && rateVal !== undefined && Number(rateVal) >= 0)
          .map(([serviceType, rateVal]) => ({
            serviceType,
            rate: Math.round(Number(rateVal) || 0),
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

  const configuredAgenciesCount = selectedWorker?.agencyAssignments?.length || 0;

  return (
    <div
      style={{
        width: "100%",
        height: "calc(100vh - var(--header-height) - 3rem)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Top Header Row (No page scroll) */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "0.75rem",
          marginBottom: "0.85rem",
          flexShrink: 0,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "1.45rem",
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              margin: 0,
            }}
          >
            <Building2 size={24} color="var(--primary)" />
            Agency Assignments & Service Rates
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", margin: "2px 0 0 0" }}>
            Assign partner agencies and set closed whole-dollar rates ($/visit) per service.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {saveSuccess && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                fontSize: "0.82rem",
                fontWeight: 700,
                color: "var(--success)",
                backgroundColor: "var(--success-subtle)",
                padding: "0.3rem 0.75rem",
                borderRadius: "6px",
                border: "1px solid var(--success-border)",
              }}
            >
              <CheckCircle2 size={16} /> Saved!
            </span>
          )}

          {errorMessage && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                fontSize: "0.82rem",
                fontWeight: 700,
                color: "var(--danger)",
                backgroundColor: "var(--danger-subtle)",
                padding: "0.3rem 0.75rem",
                borderRadius: "6px",
                border: "1px solid var(--danger-border)",
              }}
            >
              <AlertCircle size={16} /> {errorMessage}
            </span>
          )}

          {selectedWorker && (
            <button
              onClick={handleSaveAssignments}
              disabled={saving}
              className="btn btn-primary btn-sm"
              style={{ minWidth: "140px", padding: "0.45rem 1rem", fontSize: "0.85rem" }}
            >
              {saving ? (
                <span>Saving...</span>
              ) : (
                <>
                  <Save size={16} />
                  <span>Save Rates</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Main 2-Column Section (Fits viewport exactly: Left scrolls, Right fixed table) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "300px 1fr",
          gap: "1.1rem",
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        {/* Left Column: Staff Members (ONLY this section scrolls) */}
        <div
          className="card"
          style={{
            padding: 0,
            display: "flex",
            flexDirection: "column",
            height: "100%",
            overflow: "hidden",
          }}
        >
          {/* Staff Header & Instant Search */}
          <div
            style={{
              padding: "0.75rem 1rem",
              borderBottom: "1px solid var(--border-color)",
              backgroundColor: "var(--bg-subtle)",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "0.5rem",
              }}
            >
              <span
                style={{
                  fontWeight: 700,
                  fontSize: "0.88rem",
                  color: "var(--text-primary)",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem",
                }}
              >
                <Users size={15} color="var(--primary)" /> Staff Members
              </span>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>
                {workers.length} active
              </span>
            </div>

            <div style={{ position: "relative" }}>
              <input
                type="text"
                className="form-input"
                placeholder="Search staff..."
                value={searchWorker}
                onChange={(e) => setSearchWorker(e.target.value)}
                style={{ paddingLeft: "1.9rem", fontSize: "0.82rem", height: "32px" }}
              />
              <Search
                size={13}
                style={{
                  position: "absolute",
                  left: "0.6rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text-muted)",
                }}
              />
            </div>
          </div>

          {/* Dedicated Scrollable Roster List */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              minHeight: 0,
            }}
          >
            {loading ? (
              <div style={{ padding: "1.5rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                Loading staff...
              </div>
            ) : filteredWorkers.length === 0 ? (
              <div style={{ padding: "1.5rem 1rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.82rem" }}>
                No staff found
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
                      padding: "0.75rem 1rem",
                      border: "none",
                      borderBottom: "1px solid var(--border-color)",
                      backgroundColor: isSelected ? "var(--primary-subtle)" : "transparent",
                      borderLeft: isSelected ? "4px solid var(--primary)" : "4px solid transparent",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "background-color 0.15s ease",
                    }}
                  >
                    <div style={{ minWidth: 0, paddingRight: "0.5rem" }}>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: "0.88rem",
                          color: isSelected ? "var(--primary)" : "var(--text-primary)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {w.firstName} {w.lastName}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", marginTop: "0.15rem" }}>
                        <span
                          style={{
                            fontSize: "0.7rem",
                            fontWeight: 700,
                            padding: "0.1rem 0.4rem",
                            borderRadius: "4px",
                            backgroundColor: badgeStyle.bg,
                            color: badgeStyle.color,
                            border: `1px solid ${badgeStyle.border}`,
                          }}
                        >
                          {abbr}
                        </span>
                        <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                          {assignedCount} {assignedCount === 1 ? "agency" : "agencies"}
                        </span>
                      </div>
                    </div>

                    <ChevronRight size={15} color={isSelected ? "var(--primary)" : "var(--text-muted)"} />
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Agency Tabs & Clean Table (No scroll needed) */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            height: "100%",
            overflow: "hidden",
            gap: "0.75rem",
          }}
        >
          {selectedWorker ? (
            <>
              {/* Top Compact Bar: Current Worker & Agency Selector */}
              <div
                className="card"
                style={{
                  padding: "0.6rem 1rem",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "0.75rem",
                  flexShrink: 0,
                  backgroundColor: "#ffffff",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  <span style={{ fontWeight: 800, fontSize: "1.05rem", color: "var(--text-primary)" }}>
                    {selectedWorker.firstName} {selectedWorker.lastName}
                  </span>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      padding: "0.15rem 0.5rem",
                      borderRadius: "6px",
                      backgroundColor: getRoleBadgeStyle(selectedWorker.role).bg,
                      color: getRoleBadgeStyle(selectedWorker.role).color,
                      border: `1px solid ${getRoleBadgeStyle(selectedWorker.role).border}`,
                    }}
                  >
                    {getRoleAbbr(selectedWorker.role)}
                  </span>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    • {selectedWorker.email || formatPhoneNumber(selectedWorker.phone) || "Active Roster"}
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <button
                    type="button"
                    onClick={() => {
                      const defaultFill = prompt(
                        `Enter closed rate ($) for all billable services for ${selectedAgency}:`,
                        "65"
                      );
                      if (defaultFill !== null) {
                        const cleaned = defaultFill.replace(/[^0-9]/g, "");
                        if (cleaned) {
                          const intVal = parseInt(cleaned, 10);
                          SERVICE_DEFINITIONS.forEach((srv) => {
                            if (srv.isBillable) {
                              handleRateChange(selectedAgency, srv.id, String(intVal));
                            }
                          });
                        }
                      }
                    }}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: "0.78rem", padding: "0.3rem 0.65rem" }}
                    title="Quick autofill billables with a single whole number"
                  >
                    <Sparkles size={13} /> Autofill Billables
                  </button>

                  <div
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      color: "var(--primary)",
                      backgroundColor: "var(--primary-subtle)",
                      padding: "0.25rem 0.6rem",
                      borderRadius: "6px",
                    }}
                  >
                    {configuredAgenciesCount} / {DEFAULT_AGENCIES.length} Agencies Configured
                  </div>
                </div>
              </div>

              {/* Agency Tabs Row */}
              <div
                style={{
                  display: "flex",
                  gap: "0.35rem",
                  flexShrink: 0,
                  overflowX: "auto",
                  paddingBottom: "2px",
                }}
              >
                {DEFAULT_AGENCIES.map((agency) => {
                  const isCurrentAgency = selectedAgency === agency;
                  const agencyRatesMap = workingRates[agency] || {};
                  const configuredServices = Object.values(agencyRatesMap).filter(
                    (v) => v !== "" && v !== undefined && Number(v) > 0
                  ).length;

                  return (
                    <button
                      key={agency}
                      onClick={() => setSelectedAgency(agency)}
                      style={{
                        padding: "0.45rem 0.85rem",
                        borderRadius: "6px",
                        border: isCurrentAgency ? "2px solid var(--primary)" : "1px solid var(--border-color)",
                        backgroundColor: isCurrentAgency ? "var(--primary)" : "#ffffff",
                        color: isCurrentAgency ? "#ffffff" : "var(--text-primary)",
                        fontWeight: 700,
                        fontSize: "0.8rem",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.4rem",
                        whiteSpace: "nowrap",
                        boxShadow: isCurrentAgency ? "var(--shadow-sm)" : "none",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <span>{agency}</span>
                      {configuredServices > 0 && (
                        <span
                          style={{
                            fontSize: "0.68rem",
                            backgroundColor: isCurrentAgency ? "rgba(255,255,255,0.25)" : "var(--success-subtle)",
                            color: isCurrentAgency ? "#ffffff" : "var(--success)",
                            border: isCurrentAgency ? "none" : "1px solid var(--success-border)",
                            padding: "0.05rem 0.35rem",
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

              {/* Services Rate Table (Replaces cards, fits perfectly without scroll) */}
              <div
                className="card"
                style={{
                  padding: 0,
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                }}
              >
                <div style={{ padding: "0.6rem 1rem", borderBottom: "1px solid var(--border-color)", backgroundColor: "var(--bg-subtle)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text-primary)" }}>
                      Payment Rates for {selectedAgency}
                    </span>
                    <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                      All values are closed whole dollars ($ no cents)
                    </span>
                  </div>
                </div>

                <div className="table-container" style={{ border: "none", flex: 1, overflow: "hidden" }}>
                  <table className="data-table" style={{ width: "100%", height: "100%" }}>
                    <thead>
                      <tr>
                        <th style={{ width: "140px", padding: "0.6rem 1rem" }}>Service Code</th>
                        <th style={{ padding: "0.6rem 1rem" }}>Service Description</th>
                        <th style={{ width: "120px", padding: "0.6rem 1rem" }}>Type</th>
                        <th style={{ width: "200px", textAlign: "right", padding: "0.6rem 1.25rem" }}>
                          Pay Rate ($ / Visit)
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {SERVICE_DEFINITIONS.map((service) => {
                        const currentRateVal = workingRates[selectedAgency]?.[service.id] ?? "";
                        const isConfigured = currentRateVal !== "" && Number(currentRateVal) > 0;

                        return (
                          <tr
                            key={service.id}
                            style={{
                              backgroundColor: isConfigured ? "#fcfdff" : "transparent",
                            }}
                          >
                            <td style={{ padding: "0.55rem 1rem" }}>
                              <span
                                style={{
                                  fontWeight: 800,
                                  fontSize: "0.92rem",
                                  color: "var(--text-primary)",
                                  display: "inline-block",
                                  minWidth: "60px",
                                }}
                              >
                                {service.label}
                              </span>
                            </td>

                            <td style={{ padding: "0.55rem 1rem" }}>
                              <span style={{ fontSize: "0.83rem", color: "var(--text-secondary)" }}>
                                {service.description}
                              </span>
                            </td>

                            <td style={{ padding: "0.55rem 1rem" }}>
                              {service.isBillable ? (
                                <span
                                  style={{
                                    fontSize: "0.72rem",
                                    fontWeight: 700,
                                    padding: "0.15rem 0.45rem",
                                    borderRadius: "4px",
                                    backgroundColor: "var(--primary-subtle)",
                                    color: "var(--primary)",
                                    border: "1px solid var(--primary-border)",
                                  }}
                                >
                                  Billable
                                </span>
                              ) : (
                                <span
                                  style={{
                                    fontSize: "0.72rem",
                                    fontWeight: 600,
                                    padding: "0.15rem 0.45rem",
                                    borderRadius: "4px",
                                    backgroundColor: "var(--bg-subtle)",
                                    color: "var(--text-muted)",
                                  }}
                                >
                                  No Billable
                                </span>
                              )}
                            </td>

                            <td style={{ padding: "0.45rem 1.25rem", textAlign: "right" }}>
                              <div
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  position: "relative",
                                  width: "150px",
                                }}
                              >
                                <span
                                  style={{
                                    position: "absolute",
                                    left: "0.75rem",
                                    top: "50%",
                                    transform: "translateY(-50%)",
                                    color: isConfigured ? "var(--primary)" : "var(--text-muted)",
                                    fontWeight: 800,
                                    fontSize: "0.9rem",
                                    pointerEvents: "none",
                                  }}
                                >
                                  $
                                </span>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  placeholder={service.id === "NoBill" ? "0" : "0"}
                                  value={currentRateVal}
                                  onChange={(e) => handleRateChange(selectedAgency, service.id, e.target.value)}
                                  className="form-input"
                                  style={{
                                    paddingLeft: "1.7rem",
                                    paddingRight: "0.75rem",
                                    fontWeight: 800,
                                    fontSize: "0.92rem",
                                    textAlign: "right",
                                    height: "34px",
                                    color: isConfigured ? "var(--primary)" : "var(--text-primary)",
                                    borderColor: isConfigured ? "var(--primary-border)" : "var(--border-color)",
                                    backgroundColor: isConfigured ? "#f0f7ff" : "#ffffff",
                                  }}
                                />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="card" style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
              Please select a staff member from the left list.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
