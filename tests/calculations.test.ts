import { describe, it, expect } from "vitest";
import {
  calculateItemAmount,
  calculateInvoiceTotals,
  formatCurrency,
  validateInvoiceDates,
  getAgentInitials,
  generateStructuredInvoiceNumber,
  isPtaRole,
  getServicesForRole,
  generateUniqueInitials,
} from "../src/lib/calculations";

describe("Invoice & Payroll Calculation Engine", () => {
  describe("calculateItemAmount", () => {
    it("should correctly compute standard regular hours without overtime", () => {
      const item = {
        regularHours: 40,
        regularRate: 55,
        overtimeHours: 0,
        overtimeRate: 0,
      };
      expect(calculateItemAmount(item)).toBe(2200);
    });

    it("should correctly compute overtime hours added to regular hours", () => {
      const item = {
        regularHours: 40,
        regularRate: 50,
        overtimeHours: 8,
        overtimeRate: 75,
      };
      // 40 * 50 = 2000, 8 * 75 = 600 -> Total = 2600
      expect(calculateItemAmount(item)).toBe(2600);
    });

    it("should handle fractional hours and decimals accurately", () => {
      const item = {
        regularHours: 37.5,
        regularRate: 62.75,
        overtimeHours: 3.25,
        overtimeRate: 94.125,
      };
      // 37.5 * 62.75 = 2353.125
      // 3.25 * 94.125 = 305.90625
      // Total = 2659.03125 -> rounded to 2 decimal places: 2659.03
      expect(calculateItemAmount(item)).toBe(2659.03);
    });

    it("should guard against negative inputs and return 0", () => {
      const item = {
        regularHours: -10,
        regularRate: 50,
        overtimeHours: -5,
        overtimeRate: 75,
      };
      expect(calculateItemAmount(item)).toBe(0);
    });

    it("should handle undefined or zero values gracefully", () => {
      const item = {
        regularHours: 0,
        regularRate: 0,
      };
      expect(calculateItemAmount(item)).toBe(0);
    });
  });

  describe("calculateInvoiceTotals", () => {
    it("should sum multiple staff line items and compute subtotal", () => {
      const items = [
        { regularHours: 40, regularRate: 65, overtimeHours: 5, overtimeRate: 97.5 }, // 2600 + 487.5 = 3087.5
        { regularHours: 35, regularRate: 45, overtimeHours: 0, overtimeRate: 0 },    // 1575
        { regularHours: 40, regularRate: 35, overtimeHours: 10, overtimeRate: 52.5 }, // 1400 + 525 = 1925
      ];

      const result = calculateInvoiceTotals(items, 0);

      expect(result.subtotal).toBe(6587.5);
      expect(result.taxAmount).toBe(0);
      expect(result.totalAmount).toBe(6587.5);
      expect(result.totalRegularHours).toBe(115);
      expect(result.totalOvertimeHours).toBe(15);
    });

    it("should accurately apply percentage tax rate", () => {
      const items = [
        { regularHours: 20, regularRate: 100, overtimeHours: 0, overtimeRate: 0 }, // 2000
      ];

      // 7% tax on $2,000 = $140, total = $2,140
      const result = calculateInvoiceTotals(items, 7);

      expect(result.subtotal).toBe(2000);
      expect(result.taxAmount).toBe(140);
      expect(result.totalAmount).toBe(2140);
    });

    it("should handle empty item lists without throwing", () => {
      const result = calculateInvoiceTotals([], 5);

      expect(result.subtotal).toBe(0);
      expect(result.taxAmount).toBe(0);
      expect(result.totalAmount).toBe(0);
      expect(result.totalRegularHours).toBe(0);
      expect(result.totalOvertimeHours).toBe(0);
    });
  });

  describe("formatCurrency", () => {
    it("should format dollar amounts with comma separators and two decimals", () => {
      expect(formatCurrency(1250)).toBe("$1,250.00");
      expect(formatCurrency(0)).toBe("$0.00");
      expect(formatCurrency(1000000.5)).toBe("$1,000,000.50");
    });
  });

  describe("validateInvoiceDates", () => {
    it("should validate a correct chronological date range", () => {
      const res = validateInvoiceDates("2026-10-01", "2026-10-07", "2026-10-21");
      expect(res.isValid).toBe(true);
      expect(res.error).toBeUndefined();
    });

    it("should reject when period start date is after period end date", () => {
      const res = validateInvoiceDates("2026-10-15", "2026-10-07");
      expect(res.isValid).toBe(false);
      expect(res.error).toContain("Period start date cannot be after period end date");
    });

    it("should reject invalid date strings", () => {
      const res = validateInvoiceDates("not-a-date", "2026-10-07");
      expect(res.isValid).toBe(false);
      expect(res.error).toContain("Invalid date format");
    });
  });

  describe("Agent & Agency Per-Visit Invoice Generator", () => {
    it("should calculate correct invoice subtotal from extracted patient visit lines and service rates", () => {
      const visits = [
        { patientName: "Jose Cano", visitDate: "9-2-26", serviceType: "SOC", rate: 85, selected: true },
        { patientName: "Elsa Sauma", visitDate: "9-17-26", serviceType: "SOC", rate: 85, selected: true },
        { patientName: "Jose Mitrani", visitDate: "9-22-26", serviceType: "Special Rate", rate: 120, selected: true },
        { patientName: "Carmen Chaple", visitDate: "9-23-26", serviceType: "ReCert", rate: 70, selected: true },
        { patientName: "Rogelio Callava", visitDate: "9-24-26", serviceType: "Disch", rate: 65, selected: false }, // unselected
      ];

      const selectedVisits = visits.filter((v) => v.selected);
      expect(selectedVisits).toHaveLength(4);

      const subtotal = selectedVisits.reduce((acc, v) => acc + v.rate, 0);
      // 85 + 85 + 120 + 70 = 360
      expect(subtotal).toBe(360);
    });

    it("should resolve service rate from agency assignment config", () => {
      const agencyAssignments = [
        {
          agencyName: "ALC",
          services: [
            { serviceType: "SOC", rate: 85 },
            { serviceType: "ReCert", rate: 70 },
            { serviceType: "Special Rate", rate: 110 },
          ],
        },
      ];

      const resolveRate = (agency: string, service: string) => {
        const foundAgency = agencyAssignments.find((a) => a.agencyName === agency);
        if (!foundAgency) return 0;
        const foundSrv = foundAgency.services.find((s) => s.serviceType === service);
        return foundSrv ? foundSrv.rate : 0;
      };

      expect(resolveRate("ALC", "SOC")).toBe(85);
      expect(resolveRate("ALC", "Special Rate")).toBe(110);
      expect(resolveRate("ALC", "Eval")).toBe(0);
      expect(resolveRate("USAD", "SOC")).toBe(0);
    });
  });

  describe("Structured Invoice Nomenclature Engine", () => {
    it("should extract correct agent initials for first and last names", () => {
      expect(getAgentInitials("Camila", "Rodriguez")).toBe("CR");
      expect(getAgentInitials("Alfredo", "Gomez")).toBe("AG");
      expect(getAgentInitials("Therina")).toBe("TH");
      expect(getAgentInitials("Mary Jane", "Watson")).toBe("MW");
    });

    it("should build structured invoice nomenclature INV-<INITIALS>-<YEAR>-LOT<LOT#>-<UID>", () => {
      const invNum1 = generateStructuredInvoiceNumber({
        agentName: "Camila",
        agentLastName: "Rodriguez",
        year: 2026,
        lotNumber: 1,
        sequenceNumber: 1,
      });
      expect(invNum1).toBe("INV-CR-2026-LOT001-0001");

      const invNum2 = generateStructuredInvoiceNumber({
        agentName: "Alfredo",
        agentLastName: "Gomez",
        year: 2026,
        lotNumber: 5,
        sequenceNumber: 12,
      });
      expect(invNum2).toBe("INV-AG-2026-LOT005-0012");
    });

    it("should handle string lot numbers and pad correctly", () => {
      const invNum = generateStructuredInvoiceNumber({
        agentName: "Therina",
        year: 2026,
        lotNumber: "02",
        sequenceNumber: "45",
      });
      expect(invNum).toBe("INV-TH-2026-LOT002-0045");
    });
  });

  describe("PTA vs PT Services Configuration", () => {
    it("should correctly identify PTA roles", () => {
      expect(isPtaRole("PTA")).toBe(true);
      expect(isPtaRole("Physical Therapy Assistant")).toBe(true);
      expect(isPtaRole("pta")).toBe(true);
      expect(isPtaRole("PT")).toBe(false);
      expect(isPtaRole("Physical Therapist")).toBe(false);
      expect(isPtaRole("Admin")).toBe(false);
      expect(isPtaRole(undefined)).toBe(false);
    });

    it("should return only 3 services for PTA agents: Visit, Missed Visit, Special Rate", () => {
      const ptaServices = getServicesForRole("PTA");
      expect(ptaServices).toEqual(["Visit", "Missed Visit", "Special Rate"]);
      expect(ptaServices.length).toBe(3);
    });

    it("should return the standard 8 services for PT agents", () => {
      const ptServices = getServicesForRole("PT");
      expect(ptServices).toEqual([
        "SOC",
        "ReCert",
        "ReEval",
        "Eval",
        "Disch",
        "Missed Visit",
        "Special Rate",
        "NoBill",
      ]);
      expect(ptServices.length).toBe(8);
    });
  });

  describe("Agent Initials & Collision Resolution", () => {
    it("should generate standard initials for new agents", () => {
      expect(generateUniqueInitials("Alex", "Martin")).toBe("AM");
      expect(generateUniqueInitials("Odalys", "Barroso")).toBe("OB");
    });

    it("should resolve collision by using 2nd letter of last name if first is taken", () => {
      // Alex Martin -> AM
      // Another Alex Martin (or Alex Miller) where AM is taken -> AA (M-A)
      const existing = ["AM"];
      expect(generateUniqueInitials("Alex", "Martin", existing)).toBe("AA");
    });

    it("should resolve collision using 3rd letter of last name if 2nd is also taken", () => {
      const existing = ["AM", "AA"];
      // Alex Martin: M(1) A(2) R(3) -> AR
      expect(generateUniqueInitials("Alex", "Martin", existing)).toBe("AR");
    });

    it("should resolve collision between Alex Martin and Alex Miller", () => {
      const existing = ["AM"]; // taken by Alex Martin
      // Alex Miller: M(1) I(2) -> AI
      expect(generateUniqueInitials("Alex", "Miller", existing)).toBe("AI");
    });
  });
});


