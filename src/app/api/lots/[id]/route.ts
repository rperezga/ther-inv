import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Lot } from "@/models/Lot";
import { Invoice } from "@/models/Invoice";
import { AgentVisit } from "@/models/AgentVisit";
import { verifyUserHasRole } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, errorResponse } = await verifyUserHasRole(req, [
      "admin",
      "manager",
      "viewer",
      "agent",
    ]);
    if (errorResponse) return errorResponse;

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Lot ID is required" }, { status: 400 });
    }

    await connectDB();

    const lot = await Lot.findById(id).populate("createdBy", "name email");
    if (!lot) {
      return NextResponse.json({ error: "Period / Lot not found" }, { status: 404 });
    }

    // Fetch all invoices associated with this lot
    const invoices = await Invoice.find({ lotId: lot._id }).sort({ createdAt: -1 });

    // Fetch all agent visits associated with this lot
    const visitsQuery: any = { lotId: lot._id };
    if (user.role === "agent") {
      visitsQuery.agentId = user.userId;
    }
    const visits = await AgentVisit.find(visitsQuery).sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      lot,
      invoices,
      visits,
    });
  } catch (error: any) {
    console.error("GET /api/lots/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch period details" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, errorResponse } = await verifyUserHasRole(req, [
      "admin",
      "manager",
      "agent",
    ]);
    if (errorResponse) return errorResponse;

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Lot ID is required" }, { status: 400 });
    }

    const body = await req.json();
    const { action, agentId, status } = body;

    await connectDB();

    const lot = await Lot.findById(id);
    if (!lot) {
      return NextResponse.json({ error: "Period not found" }, { status: 404 });
    }

    // Action 1: Toggle overall lot status (open / closed)
    if (action === "toggle_status" || (status && (status === "open" || status === "closed"))) {
      if (user.role !== "admin" && user.role !== "manager") {
        return NextResponse.json({ error: "Only managers can open or close periods" }, { status: 403 });
      }
      lot.status = status || (lot.status === "open" ? "closed" : "open");
      await lot.save();
      return NextResponse.json({ success: true, lot });
    }

    // Action 2: Update specific agent status in lot
    // - "submitted": agent marks their visits completed and ready for manager review
    // - "completed": manager reviews and completes the agent (generates invoice / locks agent)
    // - "reopen": manager re-opens the period for this agent so they can edit
    if (action === "set_agent_status" || action === "reopen") {
      const targetAgentId = agentId || (user.role === "agent" ? user.userId : null);
      if (!targetAgentId) {
        return NextResponse.json({ error: "Agent ID is required" }, { status: 400 });
      }

      const agentStatus = status as "in_progress" | "submitted" | "completed";

      // If agent is submitting themselves
      if (user.role === "agent") {
        if (targetAgentId !== user.userId) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        if (agentStatus !== "submitted" && agentStatus !== "in_progress") {
          return NextResponse.json({ error: "Agents can only submit or set to in_progress" }, { status: 403 });
        }
      }

      // If manager completing or reopening
      if (agentStatus === "completed" || action === "reopen") {
        if (user.role !== "admin" && user.role !== "manager") {
          return NextResponse.json({ error: "Only managers can complete or reopen agent submissions" }, { status: 403 });
        }
      }

      if (!Array.isArray(lot.agentStatuses)) {
        lot.agentStatuses = [];
      }

      const existingIndex = lot.agentStatuses.findIndex(
        (as) => as.agentId.toString() === targetAgentId.toString()
      );

      const newStatusVal = action === "reopen" ? "in_progress" : agentStatus;

      if (existingIndex >= 0) {
        lot.agentStatuses[existingIndex].status = newStatusVal;
        if (newStatusVal === "completed") {
          lot.agentStatuses[existingIndex].completedAt = new Date();
          lot.agentStatuses[existingIndex].completedBy = user.userId as any;
          if (body.invoiceId) lot.agentStatuses[existingIndex].invoiceId = body.invoiceId;
          if (body.invoiceNumber) lot.agentStatuses[existingIndex].invoiceNumber = body.invoiceNumber;
        } else if (newStatusVal === "in_progress") {
          // Re-opened: clear completedAt
          lot.agentStatuses[existingIndex].completedAt = undefined;
        }
      } else {
        lot.agentStatuses.push({
          agentId: targetAgentId as any,
          agentName: body.agentName || user.name,
          agentEmail: (body.agentEmail || user.email).toLowerCase(),
          status: newStatusVal,
          invoiceId: body.invoiceId,
          invoiceNumber: body.invoiceNumber,
          completedAt: newStatusVal === "completed" ? new Date() : undefined,
          completedBy: newStatusVal === "completed" ? (user.userId as any) : undefined,
        });
      }

      await lot.save();
      return NextResponse.json({ success: true, lot });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("PATCH /api/lots/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update period" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, errorResponse } = await verifyUserHasRole(req, [
      "admin",
      "manager",
    ]);
    if (errorResponse) return errorResponse;

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Lot ID is required" }, { status: 400 });
    }

    await connectDB();

    const lot = await Lot.findById(id);
    if (!lot) {
      return NextResponse.json({ error: "Period / Lot not found" }, { status: 404 });
    }

    // Unlink any invoices tied to this lot (or delete them if preferred; unlinking preserves financial ledger)
    await Invoice.updateMany({ lotId: lot._id }, { $unset: { lotId: 1, lotNumber: 1 } });

    // Remove agent visits tied to this lot
    await AgentVisit.deleteMany({ lotId: lot._id });

    // Delete the Lot itself
    await Lot.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: `Billing Period ${lot.lotCode || id} deleted successfully`,
    });
  } catch (error: any) {
    console.error("DELETE /api/lots/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete billing period" },
      { status: 500 }
    );
  }
}
