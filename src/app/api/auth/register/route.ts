import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { Invitation } from "@/models/Invitation";
import { hashPassword, setAuthCookie, signToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, invitationToken } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Nombre, correo y contraseña son obligatorios" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 6 caracteres" },
        { status: 400 }
      );
    }

    await connectDB();

    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return NextResponse.json(
        { error: "Ya existe un usuario registrado con este correo" },
        { status: 400 }
      );
    }

    const totalUsers = await User.countDocuments();
    let role: "admin" | "manager" | "viewer" = "viewer";
    let invitedBy = undefined;

    // First user becomes Admin automatically
    if (totalUsers === 0) {
      role = "admin";
    } else {
      // Must have valid invitation token
      if (!invitationToken) {
        return NextResponse.json(
          { error: "Se requiere un token de invitación válido para registrarse" },
          { status: 400 }
        );
      }

      const invite = await Invitation.findOne({
        token: invitationToken,
        status: "pending",
        expiresAt: { $gt: new Date() },
      });

      if (!invite) {
        return NextResponse.json(
          { error: "La invitación es inválida, ha expirado o ya fue utilizada" },
          { status: 400 }
        );
      }

      if (invite.email.toLowerCase() !== normalizedEmail) {
        return NextResponse.json(
          { error: `Esta invitación fue emitida para ${invite.email}` },
          { status: 400 }
        );
      }

      role = invite.role;
      invitedBy = invite.invitedBy;

      // Mark invite as accepted
      invite.status = "accepted";
      await invite.save();
    }

    const hashedPassword = hashPassword(password);
    const newUser = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role,
      isActive: true,
      invitedBy,
    });

    const payload = {
      userId: newUser._id.toString(),
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
    };

    const token = signToken(payload);
    const response = NextResponse.json({
      success: true,
      user: payload,
    });

    setAuthCookie(response, token);
    return response;
  } catch (error: any) {
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "Error en el servidor al registrar usuario" },
      { status: 500 }
    );
  }
}
