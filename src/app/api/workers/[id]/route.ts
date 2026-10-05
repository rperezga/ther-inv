import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Worker } from "@/models/Worker";
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
        { error: "Trabajador no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ worker });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Error al buscar trabajador" },
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
      },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return NextResponse.json(
        { error: "Trabajador no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, worker: updated });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Error al actualizar trabajador" },
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
    const { user, errorResponse } = await verifyUserHasRole(req, ["admin"]);
    if (errorResponse) return errorResponse;

    await connectDB();
    const deleted = await Worker.findByIdAndDelete(id);

    if (!deleted) {
      return NextResponse.json(
        { error: "Trabajador no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: "Trabajador eliminado" });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Error al eliminar trabajador" },
      { status: 500 }
    );
  }
}
