# 📋 THER-INV | Agency Invoicing & Weekly Payroll System

A modern, secure, private, and fully responsive web application designed for weekly invoice generation and agency payroll workflows. Features staff roster management, role-based authorization (Admin, Principal Manager Therina, and Viewers), secure invitation links, and native automated deployment on a Kali Linux server powered by Hermes.

---

## ✨ Key Features

- **Weekly Invoicing & Payroll Cycles**:
  - Swift invoice creation tailored to weekly payroll schedules.
  - Quick worker selection from the agency roster with auto-filled hourly rates and positions.
  - Real-time calculations for regular hours, overtime hours, differential rates, subtotal, tax rate, and total amounts.
  - Clean, agency-grade printable invoice view and PDF export (`@media print`).
  - Invoice status tracking: `Draft`, `Pending Approval`, `Paid`, `Cancelled`.

- **Agency Workers Roster**:
  - Comprehensive staff directory covering healthcare professionals and support workers (RN, PT, CNA, OT, LPN, SLP).
  - Configurable default hourly rates, positions, phone numbers, email addresses, and operational notes.
  - Quick status filtering (`Active` / `Inactive`).

- **Role-Based Access Control (RBAC)**:
  - **Administrator (Roger)**: Full platform governance, user management, and configuration.
  - **Principal Manager (Therina)**: Issues and edits weekly invoices, manages agency workers, and sends secure invitation links.
  - **Viewer**: Read-only access to invoices and reports.

- **Token-Based Secure Invitations**:
  - Issue unique registration tokens with role pre-assignment and expiration limits.
  - One-click copy invitation links with real-time revocation capabilities.

- **Premium Light-Mode UI & Responsive Design**:
  - High-contrast, clean corporate aesthetic with curated typography (Plus Jakarta Sans & Inter).
  - Micro-animations, responsive cards, data tables, and modal dialogs.
  - Fully responsive across desktop, tablet, and mobile devices.

---

## 🛠️ Technology Stack

- **Framework**: Next.js 15 (App Router, Server API Routes).
- **Database**: MongoDB + Mongoose with connection pooling.
- **Styling**: Vanilla CSS with comprehensive design tokens, modular layouts, and print stylesheets.
- **Authentication**: JWT (JSON Web Tokens) with secure HTTP-only cookies and bcrypt password hashing.
- **Process Management**: Native Node.js with PM2 / systemd support (no Docker required).
- **CI/CD & Deployment**: Native Bash deploy script (`deploy.sh`) and continuous webhook integration for Hermes.

---

## 🚀 Local Development Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment variables**:
   Create a `.env.local` file (or copy from `.env.example`):
   ```env
   MONGODB_URI=mongodb://localhost:27017/ther_inv
   JWT_SECRET=super_secret_jwt_ther_inv_key_change_in_production_2026
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

3. **Start the local development server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔑 Initial Pre-Configured Credentials

| User | Role | Email | Password |
|---|---|---|---|
| **Therina** (Principal Manager) | Manager | `therina@agency.com` | `therina123456` |
| **Roger** (Administrator) | Admin | `roger@admin.com` | `admin123456` |

*(Note: The login page includes 1-click quick credentials buttons for instant evaluation).*

---

---

## 🧪 Automated Testing

THER-INV includes a comprehensive automated test suite powered by **Vitest** (25 unit and integration tests):

```bash
# Run all automated tests
npm test

# Run tests in watch mode
npm run test:watch
```

Test coverage includes:
- **`tests/calculations.test.ts`**: Regular and overtime hour calculations, subtotal, tax calculations, and date range validations.
- **`tests/auth.test.ts`**: Bcrypt password hashing, JWT encoding/decoding, and RBAC permission checks.
- **`tests/invitation.test.ts`**: Crypto token uniqueness, expiration boundary checks, and role restrictions.

---

## 📚 Technical Documentation & Guides

Detailed technical specifications and user guides are available in the [`docs/`](file:///c:/Users/roger/Desktop/THER-INV/docs) directory:

- [System Architecture](file:///c:/Users/roger/Desktop/THER-INV/docs/ARCHITECTURE.md): Next.js App Router, database models, session cookies, and security invariants.
- [Invoice & Payroll Guide](file:///c:/Users/roger/Desktop/THER-INV/docs/INVOICE_AND_PAYROLL_GUIDE.md): Weekly payroll workflows, overtime formulas, line items, and print/PDF generation.
- [Authentication & Roles](file:///c:/Users/roger/Desktop/THER-INV/docs/AUTHENTICATION_AND_ROLES.md): RBAC matrix, admin vs manager capabilities, and token invitation flow.
- [Testing Strategy](file:///c:/Users/roger/Desktop/THER-INV/docs/TESTING_STRATEGY.md): Vitest setup, assertion conventions, and test catalog.

---

## ⚡ Workspace Skills (`.agents/skills`)

Custom agent skills for this repository:
- [ther-inv-invoicing](file:///c:/Users/roger/Desktop/THER-INV/.agents/skills/ther-inv-invoicing/SKILL.md): Invoicing and payroll management workflows.
- [ther-inv-testing](file:///c:/Users/roger/Desktop/THER-INV/.agents/skills/ther-inv-testing/SKILL.md): Test authoring and execution procedures.
- [ther-inv-deployment](file:///c:/Users/roger/Desktop/THER-INV/.agents/skills/ther-inv-deployment/SKILL.md): Native Kali Linux deployment with Hermes.

---

## 📦 Production Deployment on Kali Linux (with Hermes)

This project is built for **native hosting** (without Docker) to integrate seamlessly with the server's existing services:

1. Refer to [HERMES_PROMPT.md](file:///c:/Users/roger/Desktop/THER-INV/HERMES_PROMPT.md) for the complete prompt ready to be pasted into Hermes on your Kali Linux server.
2. Hermes will:
   - Inspect the server to see how other applications are deployed (PM2 vs systemd, Nginx reverse proxy, Node versions).
   - Clone the repository and configure the local MongoDB connection (`mongodb://127.0.0.1:27017/ther_inv`).
   - Build and start the service matching existing server conventions (`ecosystem.config.cjs` for PM2 or `ther-inv.service.example` for systemd).
   - Hook [deploy.sh](file:///c:/Users/roger/Desktop/THER-INV/deploy.sh) into a GitHub commit listener/webhook for automated continuous delivery on every push.
