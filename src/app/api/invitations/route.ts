import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { connectDB } from "@/lib/db";
import { Invitation } from "@/models/Invitation";
import { User } from "@/models/User";
import { verifyUserHasRole } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await verifyUserHasRole(req, [
      "admin",
      "manager",
    ]);
    if (errorResponse) return errorResponse;

    await connectDB();

    const invitations = await Invitation.find()
      .populate("invitedBy", "name email")
      .sort({ createdAt: -1 });

    const users = await User.find({}, "name email role isActive createdAt").sort({
      createdAt: -1,
    });

    return NextResponse.json({ invitations, users });
  } catch (error: any) {
    console.error("Invitations GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch invitations" },
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
    const { email, role = "viewer", expirationDays = 7 } = body;

    if (!email) {
      return NextResponse.json(
        { error: "Email address is required" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    await connectDB();

    // Check if user already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return NextResponse.json(
        { error: "A user with this email address already exists" },
        { status: 400 }
      );
    }

    // Role restrictions: Only admin can invite other admins
    if (role === "admin" && user.role !== "admin") {
      return NextResponse.json(
        { error: "Only administrators can invite other administrators" },
        { status: 403 }
      );
    }

    // Generate unique secure token
    const token = crypto.randomBytes(24).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + Number(expirationDays));

    // Invalidate existing pending invites for this email
    await Invitation.deleteMany({ email: normalizedEmail, status: "pending" });

    const newInvite = await Invitation.create({
      token,
      email: normalizedEmail,
      role,
      status: "pending",
      invitedBy: user.userId,
      expiresAt,
    });

    const populated = await Invitation.findById(newInvite._id).populate(
      "invitedBy",
      "name email"
    );

    return NextResponse.json(
      {
        success: true,
        invitation: populated,
        inviteUrl: `/register?invite=${token}`,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Invitation POST error:", error);
    return NextResponse.json(
      { error: "Failed to generate invitation" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { user, errorResponse } = await verifyUserHasRole(req, [
      "admin",
      "manager",
    ]);
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Invitation ID is required" },
        { status: 400 }
      );
    }

    await connectDB();
    await Invitation.findByIdAndDelete(id);

    return NextResponse.json({ success: true, message: "Invitation revoked successfully" });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to delete invitation" },
      { status: 500 }
    );
  }
}
