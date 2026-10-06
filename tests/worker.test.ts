import { describe, it, expect } from "vitest";

describe("Agency Worker Roster & Roles Logic", () => {
  const DEFAULT_ROLES = [
    "Physical Therapy (PT)",
    "Physical Therapy Assistant (PTA)",
  ];

  it("should contain default therapy roles initially", () => {
    expect(DEFAULT_ROLES).toContain("Physical Therapy (PT)");
    expect(DEFAULT_ROLES).toContain("Physical Therapy Assistant (PTA)");
    expect(DEFAULT_ROLES.length).toBe(2);
  });

  it("should allow dynamically adding new custom roles without duplicates", () => {
    const rolesList = [...DEFAULT_ROLES];
    const newRole = "Occupational Therapy (OT)";

    if (!rolesList.includes(newRole)) {
      rolesList.push(newRole);
    }

    expect(rolesList).toContain("Occupational Therapy (OT)");
    expect(rolesList.length).toBe(3);

    // Attempt duplicate addition
    if (!rolesList.includes(newRole)) {
      rolesList.push(newRole);
    }
    expect(rolesList.length).toBe(3);
  });

  it("should validate required worker fields (firstName, lastName, role)", () => {
    const isValidWorker = (w: { firstName?: string; lastName?: string; role?: string }) => {
      return Boolean(w.firstName?.trim() && w.lastName?.trim() && w.role?.trim());
    };

    expect(isValidWorker({ firstName: "Camila", lastName: "Rodriguez", role: "Physical Therapy (PT)" })).toBe(true);
    expect(isValidWorker({ firstName: "", lastName: "Rodriguez", role: "Physical Therapy (PT)" })).toBe(false);
    expect(isValidWorker({ firstName: "Camila", lastName: "", role: "Physical Therapy (PT)" })).toBe(false);
    expect(isValidWorker({ firstName: "Camila", lastName: "Rodriguez", role: "" })).toBe(false);
  });

  it("should default hourly rate to 0 when not specified", () => {
    const createWorkerPayload = (input: { firstName: string; lastName: string; role: string; hourlyRate?: number }) => {
      return {
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        role: input.role.trim(),
        hourlyRate: Number(input.hourlyRate) || 0,
        status: "active",
      };
    };

    const worker = createWorkerPayload({
      firstName: "David",
      lastName: "Hernandez",
      role: "Physical Therapy Assistant (PTA)",
    });

    expect(worker.hourlyRate).toBe(0);
    expect(worker.status).toBe("active");
  });
});
