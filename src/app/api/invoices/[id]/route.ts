import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Invoice } from "@/models/Invoice";
import { verifyUserHasRole } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { user, errorResponse } = await verifyUserHasRole(req, [
      "admin",
      "manager",
      "viewer",
    ]);
    if (errorResponse) return errorResponse;

    await connectDB();
    const invoice = await Invoice.findById(id).populate("createdBy", "name email");

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    // Role-based visibility check: Viewer can only see submitted (pending) or paid invoices
    if (user.role === "viewer" && invoice.status === "draft") {
      return NextResponse.json(
        { error: "This draft invoice is being prepared by the manager and has not been submitted for review yet." },
        { status: 403 }
      );
    }

    return NextResponse.json({ invoice });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to fetch invoice" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { user, errorResponse } = await verifyUserHasRole(req, [
      "admin",
      "manager",
    ]);
    if (errorResponse) return errorResponse;

    const body = await req.json();
    await connectDB();

    // If items are provided, recalculate totals
    let updateData: any = { ...body };

    if (body.items && Array.isArray(body.items)) {
      const calculatedItems = body.items.map((item: any) => {
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
      const taxRateNum = Number(body.taxRate !== undefined ? body.taxRate : 0);
      const taxAmount = Math.round(((subtotal * taxRateNum) / 100) * 100) / 100;
      const totalAmount = Math.round((subtotal + taxAmount) * 100) / 100;

      updateData = {
        ...updateData,
        items: calculatedItems,
        subtotal,
        taxRate: taxRateNum,
        taxAmount,
        totalAmount,
      };
    }

    const updated = await Invoice.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).populate("createdBy", "name email");

    if (!updated) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, invoice: updated });
  } catch (error: any) {
    console.error("Invoice update error:", error);
    return NextResponse.json(
      { error: "Failed to update invoice" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { user, errorResponse } = await verifyUserHasRole(req, [
      "admin",
      "manager",
    ]);
    if (errorResponse) return errorResponse;

    await connectDB();
    const deleted = await Invoice.findByIdAndDelete(id);

    if (!deleted) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: "Invoice deleted successfully" });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to delete invoice" },
      { status: 500 }
    );
  }
}
