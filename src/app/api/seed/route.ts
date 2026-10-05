import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { Worker } from "@/models/Worker";
import { Invoice } from "@/models/Invoice";
import { hashPassword } from "@/lib/auth";

export async function GET() {
  return seedDatabase();
}

export async function POST() {
  return seedDatabase();
}

async function seedDatabase() {
  try {
    await connectDB();

    const existingUsers = await User.countDocuments();
    if (existingUsers > 0) {
      return NextResponse.json({
        message: "The database already contains users. Existing data was not overwritten.",
        status: "already_seeded",
      });
    }

    // 1. Create Roger (Admin)
    const adminPassword = hashPassword(process.env.ADMIN_PASSWORD || "admin123456");
    const adminUser = await User.create({
      name: process.env.ADMIN_NAME || "Roger (Admin)",
      email: (process.env.ADMIN_EMAIL || "roger@admin.com").toLowerCase(),
      password: adminPassword,
      role: "admin",
      isActive: true,
    });

    // 2. Create Therina (Principal User / Manager)
    const therinaPassword = hashPassword(process.env.MANAGER_PASSWORD || "therina123456");
    const therinaUser = await User.create({
      name: process.env.MANAGER_NAME || "Therina",
      email: (process.env.MANAGER_EMAIL || "therina@agency.com").toLowerCase(),
      password: therinaPassword,
      role: "manager",
      isActive: true,
      invitedBy: adminUser._id,
    });

    // 3. Create Sample Agency Workers
    const sampleWorkers = [
      {
        firstName: "Camila",
        lastName: "Rodriguez",
        role: "Registered Nurse (RN)",
        hourlyRate: 48,
        phone: "(305) 555-0142",
        email: "camila.rodriguez@email.com",
        ssnLast4: "4921",
        status: "active",
        notes: "Intensive care and post-operative specialist.",
      },
      {
        firstName: "David",
        lastName: "Hernandez",
        role: "Physical Therapist (PT)",
        hourlyRate: 55,
        phone: "(305) 555-0198",
        email: "david.h@email.com",
        ssnLast4: "1830",
        status: "active",
        notes: "Ambulatory and home health rehabilitation.",
      },
      {
        firstName: "Sofia",
        lastName: "Martinez",
        role: "Certified Nursing Assistant (CNA)",
        hourlyRate: 28,
        phone: "(305) 555-0112",
        email: "sofia.m@email.com",
        ssnLast4: "7219",
        status: "active",
        notes: "Daily geriatric patient care.",
      },
      {
        firstName: "Carlos",
        lastName: "Morales",
        role: "Occupational Therapist (OT)",
        hourlyRate: 52,
        phone: "(305) 555-0234",
        email: "carlos.morales@email.com",
        ssnLast4: "3384",
        status: "active",
        notes: "Pediatric and geriatric occupational therapy.",
      },
      {
        firstName: "Elena",
        lastName: "Ramos",
        role: "Licensed Practical Nurse (LPN)",
        hourlyRate: 36,
        phone: "(305) 555-0177",
        email: "elena.ramos@email.com",
        ssnLast4: "8841",
        status: "active",
        notes: "Medication management and complex wound care.",
      },
      {
        firstName: "Marcos",
        lastName: "Perez",
        role: "Speech Language Pathologist (SLP)",
        hourlyRate: 58,
        phone: "(305) 555-0165",
        email: "marcos.p@email.com",
        ssnLast4: "9512",
        status: "active",
        notes: "Speech and swallowing pathology therapy.",
      },
    ];

    const createdWorkers = await Worker.insertMany(sampleWorkers);

    // 4. Create an initial weekly invoice
    const now = new Date();
    const periodStart = new Date(now);
    periodStart.setDate(now.getDate() - 7);
    const periodEnd = new Date(now);
    periodEnd.setDate(now.getDate() - 1);
    const dueDate = new Date(now);
    dueDate.setDate(now.getDate() + 14);

    const items = [
      {
        workerId: createdWorkers[0]._id,
        workerName: `${createdWorkers[0].firstName} ${createdWorkers[0].lastName}`,
        role: createdWorkers[0].role,
        regularHours: 40,
        regularRate: createdWorkers[0].hourlyRate,
        overtimeHours: 4,
        overtimeRate: 72,
        description: "Weekly clinical RN services - Day shift",
        amount: 40 * 48 + 4 * 72, // 1920 + 288 = 2208
      },
      {
        workerId: createdWorkers[1]._id,
        workerName: `${createdWorkers[1].firstName} ${createdWorkers[1].lastName}`,
        role: createdWorkers[1].role,
        regularHours: 35,
        regularRate: createdWorkers[1].hourlyRate,
        overtimeHours: 0,
        overtimeRate: 0,
        description: "Comprehensive physical therapy sessions",
        amount: 35 * 55, // 1925
      },
      {
        workerId: createdWorkers[2]._id,
        workerName: `${createdWorkers[2].firstName} ${createdWorkers[2].lastName}`,
        role: createdWorkers[2].role,
        regularHours: 40,
        regularRate: createdWorkers[2].hourlyRate,
        overtimeHours: 6,
        overtimeRate: 42,
        description: "Continuous CNA patient assistance",
        amount: 40 * 28 + 6 * 42, // 1120 + 252 = 1372
      },
    ];

    const subtotal = items.reduce((sum, it) => sum + it.amount, 0);

    const initialInvoice = await Invoice.create({
      invoiceNumber: `INV-${now.getFullYear()}-0001`,
      clientName: "Metropolitan Healthcare Center",
      clientEmail: "billing@metrohealthcenter.com",
      clientAddress: "742 Evergreen Terrace, Suite 300, Miami, FL 33101",
      periodStart,
      periodEnd,
      invoiceDate: now,
      dueDate,
      items,
      subtotal,
      taxRate: 0,
      taxAmount: 0,
      totalAmount: subtotal,
      status: "pending",
      notes: "Weekly invoice corresponding to payroll cycle. Net 14 payment terms.",
      createdBy: therinaUser._id,
    });

    return NextResponse.json({
      success: true,
      message: "Database initialized successfully with default users, staff directory, and sample weekly invoice.",
      admin: { email: adminUser.email, password: process.env.ADMIN_PASSWORD || "admin123456" },
      therina: { email: therinaUser.email, password: process.env.MANAGER_PASSWORD || "therina123456" },
      workersCreated: createdWorkers.length,
      sampleInvoice: initialInvoice.invoiceNumber,
    });
  } catch (error: any) {
    console.error("Seed error:", error);
    return NextResponse.json(
      { error: "Failed to initialize database", details: error.message },
      { status: 500 }
    );
  }
}
