---
name: ther-inv-invoicing
description: Procedures and guidelines for creating, calculating, validating, printing, and managing weekly agency invoices and payroll records in the THER-INV system.
---

# THER-INV Invoicing & Payroll Management Skill

Use this skill when developing, testing, modifying, or operating the weekly invoice generation and payroll workflows within the THER-INV application.

## Core Concepts

1. **Weekly Payroll Cycle**: Invoices correspond to 7-day work cycles (e.g., Monday through Sunday).
2. **Staff Roster Link**: Line items reference agency staff (`Worker` model) to autofill roles and baseline hourly rates.
3. **Overtime Rules**:
   - Regular hours computed at regular rate (`hours * rate`).
   - Overtime hours computed at overtime rate (`otHours * otRate`), typically 1.5x of baseline rate.
   - Item amount is the sum of regular and overtime totals.
4. **Tax Calculation**: Optional percentage-based tax rate applied to subtotal (`subtotal * (taxRate / 100)`).
5. **Invoice Status Lifecycle**:
   - `draft`: Created but editable, awaiting final hours approval.
   - `pending`: Finalized and submitted for client payment.
   - `paid`: Payment collected and confirmed.
   - `cancelled`: Revoked or replaced invoice.

## Calculation Helper Reference

Always use the pure utility functions in `src/lib/calculations.ts`:

```typescript
import { calculateItemAmount, calculateInvoiceTotals, formatCurrency } from "@/lib/calculations";

// Calculate individual worker item:
const amount = calculateItemAmount({
  regularHours: 40,
  regularRate: 55,
  overtimeHours: 6,
  overtimeRate: 82.5,
});

// Calculate full invoice:
const totals = calculateInvoiceTotals(items, 0); // taxRate = 0%
console.log(totals.subtotal, totals.taxAmount, totals.totalAmount);
```

## Adding New Invoices via API

- **Endpoint**: `POST /api/invoices`
- **Authorization**: Requires `admin` or `manager` role (Therina / Roger).
- **Required Body Payload**:
  - `clientName` (string)
  - `periodStart` (ISO date string)
  - `periodEnd` (ISO date string)
  - `dueDate` (ISO date string)
  - `items` (array with `workerName`, `role`, `regularHours`, `regularRate`, `overtimeHours`, `overtimeRate`, `amount`)
  - `subtotal` (number)
  - `totalAmount` (number)

## Printable / PDF View

The invoice detail page at `/dashboard/invoices/[id]` is optimized for printing and PDF generation via modern CSS:
- `@media print` rules hide sidebars, navigation buttons, and unnecessary margins.
- Clean typography and borders ensure a crisp agency document suitable for healthcare clients.
