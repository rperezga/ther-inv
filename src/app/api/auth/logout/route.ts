import { NextResponse } from "next/server";
import { clearAuthCookie } from "@/lib/auth";

export async function POST() {
  const response = NextResponse.json({ success: true, message: "Sesión cerrada" });
  clearAuthCookie(response);
  return response;
}
