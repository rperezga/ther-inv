import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { AgentVisit } from "@/models/AgentVisit";
import { Lot } from "@/models/Lot";
import { getUserFromRequest } from "@/lib/auth";
import { syncAgentInvoiceForLot } from "@/lib/invoiceSync";

export async function GET(req: NextRequest) {
  try {
    const auth = await getUserFromRequest(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const lotId = searchParams.get("lotId");
    const agentId = searchParams.get("agentId");

    await connectDB();

    const query: any = {};
    if (auth.role === "agent") {
      query.agentId = auth.userId;
    } else if (agentId) {
      query.agentId = agentId;
    }

    if (lotId && lotId !== "all") {
      query.lotId = lotId;
    }

    const visits = await AgentVisit.find(query).sort({ createdAt: -1 }).limit(200);

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
    const { patientName, visitDates, serviceType = "Physical Therapy Visit", notes, lotId } = body;

    if (!patientName || !patientName.trim()) {
      return NextResponse.json(
        { error: "Patient name is required" },
        { status: 400 }
      );
    }

    if (!Array.isArray(visitDates) || visitDates.length === 0) {
      return NextResponse.json(
        { error: "Please select at least 1 visit date in the calendar" },
        { status: 400 }
      );
    }

    await connectDB();

    let targetLot = null;
    if (lotId) {
      targetLot = await Lot.findById(lotId);
      if (!targetLot) {
        return NextResponse.json({ error: "Selected billing period was not found" }, { status: 404 });
      }

      if (targetLot.status === "closed") {
        return NextResponse.json(
          { error: "This billing period has been closed. No further changes can be submitted." },
          { status: 403 }
        );
      }

      // Check if this agent is already marked completed in this lot
      if (auth.role === "agent" && targetLot.agentStatuses) {
        const agentStatusObj = targetLot.agentStatuses.find(
          (as: any) => as.agentId.toString() === auth.userId
        );
        if (agentStatusObj && agentStatusObj.status === "completed") {
          return NextResponse.json(
            { error: "Your submissions for this billing period have been finalized and locked by the manager. Contact your manager if changes are needed." },
            { status: 403 }
          );
        }
      }
    }

    // Sort dates chronologically
    const sortedDates = [...visitDates].sort();

    const newVisit = await AgentVisit.create({
      agentId: auth.userId,
      agentName: auth.name,
      agentEmail: auth.email,
      lotId: targetLot ? targetLot._id : undefined,
      lotCode: targetLot ? targetLot.lotCode : undefined,
      patientName: patientName.trim(),
      serviceType: serviceType.trim(),
      visitDates: sortedDates,
      notes: notes?.trim() || "",
      status: "pending",
    });

    // Auto-update lot agentStatuses to "in_progress" or maintain submitted
    if (targetLot) {
      if (!Array.isArray(targetLot.agentStatuses)) {
        targetLot.agentStatuses = [];
      }
      const existing = targetLot.agentStatuses.find(
        (as: any) => as.agentId.toString() === auth.userId
      );
      if (!existing) {
        targetLot.agentStatuses.push({
          agentId: auth.userId as any,
          agentName: auth.name,
          agentEmail: auth.email.toLowerCase(),
          status: "in_progress",
        });
        await targetLot.save();
      }

      // Automatically sync and generate/update draft invoice in real-time
      await syncAgentInvoiceForLot({
        agentId: auth.userId,
        lotId: targetLot._id,
        createdById: auth.userId,
      });
    }

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

export async function PUT(req: NextRequest) {
  try {
    const auth = await getUserFromRequest(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, patientName, visitDates, serviceType, notes } = body;

    if (!id) {
      return NextResponse.json({ error: "Visit ID is required" }, { status: 400 });
    }

    if (!patientName || !patientName.trim()) {
      return NextResponse.json({ error: "Patient name is required" }, { status: 400 });
    }

    if (!Array.isArray(visitDates) || visitDates.length === 0) {
      return NextResponse.json({ error: "Please select at least 1 visit date" }, { status: 400 });
    }

    await connectDB();

    const visit = await AgentVisit.findById(id);
    if (!visit) {
      return NextResponse.json({ error: "Visit not found" }, { status: 404 });
    }

    // Agents can only edit their own visits
    if (auth.role === "agent" && visit.agentId.toString() !== auth.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (visit.status === "invoiced") {
      return NextResponse.json({ error: "Cannot edit a visit that has already been invoiced" }, { status: 400 });
    }

    // Check if lot is closed or agent completed
    if (visit.lotId) {
      const lot = await Lot.findById(visit.lotId);
      if (lot) {
        if (lot.status === "closed") {
          return NextResponse.json({ error: "Cannot edit visits in a closed billing cycle" }, { status: 403 });
        }
        if (auth.role === "agent" && lot.agentStatuses) {
          const agentStatus = lot.agentStatuses.find(
            (as: any) => as.agentId.toString() === auth.userId
          );
          if (agentStatus && agentStatus.status === "completed") {
            return NextResponse.json(
              { error: "Cannot edit visits after the manager has finalized your submission for this cycle" },
              { status: 403 }
            );
          }
        }
      }
    }

    const sortedDates = [...visitDates].sort();

    visit.patientName = patientName.trim();
    visit.visitDates = sortedDates;
    if (serviceType) visit.serviceType = serviceType.trim();
    if (notes !== undefined) visit.notes = notes.trim();

    await visit.save();

    // Automatically sync updated draft invoice
    if (visit.lotId) {
      await syncAgentInvoiceForLot({
        agentId: visit.agentId,
        lotId: visit.lotId,
        createdById: auth.userId,
      });
    }

    return NextResponse.json({ success: true, visit });
  } catch (error: any) {
    console.error("PUT /api/agent/visits error:", error);
    return NextResponse.json({ error: "Failed to update visit record" }, { status: 500 });
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
        { error: "Cannot delete a visit record that has already been invoiced" },
        { status: 400 }
      );
    }

    // Check if lot is closed or completed for this agent
    if (visit.lotId) {
      const lot = await Lot.findById(visit.lotId);
      if (lot) {
        if (lot.status === "closed") {
          return NextResponse.json(
            { error: "Cannot delete visits in a closed billing period" },
            { status: 403 }
          );
        }
        if (auth.role === "agent" && lot.agentStatuses) {
          const agentStatus = lot.agentStatuses.find(
            (as: any) => as.agentId.toString() === auth.userId
          );
          if (agentStatus && agentStatus.status === "completed") {
            return NextResponse.json(
              { error: "Cannot delete visits after the manager has finalized your submission for this period" },
              { status: 403 }
            );
          }
        }
      }
    }

    const deletedLotId = visit.lotId;
    const deletedAgentId = visit.agentId;

    await AgentVisit.findByIdAndDelete(id);

    // Automatically sync draft invoice (update lines or delete if empty)
    if (deletedLotId) {
      await syncAgentInvoiceForLot({
        agentId: deletedAgentId,
        lotId: deletedLotId,
        createdById: auth.userId,
      });
    }

    return NextResponse.json({ success: true, message: "Visit record deleted successfully" });
  } catch (error: any) {
    console.error("DELETE /api/agent/visits error:", error);
    return NextResponse.json(
      { error: "Failed to delete visit" },
      { status: 500 }
    );
  }
}
