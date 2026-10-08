import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";

export async function GET(req: NextRequest) {
  try {
    const payload = await getUserFromRequest(req);
    if (!payload) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    await connectDB();
    const user = await User.findById(payload.userId).select("-password");

    if (!user || !user.isActive) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    let effectiveAgentType = user.agentType;

    // Cross-check with linked Worker profile by email to always reflect latest role changes immediately
    if (user.email) {
      try {
        const { Worker } = await import("@/models/Worker");
        const linkedWorker = await Worker.findOne({ email: user.email.toLowerCase().trim() });
        if (linkedWorker && linkedWorker.role) {
          const lower = linkedWorker.role.toLowerCase();
          const detected: "PT" | "PTA" = (lower.includes("pta") || lower.includes("assistant")) ? "PTA" : "PT";
          effectiveAgentType = detected;
          // If out of sync in database, persist update asynchronously
          if (user.agentType !== detected) {
            await User.updateOne({ _id: user._id }, { $set: { agentType: detected } });
          }
        }
      } catch (workerErr) {
        console.error("Error cross-checking worker agentType in /api/auth/me:", workerErr);
      }
    }

    return NextResponse.json({
      user: {
        userId: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        agentType: effectiveAgentType || "PT",
      },
    });
  } catch (error) {
    return NextResponse.json({ user: null }, { status: 500 });
  }
}
