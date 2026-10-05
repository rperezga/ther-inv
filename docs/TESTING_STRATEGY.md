# 🧪 Automated Testing Strategy & Execution

## Overview

Quality assurance in **THER-INV** relies on automated unit and integration tests powered by **Vitest**. The test suite validates financial calculation accuracy, role-based authorization security invariants, and invitation lifecycles.

---

## Test Suites

| File | Focus Area | Tests Count | Status |
|---|---|:---:|:---:|
| `tests/calculations.test.ts` | Regular/Overtime hours, tax, subtotal, totals, currency formatting, date validation | 12 | ✅ Passing |
| `tests/auth.test.ts` | Bcrypt hashing, password comparison, JWT token encoding/decoding, RBAC role matrix | 9 | ✅ Passing |
| `tests/invitation.test.ts` | Token entropy & uniqueness, expiration checking, role authorization boundaries | 4 | ✅ Passing |
| **Total** | | **25** | **✅ 100% Passing** |

---

## Running the Tests

To run the complete test suite:
```bash
npm test
```

To run in interactive watch mode during development:
```bash
npm run test:watch
```

To run a specific test suite:
```bash
npx vitest run tests/calculations.test.ts
```

---

## Adding New Tests

When adding new features or business logic:
1. Place unit test files in the `tests/` directory with the `.test.ts` extension.
2. Import functions and types using the `@/` alias (configured in `vitest.config.mjs`).
3. Assert both normal and boundary/edge conditions (e.g., zero values, negative numbers, special characters, unauthorized roles).
4. Run `npm test` before committing to version control.
