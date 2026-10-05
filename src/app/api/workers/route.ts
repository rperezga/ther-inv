import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Worker } from "@/models/Worker";
import { verifyUserHasRole } from "@/lib/auth";

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
      ];
    }

    const workers = await Worker.find(query).sort({ firstName: 1, lastName: 1 });
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

    if (!firstName || !lastName || !role || hourlyRate === undefined) {
      return NextResponse.json(
        { error: "First name, last name, role, and hourly rate are required" },
        { status: 400 }
      );
    }

    await connectDB();

    const newWorker = await Worker.create({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      role: role.trim(),
      hourlyRate: Number(hourlyRate),
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
