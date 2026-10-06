"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  FileText,
  Building2,
  Users,
  Calendar,
  Sparkles,
  Camera,
  Upload,
  ClipboardPaste,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  AlertCircle,
  Key,
  RefreshCw,
  BookmarkCheck,
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

// 8 Service definitions with clear readable abbreviations for 1-click button row
export interface ServiceButtonDef {
  id: string;
  abbr: string;
  fullName: string;
  isSpecial?: boolean;
}

const SERVICE_BUTTONS: ServiceButtonDef[] = [
  { id: "SOC", abbr: "SOC", fullName: "Start of Care" },
  { id: "ReCert", abbr: "Re-Cert", fullName: "Re-Certification" },
  { id: "ReEval", abbr: "Re-Eval", fullName: "Re-Evaluation" },
  { id: "Eval", abbr: "Eval", fullName: "Evaluation" },
  { id: "Disch", abbr: "Disch", fullName: "Discharge" },
  { id: "Missed Visit", abbr: "Missed Visit", fullName: "Missed Visit" },
  { id: "Special Rate", abbr: "Special Rate", fullName: "Special Rate", isSpecial: true },
  { id: "NoBill", abbr: "No Bill", fullName: "No Billable" },
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
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit"); // If editing an existing draft/invoice
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Core selections: Agent & Agency
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

  // Submitting / Saving state
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState("");
  const [submitError, setSubmitError] = useState("");

  // References to keep latest worker and agency available synchronously
  const selectedWorkerRef = useRef<IWorker | undefined>(undefined);
  const selectedAgencyRef = useRef<string>(selectedAgency);

  // Helper to test if a worker has configured rates (at least 1 service with rate > 0)
  const workerHasConfiguredRates = (w: IWorker): boolean => {
    if (!w.agencyAssignments || !Array.isArray(w.agencyAssignments)) return false;
    return w.agencyAssignments.some(
      (assign) =>
        Array.isArray(assign.services) &&
        assign.services.some((s) => Number(s.rate) > 0)
    );
  };

  // Filtered workers: only those who have rates added
  const workersWithRates = workers.filter(workerHasConfiguredRates);

  const selectedWorker = workers.find((w) => w._id === selectedWorkerId);
  selectedWorkerRef.current = selectedWorker;
  selectedAgencyRef.current = selectedAgency;

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

  // Automatically recalculate rates for all rows when agent or agency changes
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

  // Load active workers and default weekly dates or existing invoice if editId is provided
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
          const eligible = list.filter((w) =>
            w.agencyAssignments?.some((a) => a.services?.some((s) => Number(s.rate) > 0))
          );
          if (eligible.length > 0) {
            setSelectedWorkerId(eligible[0]._id!);
          } else if (list.length > 0) {
            setSelectedWorkerId(list[0]._id!);
          }
        }
      })
      .catch((err) => console.error("Error loading workers:", err))
      .finally(() => setLoadingWorkers(false));

    // If editId is provided, load existing invoice to edit
    if (editId) {
      fetch(`/api/invoices/${editId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.invoice) {
            const inv = data.invoice;
            if (inv.clientName) setSelectedAgency(inv.clientName);
            if (inv.periodStart) setPeriodStart(new Date(inv.periodStart).toISOString().split("T")[0]);
            if (inv.periodEnd) setPeriodEnd(new Date(inv.periodEnd).toISOString().split("T")[0]);
            if (inv.invoiceDate) setInvoiceDate(new Date(inv.invoiceDate).toISOString().split("T")[0]);
            if (inv.dueDate) setDueDate(new Date(inv.dueDate).toISOString().split("T")[0]);

            if (inv.items && Array.isArray(inv.items) && inv.items.length > 0) {
              if (inv.items[0]?.workerId) {
                setSelectedWorkerId(String(inv.items[0].workerId));
              }
              const loadedVisits: ExtractedVisitRow[] = inv.items.map((it: any, idx: number) => ({
                id: `loaded-${Date.now()}-${idx}`,
                patientName: it.patientName || "",
                visitDate: it.visitDate || "",
                serviceType: it.serviceType || "SOC",
                rate: Math.round(Number(it.regularRate || it.amount) || 0),
                selected: true,
                notes: it.description || "",
              }));
              setVisits(loadedVisits);
            }
          }
        })
        .catch((err) => console.error("Error loading invoice for edit:", err));
    }
  }, [editId]);

  // Image Upload handler
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

  // Clipboard Paste (Ctrl+V) handler
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

  // Dedicated button to paste directly from navigator clipboard
  const handlePasteFromClipboardButton = async () => {
    try {
      if (!navigator.clipboard?.read) {
        alert("Clipboard API is not supported in this browser. Please press Ctrl+V directly.");
        return;
      }

      const clipboardItems = await navigator.clipboard.read();
      for (const item of clipboardItems) {
        const imageType = item.types.find((t) => t.startsWith("image/"));
        if (imageType) {
          const blob = await item.getType(imageType);
          const reader = new FileReader();
          reader.onload = () => {
            const b64 = reader.result as string;
            setPreviewImage(b64);
            processImageWithAI(b64);
          };
          reader.readAsDataURL(blob);
          return;
        }
      }
      alert("No image found in clipboard. Please copy/screenshot an image first and try again, or press Ctrl+V.");
    } catch (err: any) {
      console.warn("Clipboard read error:", err);
      alert("Please press Ctrl+V anywhere on the page to paste your screenshot.");
    }
  };

  // Process image with AI Vision
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
      let resolvedAgency = selectedAgency;
      if (extracted.agencyName) {
        const foundAgency = AGENCIES.find(
          (a) =>
            a.toLowerCase().includes(extracted.agencyName.toLowerCase()) ||
            extracted.agencyName.toLowerCase().includes(a.toLowerCase())
        );
        if (foundAgency) {
          resolvedAgency = foundAgency;
          setSelectedAgency(foundAgency);
        }
      }

      // Match worker if detected in OCR
      let resolvedWorker = selectedWorkerRef.current;
      if (extracted.staffName) {
        const foundWorker = workers.find(
          (w) =>
            `${w.firstName} ${w.lastName}`
              .toLowerCase()
              .includes(extracted.staffName.toLowerCase()) ||
            extracted.staffName.toLowerCase().includes(w.firstName.toLowerCase())
        );
        if (foundWorker) {
          resolvedWorker = foundWorker;
          setSelectedWorkerId(foundWorker._id!);
        }
      }

      // Convert extracted rows to table rows with rates automatically populated
      if (extracted.records && Array.isArray(extracted.records)) {
        const newRows: ExtractedVisitRow[] = extracted.records.map(
          (rec: any, idx: number) => {
            let service = rec.suggestedService || "SOC";
            if (rec.notes?.includes("SR") || rec.patientName?.includes("(SR)")) {
              service = "Special Rate";
            }
            if (!SERVICE_BUTTONS.some((s) => s.id === service)) {
              service = "SOC";
            }

            const currentRate = getRateForService(resolvedWorker, resolvedAgency, service);

            return {
              id: `row-${Date.now()}-${idx}`,
              patientName: rec.patientName ? rec.patientName.replace(/\(SR\)/i, "").trim() : "",
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

  // Add Manual Row (empty string for patientName, placeholder "Patient Name")
  const handleAddRow = () => {
    const defaultSrv = "SOC";
    const defaultRate = getRateForService(selectedWorker, selectedAgency, defaultSrv);

    setVisits((prev) => [
      ...prev,
      {
        id: `manual-${Date.now()}`,
        patientName: "", // Empty so no sample person name appears
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

        // When serviceType changes, update rate automatically from configuration
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

  // Helper to construct items payload
  const buildItemsPayload = () => {
    return selectedVisits.map((v) => ({
      workerId: selectedWorker?._id,
      workerName: selectedWorker ? `${selectedWorker.firstName} ${selectedWorker.lastName}` : "Worker",
      role: selectedWorker?.role || "Staff",
      patientName: v.patientName.trim(),
      visitDate: v.visitDate,
      serviceType: v.serviceType,
      regularHours: 1,
      regularRate: Math.round(Number(v.rate) || 0),
      overtimeHours: 0,
      overtimeRate: 0,
      description: `${v.serviceType} - Patient: ${v.patientName.trim()}`,
      amount: Math.round(Number(v.rate) || 0),
    }));
  };

  // Save as Draft (without generating final invoice, lets user come back to edit)
  const handleSaveDraft = async () => {
    if (!selectedWorker) {
      setSubmitError("Please select a clinical agent");
      return;
    }
    if (!selectedAgency) {
      setSubmitError("Please select a partner agency");
      return;
    }
    if (selectedVisits.length === 0) {
      setSubmitError("Please enter at least one patient visit to save the draft");
      return;
    }

    setSavingDraft(true);
    setSubmitError("");
    setSaveSuccessMsg("");

    try {
      const payload = {
        clientName: selectedAgency,
        periodStart,
        periodEnd,
        invoiceDate,
        dueDate,
        items: buildItemsPayload(),
        status: "draft",
        notes: `Draft invoice for ${selectedAgency} • Therapist: ${selectedWorker.firstName} ${selectedWorker.lastName} (${selectedWorker.role}) • Total visits: ${totalVisitsCount}`,
      };

      const url = editId ? `/api/invoices/${editId}` : "/api/invoices";
      const method = editId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save draft invoice");
      }

      setSaveSuccessMsg("Draft invoice saved successfully! You can continue editing or return at any time.");
      setTimeout(() => setSaveSuccessMsg(""), 4000);

      // If created new, update URL to edit mode without full reload
      if (!editId && data.invoice?._id) {
        router.replace(`/dashboard/invoices/new?edit=${data.invoice._id}`);
      }
    } catch (err: any) {
      setSubmitError(err.message || "Failed to save draft");
    } finally {
      setSavingDraft(false);
    }
  };

  // Submit and Create / Update Final Invoice
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
      const payload = {
        clientName: selectedAgency,
        periodStart,
        periodEnd,
        invoiceDate,
        dueDate,
        items: buildItemsPayload(),
        status: "pending", // Issued/Pending invoice
        notes: `Weekly agency visit invoice for ${selectedAgency} • Therapist: ${selectedWorker.firstName} ${selectedWorker.lastName} (${selectedWorker.role}) • Total visits: ${totalVisitsCount}`,
      };

      const url = editId ? `/api/invoices/${editId}` : "/api/invoices";
      const method = editId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create invoice");
      }

      const targetId = editId || data.invoice?._id;
      router.push(`/dashboard/invoices/${targetId}`);
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
          gap: "0.75rem",
          marginBottom: "0.6rem",
          flexShrink: 0,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "1.35rem",
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              gap: "0.45rem",
              margin: 0,
            }}
          >
            <FileText size={22} color="var(--primary)" />
            Create Weekly Agency Invoice
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.82rem", margin: "2px 0 0 0" }}>
            Generate invoices per agent and per agency with automated AI extraction from weekly visit sheets.
          </p>
        </div>

        {/* Action Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {/* File input (hidden) */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            style={{ display: "none" }}
          />

          {/* Paste Clipboard Image Button */}
          <button
            type="button"
            onClick={handlePasteFromClipboardButton}
            disabled={analyzingImage}
            className="btn btn-secondary btn-sm"
            style={{
              gap: "0.4rem",
              fontSize: "0.82rem",
              padding: "0.35rem 0.75rem",
              fontWeight: 700,
            }}
            title="Paste image directly from clipboard"
          >
            <ClipboardPaste size={14} />
            <span>Paste from Clipboard</span>
          </button>

          {/* Upload / Screenshot Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={analyzingImage}
            className="btn btn-secondary btn-sm"
            style={{
              gap: "0.4rem",
              fontSize: "0.82rem",
              padding: "0.35rem 0.75rem",
              backgroundColor: "#f0f7ff",
              borderColor: "var(--primary-border)",
              color: "var(--primary)",
              fontWeight: 700,
            }}
            title="Upload image or screenshot of the visit sheet"
          >
            {analyzingImage ? (
              <>
                <RefreshCw size={14} className="spin" />
                <span>Extracting with AI...</span>
              </>
            ) : (
              <>
                <Camera size={14} />
                <span>Upload Sheet</span>
              </>
            )}
          </button>

          {/* Save Draft Button (does not finalize invoice, allows returning to edit) */}
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={savingDraft || visits.length === 0}
            className="btn btn-secondary btn-sm"
            style={{
              gap: "0.4rem",
              fontSize: "0.82rem",
              padding: "0.38rem 0.8rem",
              fontWeight: 700,
              backgroundColor: "#f8fafc",
              borderColor: "#cbd5e1",
            }}
            title="Save changes as a draft without generating final invoice so you can return to edit anytime"
          >
            {savingDraft ? (
              <>
                <RefreshCw size={14} className="spin" />
                <span>Saving Draft...</span>
              </>
            ) : (
              <>
                <BookmarkCheck size={15} color="var(--primary)" />
                <span>Save Draft</span>
              </>
            )}
          </button>

          {/* Generate Invoice Final Button */}
          <button
            onClick={handleGenerateInvoice}
            disabled={submitting || visits.length === 0}
            className="btn btn-primary btn-sm"
            style={{ minWidth: "140px", fontSize: "0.82rem", padding: "0.4rem 0.85rem" }}
          >
            {submitting ? (
              <span>Generating...</span>
            ) : (
              <>
                <Save size={15} />
                <span>{editId ? "Update & Issue" : "Generate Invoice"}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Draft Save Success Notification */}
      {saveSuccessMsg && (
        <div
          style={{
            backgroundColor: "#f0fdf4",
            color: "#166534",
            border: "1px solid #bbf7d0",
            borderRadius: "6px",
            padding: "0.45rem 0.75rem",
            marginBottom: "0.5rem",
            fontSize: "0.82rem",
            display: "flex",
            alignItems: "center",
            gap: "0.45rem",
            fontWeight: 600,
            flexShrink: 0,
          }}
        >
          <CheckCircle2 size={16} color="#16a34a" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Notifications / Alerts */}
      {aiError && (
        <div
          style={{
            backgroundColor: "var(--danger-subtle)",
            color: "var(--danger)",
            border: "1px solid var(--danger-border)",
            borderRadius: "6px",
            padding: "0.45rem 0.75rem",
            marginBottom: "0.5rem",
            fontSize: "0.8rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
            <AlertCircle size={15} />
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
            padding: "0.45rem 0.75rem",
            marginBottom: "0.5rem",
            fontSize: "0.8rem",
            display: "flex",
            alignItems: "center",
            gap: "0.45rem",
            flexShrink: 0,
          }}
        >
          <AlertCircle size={15} />
          <span>{submitError}</span>
        </div>
      )}

      {showKeyInput && (
        <div
          className="card"
          style={{
            padding: "0.5rem 0.85rem",
            marginBottom: "0.5rem",
            backgroundColor: "#fffbeb",
            borderColor: "var(--warning-border)",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
            flexWrap: "wrap",
          }}
        >
          <Key size={15} color="var(--warning)" />
          <span style={{ fontSize: "0.8rem", fontWeight: 600 }}>OpenAI API Key:</span>
          <input
            type="password"
            placeholder="sk-proj-..."
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="form-input"
            style={{ flex: 1, height: "30px", fontSize: "0.8rem", minWidth: "220px", padding: "0.2rem 0.5rem" }}
          />
          <button onClick={handleSaveApiKey} className="btn btn-primary btn-sm" style={{ padding: "0.25rem 0.65rem", fontSize: "0.78rem" }}>
            Save Key & Run
          </button>
          <button
            onClick={() => setShowKeyInput(false)}
            className="btn btn-secondary btn-sm"
            style={{ padding: "0.25rem 0.5rem", fontSize: "0.78rem" }}
          >
            Cancel
          </button>
        </div>
      )}

      {/* Main Container */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          minHeight: 0,
          gap: "0.6rem",
          overflow: "hidden",
        }}
      >
        {/* Parameters Filter Strip: Agent, Agency, Dates, Summary Totals (No text cut-off) */}
        <div
          className="card"
          style={{
            padding: "0.65rem 0.85rem",
            display: "grid",
            gridTemplateColumns: "1.4fr 1.2fr 1fr 1fr 160px",
            gap: "0.65rem",
            alignItems: "end",
            flexShrink: 0,
            backgroundColor: "#ffffff",
          }}
        >
          {/* Agent Selection */}
          <div style={{ minWidth: 0 }}>
            <label
              style={{
                fontSize: "0.7rem",
                fontWeight: 700,
                color: "var(--text-secondary)",
                display: "block",
                marginBottom: "0.2rem",
                textTransform: "uppercase",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              1. Clinical Agent *
            </label>
            <select
              className="form-select"
              value={selectedWorkerId}
              onChange={(e) => handleWorkerChange(e.target.value)}
              style={{
                height: "36px",
                fontSize: "0.82rem",
                fontWeight: 600,
                padding: "0.3rem 0.6rem",
                width: "100%",
                lineHeight: "normal",
              }}
            >
              {workersWithRates.length === 0 ? (
                <option value="">No agents with configured rates</option>
              ) : (
                workersWithRates.map((w) => (
                  <option key={w._id} value={w._id}>
                    {w.firstName} {w.lastName} ({w.role})
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Agency Selection */}
          <div style={{ minWidth: 0 }}>
            <label
              style={{
                fontSize: "0.7rem",
                fontWeight: 700,
                color: "var(--text-secondary)",
                display: "block",
                marginBottom: "0.2rem",
                textTransform: "uppercase",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              2. Partner Agency *
            </label>
            <select
              className="form-select"
              value={selectedAgency}
              onChange={(e) => handleAgencyChange(e.target.value)}
              style={{
                height: "36px",
                fontSize: "0.82rem",
                fontWeight: 700,
                color: "var(--primary)",
                padding: "0.3rem 0.6rem",
                width: "100%",
                lineHeight: "normal",
              }}
            >
              {AGENCIES.map((agency) => (
                <option key={agency} value={agency}>
                  {agency}
                </option>
              ))}
            </select>
          </div>

          {/* Week Start */}
          <div style={{ minWidth: 0 }}>
            <label
              style={{
                fontSize: "0.7rem",
                fontWeight: 700,
                color: "var(--text-secondary)",
                display: "block",
                marginBottom: "0.2rem",
                textTransform: "uppercase",
                whiteSpace: "nowrap",
              }}
            >
              Week Start Date *
            </label>
            <input
              type="date"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
              className="form-input"
              style={{
                height: "36px",
                fontSize: "0.8rem",
                padding: "0.3rem 0.5rem",
                width: "100%",
                lineHeight: "normal",
              }}
            />
          </div>

          {/* Week End */}
          <div style={{ minWidth: 0 }}>
            <label
              style={{
                fontSize: "0.7rem",
                fontWeight: 700,
                color: "var(--text-secondary)",
                display: "block",
                marginBottom: "0.2rem",
                textTransform: "uppercase",
                whiteSpace: "nowrap",
              }}
            >
              Week End Date *
            </label>
            <input
              type="date"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
              className="form-input"
              style={{
                height: "36px",
                fontSize: "0.8rem",
                padding: "0.3rem 0.5rem",
                width: "100%",
                lineHeight: "normal",
              }}
            />
          </div>

          {/* KPI Total Amount Box */}
          <div
            style={{
              backgroundColor: "var(--bg-subtle)",
              border: "1px solid var(--border-color)",
              borderRadius: "6px",
              padding: "0.35rem 0.65rem",
              textAlign: "right",
              height: "36px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
              Total ({totalVisitsCount} visits)
            </div>
            <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--primary)", lineHeight: 1.1 }}>
              ${invoiceSubtotal.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Extracted Visits Interactive Table */}
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
              padding: "0.55rem 0.85rem",
              borderBottom: "1px solid var(--border-color)",
              backgroundColor: "var(--bg-subtle)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexShrink: 0,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <span style={{ fontWeight: 800, fontSize: "0.88rem", color: "var(--text-primary)" }}>
                Patient Visits ({visits.length})
              </span>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                Click service buttons to assign rates immediately
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
              <button
                type="button"
                onClick={handleAddRow}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: "0.75rem", padding: "0.25rem 0.55rem" }}
              >
                <Plus size={13} /> Add Row
              </button>
            </div>
          </div>

          {/* Table Body */}
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
                  padding: "3rem 1.5rem",
                  textAlign: "center",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Camera size={38} style={{ opacity: 0.35, marginBottom: "0.65rem" }} />
                <p style={{ fontWeight: 700, fontSize: "1rem", color: "var(--text-primary)" }}>
                  No visit records loaded yet
                </p>
                <p style={{ color: "var(--text-muted)", fontSize: "0.82rem", maxWidth: "460px", marginTop: "0.2rem" }}>
                  Click <strong>&quot;Paste from Clipboard&quot;</strong>, press <strong>Ctrl+V</strong>, or choose <strong>&quot;Upload Sheet&quot;</strong> to extract the patient names and visit dates automatically.
                </p>
                <div style={{ marginTop: "0.85rem", display: "flex", gap: "0.45rem" }}>
                  <button
                    type="button"
                    onClick={handlePasteFromClipboardButton}
                    className="btn btn-primary btn-sm"
                  >
                    <ClipboardPaste size={14} /> Paste from Clipboard
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="btn btn-secondary btn-sm"
                  >
                    <Upload size={14} /> Upload Sheet
                  </button>
                  <button
                    type="button"
                    onClick={handleAddRow}
                    className="btn btn-secondary btn-sm"
                  >
                    <Plus size={14} /> Add Row
                  </button>
                </div>
              </div>
            ) : (
              <table className="data-table" style={{ width: "100%" }}>
                <thead style={{ position: "sticky", top: 0, zIndex: 10, background: "#f8fafc" }}>
                  <tr>
                    <th style={{ width: "35px", textAlign: "center", padding: "0.5rem 0.4rem" }}>
                      <input
                        type="checkbox"
                        checked={visits.length > 0 && visits.every((r) => r.selected)}
                        onChange={(e) => handleToggleSelectAll(e.target.checked)}
                      />
                    </th>
                    <th style={{ width: "35px", padding: "0.5rem 0.4rem" }}>#</th>
                    <th style={{ width: "210px", padding: "0.5rem 0.6rem" }}>Patient Name</th>
                    <th style={{ width: "110px", padding: "0.5rem 0.5rem" }}>Visit Date</th>
                    <th style={{ padding: "0.5rem 0.6rem" }}>Service Code</th>
                    <th style={{ width: "95px", textAlign: "right", padding: "0.5rem 0.6rem" }}>
                      Rate ($)
                    </th>
                    <th style={{ width: "85px", textAlign: "right", padding: "0.5rem 0.6rem" }}>
                      Subtotal
                    </th>
                    <th style={{ width: "40px", textAlign: "center", padding: "0.5rem 0.4rem" }}></th>
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
                      <td style={{ textAlign: "center", padding: "0.35rem 0.4rem" }}>
                        <input
                          type="checkbox"
                          checked={row.selected}
                          onChange={(e) => handleUpdateRow(row.id, "selected", e.target.checked)}
                        />
                      </td>

                      {/* Row Index */}
                      <td style={{ fontSize: "0.78rem", color: "var(--text-muted)", padding: "0.35rem 0.4rem" }}>
                        {idx + 1}
                      </td>

                      {/* Compact Patient Name Input */}
                      <td style={{ padding: "0.3rem 0.5rem" }}>
                        <input
                          type="text"
                          value={row.patientName}
                          onChange={(e) => handleUpdateRow(row.id, "patientName", e.target.value)}
                          placeholder="Patient Name"
                          className="form-input"
                          style={{
                            height: "30px",
                            fontSize: "0.82rem",
                            fontWeight: 700,
                            padding: "0.15rem 0.45rem",
                            width: "100%",
                          }}
                        />
                      </td>

                      {/* Visit Date Input */}
                      <td style={{ padding: "0.3rem 0.45rem" }}>
                        <input
                          type="text"
                          value={row.visitDate}
                          onChange={(e) => handleUpdateRow(row.id, "visitDate", e.target.value)}
                          placeholder="9-2-26"
                          className="form-input"
                          style={{
                            height: "30px",
                            fontSize: "0.8rem",
                            padding: "0.15rem 0.45rem",
                            width: "100%",
                          }}
                        />
                      </td>

                      {/* 8 Clickable Service Buttons Row (Replaces dropdown) */}
                      <td style={{ padding: "0.3rem 0.5rem" }}>
                        <div
                          style={{
                            display: "inline-flex",
                            gap: "0.25rem",
                            alignItems: "center",
                            flexWrap: "nowrap",
                          }}
                        >
                          {SERVICE_BUTTONS.map((btn) => {
                            const isSelectedService = row.serviceType === btn.id;

                            // Special color for SR (Special Rate)
                            let activeBg = "var(--primary)";
                            let activeBorder = "var(--primary)";
                            if (btn.isSpecial) {
                              activeBg = "#b45309"; // amber-700
                              activeBorder = "#b45309";
                            } else if (btn.id === "NoBill") {
                              activeBg = "#475569"; // slate-600
                              activeBorder = "#475569";
                            }

                            return (
                              <button
                                key={btn.id}
                                type="button"
                                onClick={() => handleUpdateRow(row.id, "serviceType", btn.id)}
                                title={`${btn.fullName} (${btn.id})`}
                                style={{
                                  border: isSelectedService
                                    ? `1.5px solid ${activeBorder}`
                                    : "1px solid var(--border-color)",
                                  backgroundColor: isSelectedService ? activeBg : "#ffffff",
                                  color: isSelectedService ? "#ffffff" : "var(--text-primary)",
                                  fontSize: "0.78rem",
                                  fontWeight: isSelectedService ? 800 : 600,
                                  padding: "0.22rem 0.55rem",
                                  borderRadius: "5px",
                                  cursor: "pointer",
                                  lineHeight: 1.25,
                                  transition: "all 0.1s ease",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {btn.abbr}
                              </button>
                            );
                          })}
                        </div>
                      </td>

                      {/* Closed Rate Input */}
                      <td style={{ padding: "0.3rem 0.5rem", textAlign: "right" }}>
                        <div style={{ position: "relative", display: "inline-block", width: "75px" }}>
                          <span
                            style={{
                              position: "absolute",
                              left: "0.35rem",
                              top: "50%",
                              transform: "translateY(-50%)",
                              fontSize: "0.75rem",
                              color: "var(--text-muted)",
                              fontWeight: 700,
                              pointerEvents: "none",
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
                              height: "30px",
                              fontSize: "0.82rem",
                              fontWeight: 800,
                              textAlign: "right",
                              paddingLeft: "0.95rem",
                              paddingRight: "0.35rem",
                              width: "100%",
                            }}
                          />
                        </div>
                      </td>

                      {/* Subtotal */}
                      <td style={{ padding: "0.3rem 0.5rem", textAlign: "right", fontWeight: 800, fontSize: "0.85rem", color: "var(--text-primary)" }}>
                        ${row.selected ? (Number(row.rate) || 0) : 0}
                      </td>

                      {/* Delete */}
                      <td style={{ textAlign: "center", padding: "0.3rem 0.4rem" }}>
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
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Table Footer */}
          {visits.length > 0 && (
            <div
              style={{
                padding: "0.5rem 0.85rem",
                borderTop: "1px solid var(--border-color)",
                backgroundColor: "var(--bg-subtle)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexShrink: 0,
              }}
            >
              <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                Selected for Invoice: <strong>{totalVisitsCount}</strong> of {visits.length} visits
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div style={{ fontSize: "0.88rem", fontWeight: 800 }}>
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
