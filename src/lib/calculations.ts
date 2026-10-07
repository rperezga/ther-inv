/**
 * Invoicing & Payroll Calculation Utility Functions
 */

export interface InvoiceItemCalculationInput {
  regularHours: number;
  regularRate: number;
  overtimeHours?: number;
  overtimeRate?: number;
}

/**
 * Calculates total line item amount based on regular and overtime hours.
 */
export function calculateItemAmount(item: InvoiceItemCalculationInput): number {
  const regHours = Math.max(0, Number(item.regularHours) || 0);
  const regRate = Math.max(0, Number(item.regularRate) || 0);
  const otHours = Math.max(0, Number(item.overtimeHours) || 0);
  const otRate = Math.max(0, Number(item.overtimeRate) || 0);

  const regularTotal = regHours * regRate;
  const overtimeTotal = otHours * otRate;

  return Math.round((regularTotal + overtimeTotal) * 100) / 100;
}

/**
 * Calculates invoice subtotal, tax amount, and final total.
 */
export function calculateInvoiceTotals(
  items: InvoiceItemCalculationInput[],
  taxRate: number = 0
): {
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  totalRegularHours: number;
  totalOvertimeHours: number;
} {
  let subtotal = 0;
  let totalRegularHours = 0;
  let totalOvertimeHours = 0;

  for (const item of items) {
    const itemAmount = calculateItemAmount(item);
    subtotal += itemAmount;
    totalRegularHours += Math.max(0, Number(item.regularHours) || 0);
    totalOvertimeHours += Math.max(0, Number(item.overtimeHours) || 0);
  }

  subtotal = Math.round(subtotal * 100) / 100;

  const validTaxRate = Math.max(0, Math.min(100, Number(taxRate) || 0));
  const taxAmount = Math.round((subtotal * (validTaxRate / 100)) * 100) / 100;
  const totalAmount = Math.round((subtotal + taxAmount) * 100) / 100;

  return {
    subtotal,
    taxAmount,
    totalAmount,
    totalRegularHours,
    totalOvertimeHours,
  };
}

/**
 * Formats a numeric currency value to standard USD format ($X,XXX.XX)
 */
export function formatCurrency(amount: number): string {
  const safeAmount = Number(amount) || 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safeAmount);
}

/**
 * Validates invoice period and due dates.
 */
export function validateInvoiceDates(
  periodStart: string | Date,
  periodEnd: string | Date,
  dueDate?: string | Date
): { isValid: boolean; error?: string } {
  const start = new Date(periodStart);
  const end = new Date(periodEnd);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { isValid: false, error: "Invalid date format provided" };
  }

  if (start > end) {
    return { isValid: false, error: "Period start date cannot be after period end date" };
  }

  if (dueDate) {
    const due = new Date(dueDate);
    if (isNaN(due.getTime())) {
      return { isValid: false, error: "Invalid due date format" };
    }
  }

  return { isValid: true };
}

/**
 * Extracts first and last name initials from an agent's full name.
 * e.g., "Camila Rodriguez" -> "CR", "John" -> "J", "Mary Jane Watson" -> "MW"
 */
export function getAgentInitials(nameOrFirst: string, lastName?: string): string {
  if (lastName && lastName.trim()) {
    const f = nameOrFirst.trim().charAt(0).toUpperCase();
    const l = lastName.trim().charAt(0).toUpperCase();
    return `${f}${l}`.replace(/[^A-Z]/g, "X");
  }

  const parts = nameOrFirst.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "XX";
  if (parts.length === 1) {
    const clean = parts[0].replace(/[^A-Za-z]/g, "").toUpperCase();
    return (clean.slice(0, 2) || "XX").padEnd(2, "X");
  }

  const firstChar = parts[0].charAt(0).toUpperCase();
  const lastChar = parts[parts.length - 1].charAt(0).toUpperCase();
  return `${firstChar}${lastChar}`.replace(/[^A-Z]/g, "X");
}

/**
 * Computes unique 2-letter initials for an agent given existing assigned initials.
 * If the standard initials (First letter + First letter of Last Name) already exist:
 * It tries:
 * 1. First letter of First Name + 2nd letter of Last Name
 * 2. First letter of First Name + 3rd letter of Last Name
 * 3. Continues with subsequent letters of Last Name, then letters of First Name, or numbers.
 */
