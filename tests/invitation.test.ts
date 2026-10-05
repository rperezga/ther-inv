import { describe, it, expect } from "vitest";
import crypto from "crypto";

describe("Invitation System & Lifecycle Logic", () => {
  it("should generate cryptographically secure unique tokens", () => {
    const tokens = new Set<string>();
    for (let i = 0; i < 50; i++) {
      const token = crypto.randomBytes(24).toString("hex");
      expect(token).toHaveLength(48);
      tokens.add(token);
    }
    // All 50 tokens must be unique
    expect(tokens.size).toBe(50);
  });

  it("should detect when an invitation token has expired", () => {
    const pastDate = new Date(Date.now() - 1000 * 60 * 60); // 1 hour ago
    const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7); // 7 days ahead

    const isExpired = (expiresAt: Date) => new Date() > new Date(expiresAt);

    expect(isExpired(pastDate)).toBe(true);
    expect(isExpired(futureDate)).toBe(false);
  });

  it("should validate allowed invitation roles", () => {
    const validRoles = ["manager", "viewer"];
    const isValidRole = (r: string) => validRoles.includes(r);

    expect(isValidRole("manager")).toBe(true);
    expect(isValidRole("viewer")).toBe(true);
    expect(isValidRole("admin")).toBe(false); // Admin cannot be given via public invite
    expect(isValidRole("hacker")).toBe(false);
  });

  it("should format invitation URLs properly", () => {
    const baseUrl = "https://ther-inv.agency.internal";
    const token = "a1b2c3d4e5f67890";
    const inviteUrl = `${baseUrl}/register?invite=${token}`;

    expect(inviteUrl).toBe("https://ther-inv.agency.internal/register?invite=a1b2c3d4e5f67890");
    const parsed = new URL(inviteUrl);
    expect(parsed.searchParams.get("invite")).toBe(token);
  });
});
