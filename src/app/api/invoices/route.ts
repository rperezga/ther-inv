import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Invoice } from "@/models/Invoice";
import { verifyUserHasRole } from "@/lib/auth";

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

    const query: any = {};
    if (status && status !== "all") {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { invoiceNumber: { $regex: search, $options: "i" } },
        { clientName: { $regex: search, $options: "i" } },
      ];
    }

    const invoices = await Invoice.find(query)
      .populate("createdBy", "name email")
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

    // Generate Invoice Number if not provided
    let invoiceNumber = customInvoiceNumber?.trim();
    if (!invoiceNumber) {
      const year = new Date().getFullYear();
      const count = await Invoice.countDocuments();
      invoiceNumber = `INV-${year}-${String(count + 1).padStart(4, "0")}`;
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
