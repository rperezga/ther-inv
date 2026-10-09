import mongoose from "mongoose";
import { Lot } from "@/models/Lot";
import { Invoice, IInvoiceItemDoc } from "@/models/Invoice";
import { Worker, IWorkerDocument } from "@/models/Worker";
import { AgentVisit } from "@/models/AgentVisit";
import { User } from "@/models/User";
import { generateStructuredInvoiceNumber } from "@/lib/calculations";

/**
 * Resolves the service rate configured for a worker for a specific agency.
 */
function resolveWorkerRate(worker: IWorkerDocument | null, agencyName: string, serviceType: string): number {
  if (!worker || !worker.agencyAssignments || !Array.isArray(worker.agencyAssignments)) {
    return 0;
  }
  const assignment = worker.agencyAssignments.find(
    (a) => a.agencyName?.trim().toLowerCase() === agencyName?.trim().toLowerCase()
  );
  if (!assignment || !assignment.services || !Array.isArray(assignment.services)) {
    return 0;
  }
  const srv = assignment.services.find(
    (s) => s.serviceType?.trim().toLowerCase() === serviceType?.trim().toLowerCase()
  );
  return srv ? Math.round(Number(srv.rate) || 0) : 0;
}

/**
 * Formats YYYY-MM-DD or any date string to standard MM/DD/YY for invoice items.
 */
function formatVisitDate(dateStr: string): string {
  if (!dateStr) return "";
  const parts = dateStr.trim().split("-");
  if (parts.length === 3) {
    const [y, m, d] = parts;
    return `${m}/${d}/${y.slice(-2)}`;
  }
  return dateStr.trim();
}

/**
 * Automatically synchronizes an agent's logged visits for a specific billing period (Lot)
 * into a live draft Invoice document.
 * 
 * If visits exist:
 *  - Upserts or updates a draft Invoice with the visit line items and configured rates.
 *  - Links invoiceId and invoiceNumber into lot.agentStatuses.
 * 
 * If all visits are deleted:
 *  - If a draft Invoice exists, removes it (or clears items) and unlinks it from lot.agentStatuses.
 */
