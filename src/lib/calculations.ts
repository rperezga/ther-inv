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
  const lotFormatted = `LOT${String(lotNum).padStart(2, "0")}`;
  
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