export function generateUniqueInitials(
  firstName: string,
  lastName: string,
  existingInitials: string[] = []
): string {
  const existingSet = new Set(existingInitials.map((i) => i.toUpperCase()));
  const fClean = (firstName || "").replace(/[^A-Za-z]/g, "").toUpperCase();
  const lClean = (lastName || "").replace(/[^A-Za-z]/g, "").toUpperCase();

  const f0 = fClean.charAt(0) || "X";

  // 1. Primary: First letter of First Name + 1st letter of Last Name
  if (lClean.length >= 1) {
    const cand = `${f0}${lClean.charAt(0)}`;
    if (!existingSet.has(cand)) return cand;
  }

  // 2. Collision resolution: First letter + 2nd letter of Last Name, then 3rd, 4th, etc.
  for (let i = 1; i < lClean.length; i++) {
    const cand = `${f0}${lClean.charAt(i)}`;
    if (!existingSet.has(cand)) return cand;
  }

  // 3. If still collision, try 2nd letter of First Name + 1st letter of Last Name
  for (let i = 1; i < fClean.length; i++) {
    const cand = `${fClean.charAt(i)}${lClean.charAt(0) || "X"}`;
    if (!existingSet.has(cand)) return cand;
  }

  // 4. Fallback with digits
  for (let num = 2; num <= 9; num++) {
    const cand = `${f0}${num}`;
    if (!existingSet.has(cand)) return cand;
  }

  return `${f0}Z`;
}

/**
 * Generates structured invoice nomenclature:
 * INV-<AGENT INITIALS>-<YEAR>-<LOT#>-<INCREMENTAL UID>
 * e.g. INV-CR-2026-LOT01-0001
 */
export function generateStructuredInvoiceNumber(params: {
  agentName: string;
  agentLastName?: string;
  year?: number | string;
  lotNumber: number | string;
  sequenceNumber: number | string;
}): string {
  const initials = getAgentInitials(params.agentName, params.agentLastName);
  const year = params.year || new Date().getFullYear();
  
  const lotNum = parseInt(String(params.lotNumber), 10) || 1;
  const lotFormatted = `LOT${String(lotNum).padStart(3, "0")}`;
  
  const seqNum = parseInt(String(params.sequenceNumber), 10) || 1;
  const seqFormatted = String(seqNum).padStart(4, "0");

  return `INV-${initials}-${year}-${lotFormatted}-${seqFormatted}`;
}

export const PTA_SERVICES = ["Visit", "Missed Visit", "Special Rate"] as const;
export const PT_SERVICES = [
  "SOC",
  "ReCert",
  "ReEval",
  "Eval",
  "Disch",
  "Missed Visit",
  "Special Rate",
  "NoBill",
] as const;

export function isPtaRole(role?: string): boolean {
  if (!role) return false;
  const lower = role.toLowerCase();
  return lower.includes("pta") || lower.includes("assistant");
}

export function getServicesForRole(role?: string): readonly string[] {
  return isPtaRole(role) ? PTA_SERVICES : PT_SERVICES;
}

/**
 * Normalizes any date string (e.g. "9/15/26", "2026-09-28", "9-15-2026", "9/15")
 * into a standardized MM/DD/YY format (e.g. "09/15/26").
 */
export function normalizeDateToMMDDYY(rawDate?: string | Date): string {
  if (!rawDate) return "";
  const str = String(rawDate).trim();
  if (!str) return "";

  // If already matches M/D/YY or MM/DD/YY or M-D-YY
  const slashOrDashMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?$/);
  if (slashOrDashMatch) {
    const month = parseInt(slashOrDashMatch[1], 10);
    const day = parseInt(slashOrDashMatch[2], 10);
    let year = slashOrDashMatch[3] ? parseInt(slashOrDashMatch[3], 10) : new Date().getFullYear();
    if (year < 100) year += 2000;
    const mm = String(month).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    const yy = String(year).slice(-2);
    return `${mm}/${dd}/${yy}`;
  }

  // If ISO "YYYY-MM-DD"
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10);
    const day = parseInt(isoMatch[3], 10);
    const mm = String(month).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    const yy = String(year).slice(-2);
    return `${mm}/${dd}/${yy}`;
  }

  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const yy = String(d.getFullYear()).slice(-2);
    return `${mm}/${dd}/${yy}`;
  }

  return str;
}

/**
 * Converts a date string in any format (e.g. "09/15/26" or "2026-09-15") into "YYYY-MM-DD" for HTML date inputs.
 */
export function toInputDateFormat(dateStr?: string | Date): string {
  if (!dateStr) return "";
  const str = String(dateStr).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

  const slashMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?$/);
  if (slashMatch) {
    const month = parseInt(slashMatch[1], 10);
    const day = parseInt(slashMatch[2], 10);
    let year = slashMatch[3] ? parseInt(slashMatch[3], 10) : new Date().getFullYear();
    if (year < 100) year += 2000;
    const yyyy = String(year);
    const mm = String(month).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split("T")[0];
  }
  return "";
}
