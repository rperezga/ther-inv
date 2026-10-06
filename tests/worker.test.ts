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

  it("should extract role abbreviation correctly for PT and PTA", () => {
    const getRoleAbbr = (roleStr: string) => {
      const match = roleStr.match(/\(([^)]+)\)/);
      if (match) return match[1].trim();
      const lower = roleStr.toLowerCase().trim();
      if (lower === "physical therapy assistant" || lower === "pta") return "PTA";
      if (lower === "physical therapy" || lower === "pt") return "PT";
      return roleStr;
    };

    expect(getRoleAbbr("Physical Therapy (PT)")).toBe("PT");
    expect(getRoleAbbr("Physical Therapy Assistant (PTA)")).toBe("PTA");
    expect(getRoleAbbr("PT")).toBe("PT");
    expect(getRoleAbbr("PTA")).toBe("PTA");
    expect(getRoleAbbr("Occupational Therapy (OT)")).toBe("OT");
  });

  it("should filter staff members in real-time across name, email, phone, and role", () => {
    const staff = [
      { firstName: "Alex", lastName: "Suarez", role: "Physical Therapy Assistant (PTA)", phone: "305-555-1111", email: "alex18emas@gmail.com" },
      { firstName: "Jason", lastName: "Polo", role: "Physical Therapy (PT)", phone: "305-555-2222", email: "jasontherapy55@gmail.com" },
      { firstName: "Maria Patricia", lastName: "Sanchez", role: "Physical Therapy (PT)", phone: "786-555-3333", email: "sanchez.patricia11@gmail.com" },
      { firstName: "Odalys", lastName: "Barroso", role: "Physical Therapy Assistant (PTA)", phone: "305-555-4444", email: "odaltrujillo@yahoo.com" },
    ];

    const searchStaff = (query: string) => {
      const q = query.toLowerCase().trim();
      if (!q) return staff;
      return staff.filter((s) =>
        s.firstName.toLowerCase().includes(q) ||
        s.lastName.toLowerCase().includes(q) ||
        s.role.toLowerCase().includes(q) ||
        (s.phone && s.phone.toLowerCase().includes(q)) ||
        (s.email && s.email.toLowerCase().includes(q))
      );
    };

    // By name
    expect(searchStaff("jason")).toHaveLength(1);
    expect(searchStaff("jason")[0].lastName).toBe("Polo");

    // By email
    expect(searchStaff("odaltrujillo@yahoo.com")).toHaveLength(1);
    expect(searchStaff("odaltrujillo@yahoo.com")[0].firstName).toBe("Odalys");

    // By phone
    expect(searchStaff("786-555")).toHaveLength(1);
    expect(searchStaff("786-555")[0].firstName).toBe("Maria Patricia");

    // By role / abbreviation
    expect(searchStaff("PTA")).toHaveLength(2);
    expect(searchStaff("Physical Therapy")).toHaveLength(4);
  });

  it("should configure agency assignments with per-service rates for staff members", () => {
    const AGENCIES = ["A&A HEALTH SERVICE", "ALC", "INNOVATION", "MEDCARE", "OASIS", "USAD"];
    const SERVICES = ["SOC", "ReCert", "ReEval", "Eval", "Disch", "NoBill", "Missed Visit"];

    expect(AGENCIES).toHaveLength(6);
    expect(SERVICES).toContain("Missed Visit");
    expect(SERVICES).toContain("SOC");
    expect(SERVICES).toContain("ReCert");

    const workerAssignments = [
      {
        agencyName: "ALC",
        services: [
          { serviceType: "SOC", rate: 85 },
          { serviceType: "Eval", rate: 75 },
          { serviceType: "ReCert", rate: 70 },
          { serviceType: "Missed Visit", rate: 25 },
        ],
      },
      {
        agencyName: "MEDCARE",
        services: [
          { serviceType: "SOC", rate: 90 },
          { serviceType: "Disch", rate: 65 },
        ],
      },
    ];

    const getRateForService = (agency: string, service: string) => {
      const agencyRecord = workerAssignments.find((a) => a.agencyName === agency);
      if (!agencyRecord) return 0;
      const serviceRecord = agencyRecord.services.find((s) => s.serviceType === service);
      return serviceRecord ? serviceRecord.rate : 0;
    };

    expect(getRateForService("ALC", "SOC")).toBe(85);
    expect(getRateForService("ALC", "Missed Visit")).toBe(25);
    expect(getRateForService("MEDCARE", "SOC")).toBe(90);
    expect(getRateForService("MEDCARE", "Eval")).toBe(0); // Not configured
    expect(getRateForService("OASIS", "SOC")).toBe(0); // Unassigned agency
  });
});

