import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { connectDB } from "@/lib/db";
import { Invitation } from "@/models/Invitation";
import { User } from "@/models/User";
import { verifyUserHasRole } from "@/lib/auth";
import { sendInvitationEmail } from "@/lib/email";
import { UserRole } from "@/lib/types";

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

    // Exclude 'admin' (e.g. Roger Admin) from the list.
    // Therina (manager) and all invited team members (viewer / manager) are shown.
    const users = await User.find(
      { role: { $ne: "admin" } },
      "name email role isActive createdAt"
    ).sort({ createdAt: -1 });

    return NextResponse.json({ invitations, users });
  } catch (error: any) {
    console.error("Invitations GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch invitations" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { user, errorResponse } = await verifyUserHasRole(req, [
      "admin",
      "manager",
    ]);
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const { userId, role } = body;

    if (!userId || !role) {
      return NextResponse.json(
        { error: "User ID and new role are required" },
        { status: 400 }
      );
    }

    if (role !== "viewer" && role !== "manager" && role !== "agent") {
      return NextResponse.json(
        { error: "Role can only be changed to agent, viewer or manager" },
        { status: 400 }
      );
    }

    await connectDB();

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Never allow demoting/modifying admin users via this endpoint
    if (targetUser.role === "admin") {
      return NextResponse.json(
        { error: "Administrator roles cannot be modified here" },
        { status: 403 }
      );
    }

    targetUser.role = role as UserRole;
    await targetUser.save();

    return NextResponse.json({
      success: true,
      user: {
        _id: targetUser._id,
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
      },
    });
  } catch (error: any) {
    console.error("Error updating user role:", error);
    return NextResponse.json(
      { error: "Failed to update user role" },
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
    const { email, role = "agent", expirationHours = 24 } = body;

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
    
    // Default expiration: exactly 24 hours from creation
    const hoursNum = Number(expirationHours) || 24;
    const expiresAt = new Date(Date.now() + hoursNum * 60 * 60 * 1000);

    // Invalidate existing pending invites for this email
    await Invitation.deleteMany({ email: normalizedEmail, status: "pending" });

    const newInvite = await Invitation.create({
      token,
      email: normalizedEmail,
      role: role as UserRole,
      status: "pending",
      invitedBy: user.userId,
      expiresAt,
    });

    const populated = await Invitation.findById(newInvite._id).populate(
      "invitedBy",
      "name email"
    );

    // Construct full URL using request origin or configured app URL
    const appOrigin =
      req.nextUrl?.origin ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3000";
    const inviteRelativePath = `/register?invite=${token}`;
    const fullInviteUrl = `${appOrigin}${inviteRelativePath}`;

    // Send invitation email via Resend
    const inviterObj = populated?.invitedBy as any;
    const inviterName = inviterObj?.name || user.name || "Equipo THER-INV";
    const emailResult = await sendInvitationEmail({
      to: normalizedEmail,
      role: role,
      invitationUrl: fullInviteUrl,
      invitedByName: inviterName,
    });

    return NextResponse.json(
      {
        success: true,
        invitation: populated,
        inviteUrl: inviteRelativePath,
        fullInviteUrl,
        emailSent: emailResult.success,
        emailError: emailResult.error,
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
