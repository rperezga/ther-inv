"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Building2,
  Users,
  Calendar,
  Sparkles,
  Camera,
  Upload,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Key,
  Eye,
  RefreshCw,
  Clock,
  ArrowRight,
} from "lucide-react";
import { IWorker, IAgencyAssignment } from "@/lib/types";

const AGENCIES = [
  "A&A HEALTH SERVICE",
  "ALC",
  "INNOVATION",
  "MEDCARE",
  "OASIS",
  "USAD",
];

const AVAILABLE_SERVICES = [
  "SOC",
  "ReCert",
  "ReEval",
  "Eval",
  "Disch",
  "Missed Visit",
  "Special Rate",
  "NoBill",
];

export interface ExtractedVisitRow {
  id: string;
  patientName: string;
  visitDate: string;
  serviceType: string;
  rate: number;
  selected: boolean;
  notes?: string;
}

export default function CreateInvoicePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Core Selections: Agent & Agency
  const [workers, setWorkers] = useState<IWorker[]>([]);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>("");
  const [selectedAgency, setSelectedAgency] = useState<string>(AGENCIES[1]); // Default ALC
  const [loadingWorkers, setLoadingWorkers] = useState(true);

  // Billing Period Dates
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [dueDate, setDueDate] = useState("");

  // Extracted Table of Patient Visits
  const [visits, setVisits] = useState<ExtractedVisitRow[]>([]);

  // AI Extraction State
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [analyzingImage, setAnalyzingImage] = useState(false);
  const [aiError, setAiError] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showKeyInput, setShowKeyInput] = useState(false);

  // Submitting Invoice
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Load active workers and set default weekly dates
  useEffect(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diffToMonday = (dayOfWeek + 6) % 7;

    const lastMonday = new Date(today);
    lastMonday.setDate(today.getDate() - diffToMonday - 7);

    const lastSunday = new Date(lastMonday);
    lastSunday.setDate(lastMonday.getDate() + 6);

    const due = new Date(today);
    due.setDate(today.getDate() + 14);

    setPeriodStart(lastMonday.toISOString().split("T")[0]);
    setPeriodEnd(lastSunday.toISOString().split("T")[0]);
    setInvoiceDate(today.toISOString().split("T")[0]);
    setDueDate(due.toISOString().split("T")[0]);

    // Check stored API Key
    try {
      const storedKey = localStorage.getItem("therinv_openai_key");
      if (storedKey) setApiKey(storedKey);
    } catch {}

    // Fetch workers
    fetch("/api/workers?status=active")
      .then((res) => res.json())
      .then((data) => {
        if (data.workers) {
          const list: IWorker[] = data.workers;
          setWorkers(list);
          if (list.length > 0) {
            setSelectedWorkerId(list[0]._id!);
          }
        }
      })
      .catch((err) => console.error("Error loading workers:", err))
      .finally(() => setLoadingWorkers(false));
  }, []);

  const selectedWorker = workers.find((w) => w._id === selectedWorkerId);

  // Helper to resolve rate from worker's configured agency assignments
  const getRateForService = (
    worker: IWorker | undefined,
    agencyName: string,
    service: string
  ): number => {
    if (!worker || !worker.agencyAssignments) return 0;
    const assignment = worker.agencyAssignments.find((a) => a.agencyName === agencyName);
    if (!assignment || !assignment.services) return 0;
    const srv = assignment.services.find((s) => s.serviceType === service);
    return srv ? Math.round(Number(srv.rate) || 0) : 0;
  };

  // When worker or agency changes, re-evaluate default rates for rows that haven't been manually altered
  const updateRatesForCurrentSelection = (newWorkerId: string, newAgency: string) => {
    const targetWorker = workers.find((w) => w._id === newWorkerId);
    setVisits((prev) =>
      prev.map((row) => ({
        ...row,
        rate: getRateForService(targetWorker, newAgency, row.serviceType),
      }))
    );
  };

  const handleWorkerChange = (wId: string) => {
    setSelectedWorkerId(wId);
    updateRatesForCurrentSelection(wId, selectedAgency);
  };

  const handleAgencyChange = (agency: string) => {
    setSelectedAgency(agency);
    updateRatesForCurrentSelection(selectedWorkerId, agency);
  };

  // Image Upload / Screen Capture
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const b64 = reader.result as string;
      setPreviewImage(b64);
      processImageWithAI(b64);
    };
    reader.readAsDataURL(file);
  };

  // Clipboard Paste Support (User can press Ctrl+V directly to paste screenshot)
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = () => {
            const b64 = reader.result as string;
            setPreviewImage(b64);
            processImageWithAI(b64);
          };
          reader.readAsDataURL(file);
        }
        break;
      }
    }
  };

  // Send screenshot to AI Vision API
  const processImageWithAI = async (base64Img: string) => {
    setAnalyzingImage(true);
    setAiError("");

    try {
      const res = await fetch("/api/ai/extract-visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: base64Img,
          customApiKey: apiKey.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.missingKey) {
          setShowKeyInput(true);
        }
        throw new Error(data.error || "Failed to extract visits with AI");
      }

      const extracted = data.data;

      // Match agency if detected
      if (extracted.agencyName) {
        const foundAgency = AGENCIES.find(
          (a) =>
            a.toLowerCase().includes(extracted.agencyName.toLowerCase()) ||
            extracted.agencyName.toLowerCase().includes(a.toLowerCase())
        );
        if (foundAgency) {
          setSelectedAgency(foundAgency);
        }
      }

      // Match worker if detected in OCR
      if (extracted.staffName) {
        const foundWorker = workers.find(
          (w) =>
            `${w.firstName} ${w.lastName}`
              .toLowerCase()
              .includes(extracted.staffName.toLowerCase()) ||
            extracted.staffName.toLowerCase().includes(w.firstName.toLowerCase())
        );
        if (foundWorker) {
          setSelectedWorkerId(foundWorker._id!);
        }
      }

      // Convert extracted rows to table rows
      if (extracted.records && Array.isArray(extracted.records)) {
        const newRows: ExtractedVisitRow[] = extracted.records.map(
          (rec: any, idx: number) => {
            // Service matching: check if SR or special code
            let service = rec.suggestedService || "SOC";
            if (rec.notes?.includes("SR") || rec.patientName?.includes("(SR)")) {
              service = "Special Rate";
            }
            if (!AVAILABLE_SERVICES.includes(service)) {
              service = "SOC";
            }

            const currentRate = getRateForService(selectedWorker, selectedAgency, service);

            return {
              id: `row-${Date.now()}-${idx}`,
              patientName: rec.patientName ? rec.patientName.replace(/\(SR\)/i, "").trim() : `Patient ${idx + 1}`,
              visitDate: rec.visitDate || new Date().toISOString().split("T")[0],
              serviceType: service,
              rate: currentRate,
              selected: true,
              notes: rec.notes || "",
            };
          }
        );

        setVisits(newRows);
      }
    } catch (err: any) {
      console.error(err);
      setAiError(err.message || "Error processing image with AI");
    } finally {
      setAnalyzingImage(false);
    }
  };

  // Add Manual Row
  const handleAddRow = () => {
    const defaultSrv = "SOC";
    const defaultRate = getRateForService(selectedWorker, selectedAgency, defaultSrv);

    setVisits((prev) => [
      ...prev,
      {
        id: `manual-${Date.now()}`,
        patientName: "",
        visitDate: periodStart || new Date().toISOString().split("T")[0],
        serviceType: defaultSrv,
        rate: defaultRate,
        selected: true,
      },
    ]);
  };

  // Update row field
  const handleUpdateRow = (
    id: string,
    field: keyof ExtractedVisitRow,
    value: any
  ) => {
    setVisits((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        const updated = { ...row, [field]: value };

        // If service type changed, automatically recalculate configured rate
        if (field === "serviceType") {
          updated.rate = getRateForService(selectedWorker, selectedAgency, value);
        }
        return updated;
      })
    );
  };

  // Delete row
  const handleDeleteRow = (id: string) => {
    setVisits((prev) => prev.filter((r) => r.id !== id));
  };

  // Toggle selection
  const handleToggleSelectAll = (checked: boolean) => {
    setVisits((prev) => prev.map((r) => ({ ...r, selected: checked })));
  };

  // Save API Key locally
  const handleSaveApiKey = () => {
    try {
      localStorage.setItem("therinv_openai_key", apiKey.trim());
      setShowKeyInput(false);
      if (previewImage) {
        processImageWithAI(previewImage);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Calculated totals
  const selectedVisits = visits.filter((v) => v.selected && v.patientName.trim());
  const totalVisitsCount = selectedVisits.length;
  const invoiceSubtotal = selectedVisits.reduce((acc, v) => acc + (Number(v.rate) || 0), 0);

  // Submit and Create Invoice
  const handleGenerateInvoice = async () => {
    if (!selectedWorker) {
      setSubmitError("Please select an agent / staff member");
      return;
    }
    if (!selectedAgency) {
      setSubmitError("Please select a partner agency");
      return;
    }
    if (selectedVisits.length === 0) {
      setSubmitError("Please select at least one patient visit to include in the invoice");
      return;
    }

    setSubmitting(true);
    setSubmitError("");

    try {
      // Build Invoice items
      const itemsPayload = selectedVisits.map((v) => ({
        workerId: selectedWorker._id,
        workerName: `${selectedWorker.firstName} ${selectedWorker.lastName}`,
        role: selectedWorker.role,
        patientName: v.patientName.trim(),
        visitDate: v.visitDate,
        serviceType: v.serviceType,
        regularHours: 1, // 1 visit
        regularRate: Math.round(Number(v.rate) || 0),
        overtimeHours: 0,
        overtimeRate: 0,
        description: `${v.serviceType} - Patient: ${v.patientName.trim()}`,
        amount: Math.round(Number(v.rate) || 0),
      }));

      const payload = {
        clientName: selectedAgency,
        periodStart,
        periodEnd,
        invoiceDate,
        dueDate,
        items: itemsPayload,
        status: "draft",
        notes: `Weekly agency visit invoice for ${selectedAgency} • Therapist: ${selectedWorker.firstName} ${selectedWorker.lastName} (${selectedWorker.role}) • Total visits: ${totalVisitsCount}`,
      };

      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create invoice");
      }

      // Redirect directly to generated invoice view
      router.push(`/dashboard/invoices/${data.invoice._id}`);
    } catch (err: any) {
      setSubmitError(err.message || "Failed to generate invoice");
      setSubmitting(false);
    }
  };

  return (
    <div
      onPaste={handlePaste}
      style={{
        width: "100%",
        height: "calc(100vh - var(--header-height) - 3rem)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Top Header Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
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
            <FileText size={24} color="var(--primary)" />
            Create Weekly Agency Invoice
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", margin: "2px 0 0 0" }}>
            Generate invoices per agent and per agency with automated AI extraction from weekly visit sheets.
          </p>
        </div>

        {/* Action Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {/* AI Screenshot Trigger Button */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            style={{ display: "none" }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={analyzingImage}
            className="btn btn-secondary btn-sm"
            style={{
              gap: "0.45rem",
              backgroundColor: "#f0f7ff",
              borderColor: "var(--primary-border)",
              color: "var(--primary)",
              fontWeight: 700,
            }}
            title="Upload image or screenshot of the visit sheet"
          >
            {analyzingImage ? (
              <>
                <RefreshCw size={15} className="spin" />
                <span>Extracting with AI...</span>
              </>
            ) : (
              <>
                <Camera size={15} />
                <span>Upload / Screenshot Sheet</span>
              </>
            )}
          </button>

          {/* Generate Invoice Final Button */}
          <button
            onClick={handleGenerateInvoice}
            disabled={submitting || visits.length === 0}
            className="btn btn-primary btn-sm"
            style={{ minWidth: "150px" }}
          >
            {submitting ? (
              <span>Generating...</span>
            ) : (
              <>
                <Save size={16} />
                <span>Generate Invoice</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Notifications / Alerts */}
      {aiError && (
        <div
          style={{
            backgroundColor: "var(--danger-subtle)",
            color: "var(--danger)",
            border: "1px solid var(--danger-border)",
            borderRadius: "6px",
            padding: "0.5rem 0.85rem",
            marginBottom: "0.75rem",
            fontSize: "0.82rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <AlertCircle size={16} />
            <span>{aiError}</span>
          </div>
          <button
            onClick={() => setShowKeyInput(true)}
            style={{
              textDecoration: "underline",
              background: "none",
              border: "none",
              color: "inherit",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            Configure OpenAI Key
          </button>
        </div>
      )}

      {submitError && (
        <div
          style={{
            backgroundColor: "var(--danger-subtle)",
            color: "var(--danger)",
            border: "1px solid var(--danger-border)",
            borderRadius: "6px",
            padding: "0.5rem 0.85rem",
            marginBottom: "0.75rem",
            fontSize: "0.82rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            flexShrink: 0,
          }}
        >
          <AlertCircle size={16} />
          <span>{submitError}</span>
        </div>
      )}

      {/* Optional API Key Input Modal / Strip */}
      {showKeyInput && (
        <div
          className="card"
          style={{
            padding: "0.6rem 1rem",
            marginBottom: "0.75rem",
            backgroundColor: "#fffbeb",
            borderColor: "var(--warning-border)",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            flexWrap: "wrap",
          }}
        >
          <Key size={16} color="var(--warning)" />
          <span style={{ fontSize: "0.82rem", fontWeight: 600 }}>OpenAI API Key:</span>
          <input
            type="password"
            placeholder="sk-proj-..."
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="form-input"
            style={{ flex: 1, height: "30px", fontSize: "0.82rem", minWidth: "220px" }}
          />
          <button onClick={handleSaveApiKey} className="btn btn-primary btn-sm" style={{ padding: "0.3rem 0.75rem" }}>
            Save Key & Run
          </button>
          <button
            onClick={() => setShowKeyInput(false)}
            className="btn btn-secondary btn-sm"
            style={{ padding: "0.3rem 0.5rem" }}
          >
            Cancel
          </button>
        </div>
      )}

      {/* Main Container: Split View (Controls + Table) */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          minHeight: 0,
          gap: "0.75rem",
          overflow: "hidden",
        }}
      >
        {/* Parameters Filter Strip: Agent, Agency, Dates, Summary Totals */}
        <div
          className="card"
          style={{
            padding: "0.75rem 1rem",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr)) 160px",
            gap: "0.85rem",
            alignItems: "end",
            flexShrink: 0,
            backgroundColor: "#ffffff",
          }}
        >
          {/* Agent Selection */}
          <div>
            <label
              style={{
                fontSize: "0.72rem",
                fontWeight: 700,
                color: "var(--text-secondary)",
                display: "block",
                marginBottom: "0.25rem",
                textTransform: "uppercase",
              }}
            >
              1. Clinical Agent *
            </label>
            <select
              className="form-select"
              value={selectedWorkerId}
              onChange={(e) => handleWorkerChange(e.target.value)}
              style={{ height: "34px", fontSize: "0.85rem", fontWeight: 600 }}
            >
              {workers.map((w) => (
                <option key={w._id} value={w._id}>
                  {w.firstName} {w.lastName} ({w.role})
                </option>
              ))}
            </select>
          </div>

          {/* Agency Selection */}
          <div>
            <label
              style={{
                fontSize: "0.72rem",
                fontWeight: 700,
                color: "var(--text-secondary)",
                display: "block",
                marginBottom: "0.25rem",
                textTransform: "uppercase",
              }}
            >
              2. Partner Agency *
            </label>
            <select
              className="form-select"
              value={selectedAgency}
              onChange={(e) => handleAgencyChange(e.target.value)}
              style={{ height: "34px", fontSize: "0.85rem", fontWeight: 700, color: "var(--primary)" }}
            >
              {AGENCIES.map((agency) => (
                <option key={agency} value={agency}>
                  {agency}
                </option>
              ))}
            </select>
          </div>

          {/* Week Start */}
          <div>
            <label
              style={{
                fontSize: "0.72rem",
                fontWeight: 700,
                color: "var(--text-secondary)",
                display: "block",
                marginBottom: "0.25rem",
                textTransform: "uppercase",
              }}
            >
              Week Start Date *
            </label>
            <input
              type="date"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
              className="form-input"
              style={{ height: "34px", fontSize: "0.82rem" }}
            />
          </div>

          {/* Week End */}
          <div>
            <label
              style={{
                fontSize: "0.72rem",
                fontWeight: 700,
                color: "var(--text-secondary)",
                display: "block",
                marginBottom: "0.25rem",
                textTransform: "uppercase",
              }}
            >
              Week End Date *
            </label>
            <input
              type="date"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
              className="form-input"
              style={{ height: "34px", fontSize: "0.82rem" }}
            />
          </div>

          {/* KPI Total Amount Box */}
          <div
            style={{
              backgroundColor: "var(--bg-subtle)",
              border: "1px solid var(--border-color)",
              borderRadius: "6px",
              padding: "0.35rem 0.75rem",
              textAlign: "right",
            }}
          >
            <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
              Total Invoice ({totalVisitsCount} visits)
            </div>
            <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--primary)" }}>
              ${invoiceSubtotal.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Extracted Visits Interactive Table (Fits remaining viewport height, table body scrolls) */}
        <div
          className="card"
          style={{
            padding: 0,
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            minHeight: 0,
          }}
        >
          {/* Table Header Controls */}
          <div
            style={{
              padding: "0.65rem 1rem",
              borderBottom: "1px solid var(--border-color)",
              backgroundColor: "var(--bg-subtle)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexShrink: 0,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <span style={{ fontWeight: 800, fontSize: "0.92rem", color: "var(--text-primary)" }}>
                Patient Visits ({visits.length})
              </span>
              <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                Review, adjust names/dates, and pick the service to assign rates automatically
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <button
                type="button"
                onClick={handleAddRow}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: "0.78rem", padding: "0.3rem 0.65rem" }}
              >
                <Plus size={14} /> Add Row
              </button>
            </div>
          </div>

          {/* Table Body Area */}
          <div
            className="table-container"
            style={{
              border: "none",
              flex: 1,
              overflowY: "auto",
              minHeight: 0,
            }}
          >
            {visits.length === 0 ? (
              <div
                style={{
                  padding: "3.5rem 1.5rem",
                  textAlign: "center",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Camera size={40} style={{ opacity: 0.35, marginBottom: "0.75rem" }} />
                <p style={{ fontWeight: 700, fontSize: "1.05rem", color: "var(--text-primary)" }}>
                  No visit records loaded yet
                </p>
                <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", maxWidth: "440px", marginTop: "0.25rem" }}>
                  Click <strong>&quot;Upload / Screenshot Sheet&quot;</strong> or press <strong>Ctrl+V</strong> to paste a screenshot of the patient summary sheet. The AI will extract patient names and visit dates directly into this table.
                </p>
                <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem" }}>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="btn btn-primary btn-sm"
                  >
                    <Upload size={14} /> Choose Screenshot / Photo
                  </button>
                  <button
                    type="button"
                    onClick={handleAddRow}
                    className="btn btn-secondary btn-sm"
                  >
                    <Plus size={14} /> Add Manual Row
                  </button>
                </div>
              </div>
            ) : (
              <table className="data-table" style={{ width: "100%" }}>
                <thead style={{ position: "sticky", top: 0, zIndex: 10, background: "#f8fafc" }}>
                  <tr>
                    <th style={{ width: "40px", textAlign: "center", padding: "0.6rem 0.5rem" }}>
                      <input
                        type="checkbox"
                        checked={visits.length > 0 && visits.every((r) => r.selected)}
                        onChange={(e) => handleToggleSelectAll(e.target.checked)}
                      />
                    </th>
                    <th style={{ width: "45px", padding: "0.6rem 0.5rem" }}>#</th>
                    <th style={{ minWidth: "200px", padding: "0.6rem 0.75rem" }}>Patient Name</th>
                    <th style={{ width: "140px", padding: "0.6rem 0.75rem" }}>Visit Date</th>
                    <th style={{ width: "170px", padding: "0.6rem 0.75rem" }}>Service Code</th>
                    <th style={{ width: "120px", textAlign: "right", padding: "0.6rem 0.75rem" }}>
                      Rate ($)
                    </th>
                    <th style={{ width: "120px", textAlign: "right", padding: "0.6rem 0.75rem" }}>
                      Subtotal
                    </th>
                    <th style={{ width: "50px", textAlign: "center", padding: "0.6rem 0.5rem" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {visits.map((row, idx) => (
                    <tr
                      key={row.id}
                      style={{
                        backgroundColor: row.selected ? "#ffffff" : "#f8fafc",
                        opacity: row.selected ? 1 : 0.6,
                      }}
                    >
                      {/* Checkbox */}
                      <td style={{ textAlign: "center", padding: "0.4rem 0.5rem" }}>
                        <input
                          type="checkbox"
                          checked={row.selected}
                          onChange={(e) => handleUpdateRow(row.id, "selected", e.target.checked)}
                        />
                      </td>

                      {/* Row Index */}
                      <td style={{ fontSize: "0.8rem", color: "var(--text-muted)", padding: "0.4rem 0.5rem" }}>
                        {idx + 1}
                      </td>

                      {/* Patient Name Input */}
                      <td style={{ padding: "0.35rem 0.75rem" }}>
                        <input
                          type="text"
                          value={row.patientName}
                          onChange={(e) => handleUpdateRow(row.id, "patientName", e.target.value)}
                          placeholder="e.g. Jose Cano"
                          className="form-input"
                          style={{
                            height: "32px",
                            fontSize: "0.85rem",
                            fontWeight: 700,
                            padding: "0.2rem 0.5rem",
                          }}
                        />
                      </td>

                      {/* Visit Date Input */}
                      <td style={{ padding: "0.35rem 0.75rem" }}>
                        <input
                          type="text"
                          value={row.visitDate}
                          onChange={(e) => handleUpdateRow(row.id, "visitDate", e.target.value)}
                          placeholder="9-2-26"
                          className="form-input"
                          style={{
                            height: "32px",
                            fontSize: "0.82rem",
                            padding: "0.2rem 0.5rem",
                          }}
                        />
                      </td>

                      {/* Service Dropdown */}
                      <td style={{ padding: "0.35rem 0.75rem" }}>
                        <select
                          value={row.serviceType}
                          onChange={(e) => handleUpdateRow(row.id, "serviceType", e.target.value)}
                          className="form-select"
                          style={{
                            height: "32px",
                            fontSize: "0.82rem",
                            fontWeight: 700,
                            padding: "0.2rem 0.5rem",
                            color: row.serviceType === "Special Rate" ? "#b45309" : "var(--text-primary)",
                          }}
                        >
                          {AVAILABLE_SERVICES.map((srv) => (
                            <option key={srv} value={srv}>
                              {srv}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Rate Input (Closed whole integer) */}
                      <td style={{ padding: "0.35rem 0.75rem", textAlign: "right" }}>
                        <div style={{ position: "relative", display: "inline-block", width: "90px" }}>
                          <span
                            style={{
                              position: "absolute",
                              left: "0.45rem",
                              top: "50%",
                              transform: "translateY(-50%)",
                              fontSize: "0.8rem",
                              color: "var(--text-muted)",
                              fontWeight: 700,
                            }}
                          >
                            $
                          </span>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={row.rate}
                            onChange={(e) => {
                              const cleaned = e.target.value.replace(/[^0-9]/g, "");
                              handleUpdateRow(row.id, "rate", cleaned ? parseInt(cleaned, 10) : 0);
                            }}
                            className="form-input"
                            style={{
                              height: "32px",
                              fontSize: "0.85rem",
                              fontWeight: 700,
                              textAlign: "right",
                              paddingLeft: "1.2rem",
                              paddingRight: "0.45rem",
                            }}
                          />
                        </div>
                      </td>

                      {/* Subtotal */}
                      <td style={{ padding: "0.35rem 0.75rem", textAlign: "right", fontWeight: 700, fontSize: "0.88rem" }}>
                        ${row.selected ? (Number(row.rate) || 0) : 0}
                      </td>

                      {/* Delete */}
                      <td style={{ textAlign: "center", padding: "0.35rem 0.5rem" }}>
                        <button
                          type="button"
                          onClick={() => handleDeleteRow(row.id)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "var(--danger)",
                            cursor: "pointer",
                            padding: "0.2rem",
                          }}
                          title="Remove row"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Table Footer with Summary */}
          {visits.length > 0 && (
            <div
              style={{
                padding: "0.6rem 1rem",
                borderTop: "1px solid var(--border-color)",
                backgroundColor: "var(--bg-subtle)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexShrink: 0,
              }}
            >
              <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                Selected for Invoice: <strong>{totalVisitsCount}</strong> of {visits.length} visits
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <div style={{ fontSize: "0.92rem", fontWeight: 800 }}>
                  Subtotal: <span style={{ color: "var(--primary)" }}>${invoiceSubtotal.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
