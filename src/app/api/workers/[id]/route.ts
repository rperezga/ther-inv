import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Worker } from "@/models/Worker";
import { User } from "@/models/User";
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
    const worker = await Worker.findById(id);
    if (!worker) {
      return NextResponse.json(
        { error: "Worker not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ worker });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to fetch worker" },
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

    const updated = await Worker.findByIdAndUpdate(
      id,
      {
        firstName: body.firstName?.trim(),
        lastName: body.lastName?.trim(),
        role: body.role?.trim(),
        hourlyRate: body.hourlyRate !== undefined ? Number(body.hourlyRate) : undefined,
        phone: body.phone?.trim(),
        email: body.email?.trim(),
        ssnLast4: body.ssnLast4?.trim(),
        status: body.status,
        notes: body.notes?.trim(),
        ...(body.agencyAssignments !== undefined && { agencyAssignments: body.agencyAssignments }),
      },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return NextResponse.json(
        { error: "Worker not found" },
        { status: 404 }
      );
    }

    // If role changed and worker has an email, sync agentType with linked User account
    if (body.role && updated.email) {
      try {
        const lower = body.role.toLowerCase();
        const newAgentType: "PT" | "PTA" = (lower.includes("pta") || lower.includes("assistant")) ? "PTA" : "PT";
        await User.updateMany(
          { email: updated.email.toLowerCase().trim() },
          { $set: { agentType: newAgentType } }
        );
      } catch (syncErr) {
        console.error("Failed to sync User agentType on Worker role update:", syncErr);
      }
    }

    return NextResponse.json({ success: true, worker: updated });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to update worker" },
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
    const deleted = await Worker.findByIdAndDelete(id);

    if (!deleted) {
      return NextResponse.json(
        { error: "Worker not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: "Worker deleted successfully" });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to delete worker" },
      { status: 500 }
    );
  }
}