export async function syncAgentInvoiceForLot(params: {
  agentId: string | mongoose.Types.ObjectId;
  lotId: string | mongoose.Types.ObjectId;
  createdById?: string | mongoose.Types.ObjectId;
}): Promise<{ invoice: any | null; action: "created" | "updated" | "deleted" | "none" }> {
  try {
    const { agentId, lotId, createdById } = params;
    if (!agentId || !lotId) {
      return { invoice: null, action: "none" };
    }

    const lot = await Lot.findById(lotId);
    if (!lot) {
      return { invoice: null, action: "none" };
    }

    // Find agent user
    const userDoc = await User.findById(agentId);

    // Find all visits by this agent for this lot
    const visits = await AgentVisit.find({
      agentId,
      lotId,
    }).sort({ createdAt: 1 });

    // Look for matching Worker document by email or name
    let workerDoc: IWorkerDocument | null = null;
    if (userDoc?.email) {
      workerDoc = await Worker.findOne({
        email: { $regex: new RegExp(`^${userDoc.email.trim()}$`, "i") },
      });
    }

    if (!workerDoc && userDoc?.name) {
      const nameParts = userDoc.name.trim().split(/\s+/);
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(" ");
      if (lastName) {
        workerDoc = await Worker.findOne({
          firstName: { $regex: new RegExp(`^${firstName}$`, "i") },
          lastName: { $regex: new RegExp(`^${lastName}$`, "i") },
        });
      }
    }

    // Also fallback: check visits' agentEmail
    if (!workerDoc && visits.length > 0 && visits[0].agentEmail) {
      workerDoc = await Worker.findOne({
        email: { $regex: new RegExp(`^${visits[0].agentEmail.trim()}$`, "i") },
      });
    }

    const agencyName = lot.agencyName || "Client Agency";
    const agentFullName = workerDoc
      ? `${workerDoc.firstName} ${workerDoc.lastName}`.trim()
      : userDoc?.name || visits[0]?.agentName || "Agent Staff";
    const agentRole = workerDoc?.role || userDoc?.agentType || "Physical Therapist";

    // Locate existing invoice for this lot and agent
    let existingInvoice = await Invoice.findOne({
      lotId: lot._id,
      $or: [
        { "items.workerId": workerDoc?._id },
        { "items.workerName": agentFullName },
      ],
    });

    // If no visits remain
    if (visits.length === 0) {
      if (existingInvoice && existingInvoice.status === "draft") {
        await Invoice.findByIdAndDelete(existingInvoice._id);
        // Unlink from lot.agentStatuses
        if (Array.isArray(lot.agentStatuses)) {
          const idx = lot.agentStatuses.findIndex(
            (as) => as.agentId.toString() === agentId.toString()
          );
          if (idx >= 0) {
            lot.agentStatuses[idx].invoiceId = undefined;
            lot.agentStatuses[idx].invoiceNumber = undefined;
            await lot.save();
          }
        }
        return { invoice: null, action: "deleted" };
      }
      return { invoice: null, action: "none" };
    }

    // Build line items from visits
    const items: IInvoiceItemDoc[] = [];
    visits.forEach((v) => {
      const dates = Array.isArray(v.visitDates) ? v.visitDates : [];
      const serviceType = v.serviceType || "Visit";
      const rate = resolveWorkerRate(workerDoc, agencyName, serviceType);

      dates.forEach((dStr: string) => {
        items.push({
          workerId: workerDoc?._id as any,
          workerName: agentFullName,
          role: agentRole,
          patientName: v.patientName?.trim() || "",
          visitDate: formatVisitDate(dStr),
          serviceType,
          regularHours: 1,
          regularRate: rate,
          overtimeHours: 0,
          overtimeRate: 0,
          description: `${serviceType} - Patient: ${v.patientName?.trim() || ""}`,
          amount: rate,
        });
      });
    });

    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
    const taxRate = existingInvoice?.taxRate || 0;
    const taxAmount = Math.round(((subtotal * taxRate) / 100) * 100) / 100;
    const totalAmount = Math.round((subtotal + taxAmount) * 100) / 100;

    // Default due date: 14 days after period end
    const dueDate = existingInvoice?.dueDate || new Date(new Date(lot.periodEnd).getTime() + 14 * 24 * 60 * 60 * 1000);

    // If an invoice already exists (and is draft), update items and amounts
    if (existingInvoice) {
      if (existingInvoice.status === "draft") {
        existingInvoice.items = items as any;
        existingInvoice.subtotal = subtotal;
        existingInvoice.taxRate = taxRate;
        existingInvoice.taxAmount = taxAmount;
        existingInvoice.totalAmount = totalAmount;
        existingInvoice.clientName = agencyName;
        existingInvoice.periodStart = lot.periodStart;
        existingInvoice.periodEnd = lot.periodEnd;
        existingInvoice.notes = `Draft invoice for ${agencyName} • Therapist: ${agentFullName} (${agentRole}) • Total visits: ${items.length}`;
        await existingInvoice.save();

        // Ensure lot.agentStatuses is synced
        if (Array.isArray(lot.agentStatuses)) {
          const idx = lot.agentStatuses.findIndex(
            (as) => as.agentId.toString() === agentId.toString()
          );
          if (idx >= 0) {
            lot.agentStatuses[idx].invoiceId = existingInvoice._id;
            lot.agentStatuses[idx].invoiceNumber = existingInvoice.invoiceNumber;
            await lot.save();
          }
        }

        return { invoice: existingInvoice, action: "updated" };
      }
      return { invoice: existingInvoice, action: "none" };
    }

    // Otherwise, generate structured invoice number and create a new draft Invoice
    const year = new Date(lot.periodStart).getFullYear() || new Date().getFullYear();
    const countInLot = await Invoice.countDocuments({ lotId: lot._id });
    const seqNumber = countInLot + 1;

    const nameParts = agentFullName.split(/\s+/);
    const firstName = nameParts[0] || "Agent";
    const lastName = nameParts.slice(1).join(" ") || "";

    let invoiceNumber = generateStructuredInvoiceNumber({
      agentName: firstName,
      agentLastName: lastName,
      year,
      lotNumber: lot.lotNumber,
      sequenceNumber: seqNumber,
    });

    // Ensure uniqueness
    let collision = await Invoice.findOne({ invoiceNumber });
    let counterOffset = seqNumber;
    while (collision) {
      counterOffset++;
      invoiceNumber = generateStructuredInvoiceNumber({
        agentName: firstName,
        agentLastName: lastName,
        year,
        lotNumber: lot.lotNumber,
        sequenceNumber: counterOffset,
      });
      collision = await Invoice.findOne({ invoiceNumber });
    }

    const resolvedCreatorId =
      createdById ||
      userDoc?._id ||
      lot.createdBy ||
      new mongoose.Types.ObjectId("000000000000000000000000");

    const newInvoice = await Invoice.create({
      invoiceNumber,
      lotId: lot._id,
      lotNumber: lot.lotNumber,
      clientName: agencyName,
      clientEmail: "",
      clientAddress: "",
      periodStart: lot.periodStart,
      periodEnd: lot.periodEnd,
      invoiceDate: new Date(),
      dueDate,
      items,
      subtotal,
      taxRate: 0,
      taxAmount: 0,
      totalAmount,
      status: "draft",
      notes: `Draft invoice for ${agencyName} • Therapist: ${agentFullName} (${agentRole}) • Total visits: ${items.length}`,
      createdBy: resolvedCreatorId,
    });

    // Link into lot.agentStatuses
    if (!Array.isArray(lot.agentStatuses)) {
      lot.agentStatuses = [];
    }
    const existingAgentStatus = lot.agentStatuses.find(
      (as) => as.agentId.toString() === agentId.toString()
    );

    if (existingAgentStatus) {
      existingAgentStatus.invoiceId = newInvoice._id;
      existingAgentStatus.invoiceNumber = newInvoice.invoiceNumber;
    } else {
      lot.agentStatuses.push({
        agentId: agentId as any,
        agentName: agentFullName,
        agentEmail: (userDoc?.email || visits[0]?.agentEmail || "").toLowerCase(),
        status: "in_progress",
        invoiceId: newInvoice._id,
        invoiceNumber: newInvoice.invoiceNumber,
      });
    }
    await lot.save();

    return { invoice: newInvoice, action: "created" };
  } catch (error) {
    console.error("syncAgentInvoiceForLot error:", error);
    return { invoice: null, action: "none" };
  }
}
