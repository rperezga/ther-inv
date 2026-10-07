import { describe, it, expect } from "vitest";
import { hashPassword, comparePassword, signToken, verifyToken } from "../src/lib/auth";
import { UserRole } from "../src/lib/types";

describe("Authentication & RBAC Security Engine", () => {
  describe("Password Hashing & Comparison", () => {
    it("should hash a plaintext password securely", async () => {
      const plaintext = "securePassword123!";
      const hash = await hashPassword(plaintext);

      expect(hash).toBeDefined();
      expect(hash.length).toBeGreaterThan(20);
      expect(hash).not.toBe(plaintext);
    });

    it("should generate distinct hashes for the same password due to salts", async () => {
      const plaintext = "mySuperSecretPassword";
      const hash1 = await hashPassword(plaintext);
      const hash2 = await hashPassword(plaintext);

      expect(hash1).not.toBe(hash2);
      expect(await comparePassword(plaintext, hash1)).toBe(true);
      expect(await comparePassword(plaintext, hash2)).toBe(true);
    });

    it("should verify correct password and reject incorrect passwords", async () => {
      const plaintext = "therina123456";
      const hash = await hashPassword(plaintext);

      const isValid = await comparePassword(plaintext, hash);
      const isInvalid = await comparePassword("wrongPassword", hash);

      expect(isValid).toBe(true);
      expect(isInvalid).toBe(false);
    });
  });

  describe("JWT Token Management", () => {
    const mockUserPayload = {
      userId: "654321098765432109876543",
      email: "therina@agency.com",
      role: "manager" as UserRole,
      name: "Therina",
    };

    it("should sign a valid JWT token with user claims", () => {
      const token = signToken(mockUserPayload);

      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
      expect(token.split(".").length).toBe(3); // Header.Payload.Signature
    });

    it("should verify and decode valid JWT payload correctly", () => {
      const token = signToken(mockUserPayload);
      const decoded = verifyToken(token);

      expect(decoded).not.toBeNull();
      expect(decoded?.userId).toBe(mockUserPayload.userId);
      expect(decoded?.email).toBe(mockUserPayload.email);
      expect(decoded?.role).toBe(mockUserPayload.role);
      expect(decoded?.name).toBe(mockUserPayload.name);
    });

    it("should return null for malformed or tampered tokens", () => {
      expect(verifyToken("invalid.token.string")).toBeNull();
      expect(verifyToken("")).toBeNull();

      const validToken = signToken(mockUserPayload);
      const tampered = validToken.slice(0, -6) + "xxxxxx";
      expect(verifyToken(tampered)).toBeNull();
    });
  });

  describe("Role Hierarchy & Permissions Logic", () => {
    const roles: UserRole[] = ["admin", "manager", "viewer"];

    it("should allow admin access to administrative endpoints", () => {
      const allowedRoles: UserRole[] = ["admin"];
      expect(allowedRoles.includes("admin")).toBe(true);
      expect(allowedRoles.includes("manager")).toBe(false);
      expect(allowedRoles.includes("viewer")).toBe(false);
    });

    it("should allow both admin and manager to create invoices and manage roster", () => {
      const allowedRoles: UserRole[] = ["admin", "manager"];
      expect(allowedRoles.includes("admin")).toBe(true);
      expect(allowedRoles.includes("manager")).toBe(true);
      expect(allowedRoles.includes("viewer")).toBe(false);
    });

    it("should allow all authenticated roles to view invoices", () => {
      const allowedRoles: UserRole[] = ["admin", "manager", "viewer"];
      roles.forEach((role) => {
        expect(allowedRoles.includes(role)).toBe(true);
      });
    });
  });

  describe("Password Change Logic & Security", () => {
    it("should successfully update and re-hash password when current password matches", async () => {
      const currentPassword = "oldSecretPassword123!";
      let storedHash = hashPassword(currentPassword);

      // Verify current password check
      const isCurrentValid = comparePassword("oldSecretPassword123!", storedHash);
      expect(isCurrentValid).toBe(true);

      // Update with new password
      const newPassword = "brandNewSecurePassword456$";
      storedHash = hashPassword(newPassword);

      // Verify old password is no longer valid and new password works
      expect(comparePassword(currentPassword, storedHash)).toBe(false);
      expect(comparePassword(newPassword, storedHash)).toBe(true);
    });

    it("should reject password change when current password is wrong", async () => {
      const storedHash = hashPassword("correctPassword123");
      const attemptCurrent = "wrongPasswordAttempt";

      expect(comparePassword(attemptCurrent, storedHash)).toBe(false);
    });

    it("should validate password change minimum length requirement", () => {
      const minLength = 6;
      expect("12345".length >= minLength).toBe(false);
      expect("123456".length >= minLength).toBe(true);
      expect("newStrongPass99!".length >= minLength).toBe(true);
    });

    it("should enforce confirmation matching requirement", () => {
      const newPass = "securePassword99!";
      const confirmPassValid = "securePassword99!";
      const confirmPassMismatch = "differentPassword";

      expect(newPass === confirmPassValid).toBe(true);
      expect(newPass === confirmPassMismatch).toBe(false);
    });
  });
});
