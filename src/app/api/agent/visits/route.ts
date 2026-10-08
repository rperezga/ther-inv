import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { AgentVisit } from "@/models/AgentVisit";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const auth = await getUserFromRequest(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    // If role is agent, show only their visits. Admin & manager can view all.
    const query: any = {};
    if (auth.role === "agent") {
      query.agentId = auth.userId;
    }

    const visits = await AgentVisit.find(query).sort({ createdAt: -1 }).limit(100);

    return NextResponse.json({ success: true, visits });
  } catch (error: any) {
    console.error("GET /api/agent/visits error:", error);
    return NextResponse.json(
      { error: "Failed to fetch visits" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getUserFromRequest(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { patientName, visitDates, serviceType = "Physical Therapy Visit", notes } = body;

    if (!patientName || !patientName.trim()) {
      return NextResponse.json(
        { error: "El nombre del paciente es obligatorio" },
        { status: 400 }
      );
    }

    if (!Array.isArray(visitDates) || visitDates.length === 0) {
      return NextResponse.json(
        { error: "Debes seleccionar al menos 1 día de visita en el calendario" },
        { status: 400 }
      );
    }

    // Sort dates chronologically
    const sortedDates = [...visitDates].sort();

    await connectDB();

    const newVisit = await AgentVisit.create({
      agentId: auth.userId,
      agentName: auth.name,
      agentEmail: auth.email,
      patientName: patientName.trim(),
      serviceType: serviceType.trim(),
      visitDates: sortedDates,
      notes: notes?.trim() || "",
      status: "pending",
    });

    return NextResponse.json(
      { success: true, visit: newVisit },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("POST /api/agent/visits error:", error);
    return NextResponse.json(
      { error: "Failed to create visit record" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await getUserFromRequest(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Visit ID is required" }, { status: 400 });
    }

    await connectDB();

    const visit = await AgentVisit.findById(id);
    if (!visit) {
      return NextResponse.json({ error: "Visit not found" }, { status: 404 });
    }

    // Agents can only delete their own pending visits
    if (auth.role === "agent" && visit.agentId.toString() !== auth.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (visit.status === "invoiced") {
      return NextResponse.json(
        { error: "No se puede eliminar una visita que ya ha sido facturada" },
        { status: 400 }
      );
    }

    await AgentVisit.findByIdAndDelete(id);

    return NextResponse.json({ success: true, message: "Visita eliminada" });
  } catch (error: any) {
    console.error("DELETE /api/agent/visits error:", error);
    return NextResponse.json(
      { error: "Failed to delete visit" },
      { status: 500 }
    );
  }
}
