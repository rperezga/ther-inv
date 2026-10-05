import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { comparePassword, setAuthCookie, signToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Correo electrónico y contraseña requeridos" },
        { status: 400 }
      );
    }

    await connectDB();

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return NextResponse.json(
        { error: "Credenciales inválidas" },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: "Esta cuenta se encuentra desactivada" },
        { status: 403 }
      );
    }

    const isValid = comparePassword(password, user.password || "");
    if (!isValid) {
      return NextResponse.json(
        { error: "Credenciales inválidas" },
        { status: 401 }
      );
    }

    const payload = {
      userId: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
    };

    const token = signToken(payload);

    const response = NextResponse.json({
      success: true,
      user: payload,
    });

    setAuthCookie(response, token);
    return response;
  } catch (error: any) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Error en el servidor al iniciar sesión" },
      { status: 500 }
    );
  }
}
