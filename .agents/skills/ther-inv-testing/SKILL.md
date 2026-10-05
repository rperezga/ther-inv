---
name: ther-inv-testing
description: Runbook and standards for creating and executing automated unit and integration tests across authentication, calculations, invitations, and API endpoints in THER-INV.
---

# THER-INV Automated Testing Skill

Use this skill whenever adding new features, modifying models, refactoring calculation logic, or preparing a release to verify system invariants and prevent regressions.

## Test Runner Architecture

- **Engine**: Vitest (v5+) with native TypeScript and `@/...` path resolution.
- **Configuration**: `vitest.config.mjs`
- **Location**: `tests/` directory at the repository root.

## Running Tests

- **Run all test suites once**:
  ```bash
  npm test
  ```
- **Run in watch mode during development**:
  ```bash
  npm run test:watch
  ```
- **Run a single test file**:
  ```bash
  npx vitest run tests/calculations.test.ts
  ```

## Writing Tests: Conventions

1. **Calculations (`tests/calculations.test.ts`)**:
   - Ensure edge cases are covered (0 hours, negative hours, float precision, high volume line items).
   - Test date validation logic for overlapping or inverted billing periods.
2. **Authentication & RBAC (`tests/auth.test.ts`)**:
   - Verify bcrypt password hashing produces unique salted hashes.
   - Verify JWT creation, claim structure, and rejection of tampered tokens.
   - Verify role permission maps (`admin`, `manager`, `viewer`).
3. **Invitations (`tests/invitation.test.ts`)**:
   - Verify crypto randomness and token length (24 bytes hex = 48 chars).
   - Verify expiration boundary checks.

## Verification Checklist

Before pushing commits:
- [ ] Run `npm test` and ensure all tests pass (0 failures).
- [ ] Run `npm run build` to ensure zero compilation or type errors.
