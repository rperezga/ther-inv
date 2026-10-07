import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Worker } from "@/models/Worker";
import { verifyUserHasRole } from "@/lib/auth";
import { generateUniqueInitials } from "@/lib/calculations";

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

    let workers = await Worker.find(query).sort({ firstName: 1, lastName: 1 });

    // Check if any existing workers in database need initials backfilled
    const missingInitials = workers.filter((w) => !w.initials);
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
      workers = await Worker.find(query).sort({ firstName: 1, lastName: 1 });
    }

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

    const newWorker = await Worker.create({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      initials: finalInitials,
      role: role.trim(),
      hourlyRate: Number(hourlyRate) || 0,
      phone: phone?.trim() || "",
      email: email?.trim() || "",
      ssnLast4: ssnLast4?.trim() || "",
      status: status || "active",
      notes: notes?.trim() || "",
    });

    return NextResponse.json({ success: true, worker: newWorker }, { status: 201 });
  } catch (error: any) {
    console.error("Workers POST error:", error);
    return NextResponse.json(
      { error: "Failed to create worker" },
      { status: 500 }
    );
  }
}
