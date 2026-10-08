import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Lot } from "@/models/Lot";
import { Invoice } from "@/models/Invoice";
import { verifyUserHasRole } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await verifyUserHasRole(req, [
      "admin",
      "manager",
      "viewer",
      "agent",
    ]);
    if (errorResponse) return errorResponse;

    await connectDB();

    // Agents can see open lots and any lots (to view past cycles history)
    const query: any = {};
    const lots = await Lot.find(query).sort({ lotNumber: -1 });

    // Aggregate statistics per lot: invoice count and total amount
    const lotsWithStats = await Promise.all(
      lots.map(async (lot) => {
        // If user is viewer, only count submitted/pending or paid invoices
        const invQuery: any = { lotId: lot._id };
        if (user.role === "viewer") {
          invQuery.status = { $in: ["pending", "paid"] };
        }

        const invoices = await Invoice.find(invQuery).select("totalAmount status");
        const invoicesCount = invoices.length;
        const totalAmount = invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);

        return {
          ...lot.toObject(),
          invoicesCount,
          totalAmount: Math.round(totalAmount * 100) / 100,
        };
      })
    );

    return NextResponse.json({ lots: lotsWithStats });
  } catch (error: any) {
    console.error("Lots GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch lots" },
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
    const { periodStart, periodEnd, agencyName, name, notes } = body;

    if (!periodStart || !periodEnd) {
      return NextResponse.json(
        { error: "Week period start and end dates are required" },
        { status: 400 }
      );
    }

    await connectDB();

    // Auto-calculate next Lot number
    const highestLot = await Lot.findOne().sort({ lotNumber: -1 });
    const nextLotNumber = highestLot ? highestLot.lotNumber + 1 : 1;

    const lotThreeDigits = String(nextLotNumber).padStart(3, "0");
    const lotCode = `LOT ${lotThreeDigits}`;

    const newLot = await Lot.create({
      lotNumber: nextLotNumber,
      lotCode,
      name: name?.trim() || `LOT ${lotThreeDigits}`,
      agencyName: agencyName?.trim() || undefined,
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd),
      status: "open",
      notes: notes?.trim() || "",
      createdBy: user.userId,
    });

    return NextResponse.json({ success: true, lot: newLot }, { status: 201 });
  } catch (error: any) {
    console.error("Lot creation error:", error);
    return NextResponse.json(
      { error: "Failed to create lot" },
      { status: 500 }
    );
  }
}
