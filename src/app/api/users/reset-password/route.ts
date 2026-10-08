import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { verifyUserHasRole, hashPassword } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await verifyUserHasRole(req, [
      "admin",
      "manager",
    ]);
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const { userId, newPassword, confirmFirstName } = body;

    if (!userId || !newPassword) {
      return NextResponse.json(
        { error: "User ID and new password are required" },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long" },
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

    // Verify confirmation name matches the target user's first name
    const expectedFirstName = targetUser.name.trim().split(/\s+/)[0].toLowerCase();
    const providedFirstName = (confirmFirstName || "").trim().toLowerCase();

    if (expectedFirstName !== providedFirstName) {
      return NextResponse.json(
        { error: `Confirmation name does not match. Please type "${targetUser.name.trim().split(/\s+/)[0]}" to confirm.` },
        { status: 400 }
      );
    }

    targetUser.password = hashPassword(newPassword);
    await targetUser.save();

    return NextResponse.json({
      success: true,
      message: `Password for ${targetUser.name} has been updated successfully`,
    });
  } catch (error: any) {
    console.error("Admin reset password error:", error);
    return NextResponse.json(
      { error: "Failed to reset user password" },
      { status: 500 }
    );
  }
}
