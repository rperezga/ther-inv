import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { connectDB } from "@/lib/db";
import { Worker } from "@/models/Worker";
import { User } from "@/models/User";
import { Invitation } from "@/models/Invitation";
import { verifyUserHasRole } from "@/lib/auth";
import { generateUniqueInitials } from "@/lib/calculations";
import { sendInvitationEmail } from "@/lib/email";
import { UserRole } from "@/lib/types";

// Helper to determine agentType (PT vs PTA) from worker role
function detectAgentType(roleStr: string): "PT" | "PTA" {
  const lower = roleStr.toLowerCase();
  if (lower.includes("pta") || lower.includes("assistant")) {
    return "PTA";
  }
  return "PT";
}

export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await verifyUserHasRole(req, [
      "admin",
      "manager",
      "viewer",
    ]);
    if (errorResponse) return errorResponse;

    await connectDB();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const query: any = {};
    if (status && status !== "all") {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { role: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { initials: { $regex: search, $options: "i" } },
      ];
    }

    let rawWorkers = await Worker.find(query).sort({ firstName: 1, lastName: 1 });

    // Check if any existing workers in database need initials backfilled
    const missingInitials = rawWorkers.filter((w) => !w.initials);
    if (missingInitials.length > 0) {
      const allExisting = await Worker.find({});
      const assignedInitials: string[] = allExisting
        .map((w) => w.initials)
        .filter((init): init is string => Boolean(init));

      for (const w of allExisting) {
        if (!w.initials) {
          const uniqueInit = generateUniqueInitials(
            w.firstName,
            w.lastName,
            assignedInitials
          );
          w.initials = uniqueInit;
          assignedInitials.push(uniqueInit);
          await w.save();
        }
      }

      // Re-fetch to return fully updated records with initials
      rawWorkers = await Worker.find(query).sort({ firstName: 1, lastName: 1 });
    }

    // Fetch existing users and pending invitations to enrich worker list
    const emails = rawWorkers
      .map((w) => w.email?.toLowerCase().trim())
      .filter((e): e is string => Boolean(e));

    const [matchedUsers, pendingInvites] = await Promise.all([
      User.find({ email: { $in: emails } }, "name email role agentType isActive createdAt"),
      Invitation.find({ email: { $in: emails }, status: "pending" }, "email token role agentType expiresAt"),
    ]);

    const userMap = new Map<string, any>();
    for (const u of matchedUsers) {
      userMap.set(u.email.toLowerCase(), {
        id: u._id.toString(),
        name: u.name,
        email: u.email,
        role: u.role,
        agentType: u.agentType,
        hasAccount: true,
      });
    }

    const inviteMap = new Map<string, any>();
    for (const inv of pendingInvites) {
      inviteMap.set(inv.email.toLowerCase(), {
        token: inv.token,
        role: inv.role,
        agentType: inv.agentType,
        expiresAt: inv.expiresAt,
        isPending: true,
      });
    }

    const workers = rawWorkers.map((w) => {
      const doc = w.toObject();
      const normEmail = (w.email || "").toLowerCase().trim();
      const userAccount = normEmail ? userMap.get(normEmail) || null : null;
      const pendingInvite = normEmail ? inviteMap.get(normEmail) || null : null;

      return {
        ...doc,
        userAccount,
        pendingInvite,
      };
    });

    return NextResponse.json({ workers });
  } catch (error: any) {
    console.error("Workers GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch workers" },
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
    const { firstName, lastName, role, hourlyRate, phone, email, ssnLast4, status, notes } =
      body;

    if (!firstName?.trim() || !lastName?.trim() || !role?.trim()) {
      return NextResponse.json(
        { error: "First name, last name, and role/specialty are required" },
        { status: 400 }
      );
    }

    await connectDB();

    // Query existing initials to ensure no duplicates
    const existingWorkers = await Worker.find({});
    const existingInitials = existingWorkers
      .map((w) => w.initials)
      .filter((i): i is string => Boolean(i));

    const finalInitials = generateUniqueInitials(
      firstName.trim(),
      lastName.trim(),
      existingInitials
    );

    const normEmail = email?.toLowerCase().trim() || "";

    const newWorker = await Worker.create({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      initials: finalInitials,
      role: role.trim(),
      hourlyRate: Number(hourlyRate) || 0,
      phone: phone?.trim() || "",
      email: normEmail,
      ssnLast4: ssnLast4?.trim() || "",
      status: status || "active",
      notes: notes?.trim() || "",
    });

    // Auto-invite if email is provided
    let inviteResult = null;
    if (normEmail) {
      try {
        const existingUser = await User.findOne({ email: normEmail });
        if (!existingUser) {
          const agentType = detectAgentType(role);
          const token = crypto.randomBytes(24).toString("hex");
          const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

          await Invitation.deleteMany({ email: normEmail, status: "pending" });
          const newInvite = await Invitation.create({
            token,
            email: normEmail,
            role: "agent" as UserRole,
            agentType,
            status: "pending",
            invitedBy: user.userId,
            expiresAt,
          });

          // Build invitation link
          const forwardedProto = req.headers.get("x-forwarded-proto") || "https";
          const forwardedHost = req.headers.get("x-forwarded-host") || req.headers.get("host");

          let appOrigin = "";
          if (forwardedHost && !forwardedHost.includes("localhost")) {
            appOrigin = `${forwardedProto}://${forwardedHost}`;
          } else if (req.nextUrl?.origin && !req.nextUrl.origin.includes("localhost")) {
            appOrigin = req.nextUrl.origin;
          } else if (process.env.NEXT_PUBLIC_APP_URL && !process.env.NEXT_PUBLIC_APP_URL.includes("localhost")) {
            appOrigin = process.env.NEXT_PUBLIC_APP_URL;
          } else {
            appOrigin = "https://therinv.roshhome.com";
          }

          const inviteRelativePath = `/register?invite=${token}`;
          const fullInviteUrl = `${appOrigin.replace(/\/$/, "")}${inviteRelativePath}`;

          const emailRes = await sendInvitationEmail({
            to: normEmail,
            role: "agent",
            agentType,
            invitationUrl: fullInviteUrl,
            invitedByName: user.name || "THER-INV Team",
          });

          inviteResult = {
            sent: emailRes.success,
            inviteUrl: fullInviteUrl,
            error: emailRes.error,
          };
        }
      } catch (inviteErr) {
        console.error("Auto-invite error for new worker:", inviteErr);
      }
    }

    return NextResponse.json(
      { success: true, worker: newWorker, autoInvite: inviteResult },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Workers POST error:", error);
    return NextResponse.json(
      { error: "Failed to create worker" },
      { status: 500 }
    );
  }
}
