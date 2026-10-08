import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { Invitation } from "@/models/Invitation";
import { verifyUserHasRole } from "@/lib/auth";
import { sendPasswordResetEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await verifyUserHasRole(req, [
      "admin",
      "manager",
    ]);
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const { userId, confirmFirstName } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    await connectDB();

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Protection: managers cannot reset passwords for admins
    if (targetUser.role === "admin" && user.role !== "admin") {
      return NextResponse.json(
        { error: "Only administrators can reset admin passwords" },
        { status: 403 }
      );
    }

    // Verify confirmation name matches the target user's first name (case-insensitive)
    const expectedFirstName = targetUser.name.trim().split(/\s+/)[0].toLowerCase();
    const providedFirstName = (confirmFirstName || "").trim().toLowerCase();

    if (expectedFirstName !== providedFirstName) {
      return NextResponse.json(
        { error: `Confirmation name does not match. Please type "${targetUser.name.trim().split(/\s+/)[0]}" to confirm.` },
        { status: 400 }
      );
    }

    // Deactivate / delete old password so old credentials immediately cannot be used to login
    targetUser.password = `DEACTIVATED_RESET_REQUESTED_${crypto.randomBytes(16).toString("hex")}`;
    await targetUser.save();

    // Generate secure reset token with 24 hours expiration
    const token = crypto.randomBytes(24).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Invalidate existing pending invites/resets for this email
    await Invitation.deleteMany({ email: targetUser.email.toLowerCase(), status: "pending" });

    await Invitation.create({
      token,
      email: targetUser.email.toLowerCase(),
      role: targetUser.role,
      agentType: targetUser.agentType,
      status: "pending",
      invitedBy: user.userId,
      expiresAt,
    });

    // Construct full URL respecting host domain
    const forwardedProto = req.headers.get("x-forwarded-proto") || "https";
    const forwardedHost = req.headers.get("x-forwarded-host") || req.headers.get("host");

    let appOrigin = "";
    if (forwardedHost && !forwardedHost.includes("localhost")) {
      appOrigin = `${forwardedProto}://${forwardedHost}`;
    } else if (req.nextUrl?.origin && !req.nextUrl.origin.includes("localhost")) {
      appOrigin = req.nextUrl.origin;
    }

    if (!appOrigin && process.env.NEXT_PUBLIC_APP_URL && !process.env.NEXT_PUBLIC_APP_URL.includes("localhost")) {
      appOrigin = process.env.NEXT_PUBLIC_APP_URL;
    }

    if (!appOrigin) {
      appOrigin = "https://therinv.roshhome.com";
    }

    const resetRelativePath = `/register?invite=${token}`;
    const fullResetUrl = `${appOrigin.replace(/\/$/, "")}${resetRelativePath}`;

    // Send reset email via Resend
    const emailResult = await sendPasswordResetEmail({
      to: targetUser.email,
      recipientName: targetUser.name,
      resetUrl: fullResetUrl,
      requestedByName: user.name || "Agency Manager",
    });

    return NextResponse.json({
      success: true,
      message: `Password reset email sent to ${targetUser.email}. Previous password deactivated.`,
      emailSent: emailResult.success,
      emailError: emailResult.error,
    });
  } catch (error: any) {
    console.error("Admin reset password error:", error);
    return NextResponse.json(
      { error: "Failed to process password reset request" },
      { status: 500 }
    );
  }
}
