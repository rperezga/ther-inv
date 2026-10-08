import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Invitation } from "@/models/Invitation";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { valid: false, error: "Invitation token is required" },
        { status: 400 }
      );
    }

    await connectDB();

    const invite = await Invitation.findOne({
      token,
      status: "pending",
      expiresAt: { $gt: new Date() },
    }).populate("invitedBy", "name email");

    if (!invite) {
      return NextResponse.json(
        { valid: false, error: "Invalid, expired, or already used invitation" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      valid: true,
      email: invite.email,
      role: invite.role,
      agentType: (invite as any).agentType,
      invitedBy: invite.invitedBy,
    });
  } catch (error: any) {
    return NextResponse.json(
      { valid: false, error: "Failed to validate invitation" },
      { status: 500 }
    );
  }
}
