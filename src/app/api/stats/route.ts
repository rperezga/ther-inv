import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Invoice } from "@/models/Invoice";
import { Worker } from "@/models/Worker";
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

    const [
      totalInvoices,
      activeWorkersCount,
      totalWorkersCount,
      allInvoices,
      recentInvoices,
    ] = await Promise.all([
      Invoice.countDocuments(),
      Worker.countDocuments({ status: "active" }),
      Worker.countDocuments(),
      Invoice.find({}, "totalAmount status"),
      Invoice.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("createdBy", "name email"),
    ]);

    let totalBilled = 0;
    let totalPending = 0;
    let totalPaid = 0;

    allInvoices.forEach((inv) => {
      const amt = inv.totalAmount || 0;
      totalBilled += amt;
      if (inv.status === "paid") {
        totalPaid += amt;
      } else if (inv.status === "pending" || inv.status === "draft") {
        totalPending += amt;
      }
    });

    return NextResponse.json({
      stats: {
        totalBilled: Math.round(totalBilled * 100) / 100,
        totalPaid: Math.round(totalPaid * 100) / 100,
        totalPending: Math.round(totalPending * 100) / 100,
        totalInvoices,
        activeWorkersCount,
        totalWorkersCount,
      },
      recentInvoices,
    });
  } catch (error: any) {
    console.error("Stats GET error:", error);
    return NextResponse.json(
      { error: "Error al calcular estadísticas" },
      { status: 500 }
    );
  }
}
