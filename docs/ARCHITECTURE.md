# 🏛️ THER-INV System Architecture

## Overview

**THER-INV** is an enterprise-grade weekly invoicing and healthcare agency payroll management web application. It combines a Next.js 15 App Router frontend with server-side API endpoints, a local MongoDB database with Mongoose connection pooling, and JWT cookie-based role authentication.

---

## Technical Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend UI** | Next.js 15 (React 19) + Vanilla CSS | Clean, responsive light-mode user experience with zero external CSS frameworks |
| **Icons** | Lucide React | Modern, lightweight iconography |
| **Backend & API** | Next.js App Router API Handlers | RESTful JSON endpoints with role validation |
| **Database** | MongoDB + Mongoose | Document storage for users, agency workers, invoices, and invitations |
| **Authentication** | JWT (jsonwebtoken) + bcryptjs | Stateless, cryptographically signed HTTP-only cookies |
| **Testing** | Vitest | Fast unit and integration testing engine |
| **Process Manager** | PM2 or systemd | Native Linux process lifecycle without Docker |

---

## Directory Structure

```text
THER-INV/
├── .agents/
│   └── skills/
│       ├── ther-inv-invoicing/SKILL.md
│       ├── ther-inv-testing/SKILL.md
│       └── ther-inv-deployment/SKILL.md
├── docs/
│   ├── ARCHITECTURE.md
│   ├── INVOICE_AND_PAYROLL_GUIDE.md
│   ├── AUTHENTICATION_AND_ROLES.md
│   └── TESTING_STRATEGY.md
├── tests/
│   ├── calculations.test.ts
│   ├── auth.test.ts
│   └── invitation.test.ts
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   ├── dashboard/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   ├── invoices/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── new/page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   ├── workers/page.tsx
│   │   │   └── invitations/page.tsx
│   │   └── api/
│   │       ├── auth/
│   │       │   ├── login/route.ts
│   │       │   ├── logout/route.ts
│   │       │   ├── me/route.ts
│   │       │   └── register/route.ts
│   │       ├── invoices/
│   │       │   ├── route.ts
│   │       │   └── [id]/route.ts
│   │       ├── workers/
│   │       │   ├── route.ts
│   │       │   └── [id]/route.ts
│   │       ├── invitations/
│   │       │   ├── route.ts
│   │       │   └── validate/route.ts
│   │       ├── stats/route.ts
│   │       └── seed/route.ts
│   ├── lib/
│   │   ├── auth.ts
│   │   ├── calculations.ts
│   │   ├── db.ts
│   │   └── types.ts
│   └── models/
│       ├── User.ts
│       ├── Worker.ts
│       ├── Invoice.ts
│       └── Invitation.ts
├── deploy.sh
├── ecosystem.config.cjs
├── ther-inv.service.example
├── HERMES_PROMPT.md
├── README.md
├── vitest.config.mjs
└── package.json
```

---

## Data Models

1. **User (`src/models/User.ts`)**:
   - Stores account credentials (`email`, hashed `password`), `name`, and assigned `role` (`admin`, `manager`, `viewer`).
2. **Worker (`src/models/Worker.ts`)**:
   - Represents agency personnel (e.g., RN, PT, CNA) with `defaultRate`, `role`, contact info, and active status.
3. **Invoice (`src/models/Invoice.ts`)**:
   - Stores weekly payroll invoice headers (invoice number, client, weekly period dates, due date), line items with regular/overtime hours and rates, subtotal, tax, and final amount.
4. **Invitation (`src/models/Invitation.ts`)**:
   - Tracks unique registration invite tokens, assigned role (`manager` or `viewer`), expiration timestamp, and invitation state (`pending`, `accepted`, `expired`).

---

## Security Invariants

- Passwords hashed with bcrypt (salt rounds: 10).
- Session tokens stored in `httpOnly`, `sameSite: "lax"` cookies.
- Critical endpoints require `admin` or `manager` roles verified server-side.
- Zero plaintext credential storage.
