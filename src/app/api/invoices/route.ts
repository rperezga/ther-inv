import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Invoice } from "@/models/Invoice";
import { Lot } from "@/models/Lot";
import { Worker } from "@/models/Worker";
import { verifyUserHasRole } from "@/lib/auth";
import { generateStructuredInvoiceNumber } from "@/lib/calculations";

export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await verifyUserHasRole(req, [
      "admin",
      "manager",
      "viewer",
    ]);
    if (errorResponse) return errorResponse;

    await connectDB();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const lotId = searchParams.get("lotId");

    const query: any = {};

    // Role-based visibility: Viewers can only view submitted ("pending") or "paid" invoices
    if (user.role === "viewer") {
      query.status = { $in: ["pending", "paid"] };
    } else if (status && status !== "all") {
      query.status = status;
    }

    if (lotId && lotId !== "all") {
      query.lotId = lotId;
    }

    if (search) {
      query.$or = [
        { invoiceNumber: { $regex: search, $options: "i" } },
        { clientName: { $regex: search, $options: "i" } },
        { "items.workerName": { $regex: search, $options: "i" } },
        { notes: { $regex: search, $options: "i" } },
      ];
    }

    const invoices = await Invoice.find(query)
      .populate("createdBy", "name email")
      .populate("lotId", "lotNumber lotCode name")
      .sort({ createdAt: -1 });

    return NextResponse.json({ invoices });
  } catch (error: any) {
    console.error("Invoices GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoices" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await verifyUserHasRole(req, [
      "admin",
      "manager",
    ]);
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const {
      invoiceNumber: customInvoiceNumber,
      lotId: inputLotId,
      workerId: inputWorkerId,
      agentName: inputAgentName,
      clientName,
      clientEmail,
      clientAddress,
      periodStart,
      periodEnd,
      invoiceDate,
      dueDate,
      items,
      taxRate = 0,
      status = "draft",
      notes,
    } = body;

    if (!clientName || !periodStart || !periodEnd || !dueDate) {
      return NextResponse.json(
        { error: "Client name, weekly payroll period, and due date are required" },
        { status: 400 }
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "At least one worker or service line item is required" },
        { status: 400 }
      );
    }

    await connectDB();

    // 1. Resolve or create Lot
    let assignedLot: any = null;
    if (inputLotId) {
      assignedLot = await Lot.findById(inputLotId);
    }

    if (!assignedLot) {
      // Find open lot matching periodStart/End or create a new one
      assignedLot = await Lot.findOne({
        status: "open",
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
      });

      if (!assignedLot) {
        const highestLot = await Lot.findOne().sort({ lotNumber: -1 });
        const nextLotNumber = highestLot ? highestLot.lotNumber + 1 : 1;
        const lotThreeDigits = String(nextLotNumber).padStart(3, "0");
        const lotCode = `LOT ${lotThreeDigits}`;

        assignedLot = await Lot.create({
          lotNumber: nextLotNumber,
          lotCode,
          name: `LOT ${lotThreeDigits}`,
          agencyName: clientName?.trim() || undefined,
          periodStart: new Date(periodStart),
          periodEnd: new Date(periodEnd),
          status: "open",
          createdBy: user.userId,
        });
      }
    }

    // 2. Resolve Agent Details for nomenclature
    let agentFirstName = "";
    let agentLastName = "";

    const firstItem = items[0];
    const workerTargetId = inputWorkerId || firstItem?.workerId;

    if (workerTargetId) {
      const workerDoc = await Worker.findById(workerTargetId);
      if (workerDoc) {
        agentFirstName = workerDoc.firstName;
        agentLastName = workerDoc.lastName;
      }
    }

    if (!agentFirstName && (inputAgentName || firstItem?.workerName)) {
      const parts = (inputAgentName || firstItem?.workerName || "Agent Staff").trim().split(/\s+/);
      agentFirstName = parts[0];
      agentLastName = parts.slice(1).join(" ");
    }

    // 3. Generate Structured Invoice Number if not provided
    let invoiceNumber = customInvoiceNumber?.trim();
    if (!invoiceNumber) {
      const year = new Date(periodStart).getFullYear() || new Date().getFullYear();
      const countInLot = await Invoice.countDocuments({ lotId: assignedLot._id });
      const seqNumber = countInLot + 1;

      invoiceNumber = generateStructuredInvoiceNumber({
        agentName: agentFirstName,
        agentLastName: agentLastName,
        year,
        lotNumber: assignedLot.lotNumber,
        sequenceNumber: seqNumber,
      });

      // Ensure uniqueness
      let collision = await Invoice.findOne({ invoiceNumber });
      let counterOffset = seqNumber;
      while (collision) {
        counterOffset++;
        invoiceNumber = generateStructuredInvoiceNumber({
          agentName: agentFirstName,
          agentLastName: agentLastName,
          year,
          lotNumber: assignedLot.lotNumber,
          sequenceNumber: counterOffset,
        });
        collision = await Invoice.findOne({ invoiceNumber });
      }
    }

    // Process and calculate items
    const calculatedItems = items.map((item: any) => {
      const regH = Number(item.regularHours) || 0;
      const regR = Number(item.regularRate) || 0;
      const otH = Number(item.overtimeHours) || 0;
      const otR = Number(item.overtimeRate) || 0;
      const amount = regH * regR + otH * otR;

      return {
        workerId: item.workerId || undefined,
        workerName: item.workerName || "Worker",
        role: item.role || "Services",
        patientName: item.patientName || "",
        visitDate: item.visitDate || "",
        serviceType: item.serviceType || "",
        regularHours: regH,
        regularRate: regR,
        overtimeHours: otH,
        overtimeRate: otR,
        description: item.description || "",
        amount: Math.round(amount * 100) / 100,
      };
    });

    const subtotal = calculatedItems.reduce(
      (sum: number, it: any) => sum + it.amount,
      0
    );
    const taxRateNum = Number(taxRate) || 0;
    const taxAmount = Math.round(((subtotal * taxRateNum) / 100) * 100) / 100;
    const totalAmount = Math.round((subtotal + taxAmount) * 100) / 100;

    const newInvoice = await Invoice.create({
      invoiceNumber,
      lotId: assignedLot._id,
      lotNumber: assignedLot.lotNumber,
      clientName: clientName.trim(),
      clientEmail: clientEmail?.trim() || "",
      clientAddress: clientAddress?.trim() || "",
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd),
      invoiceDate: invoiceDate ? new Date(invoiceDate) : new Date(),
      dueDate: new Date(dueDate),
      items: calculatedItems,
      subtotal,
      taxRate: taxRateNum,
      taxAmount,
      totalAmount,
      status,
      notes: notes?.trim() || "",
      createdBy: user.userId,
    });

    return NextResponse.json({ success: true, invoice: newInvoice }, { status: 201 });
  } catch (error: any) {
    console.error("Invoice POST error:", error);
    if (error.code === 11000) {
      return NextResponse.json(
        { error: "An invoice with this number already exists" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create weekly invoice" },
      { status: 500 }
    );
  }
}
