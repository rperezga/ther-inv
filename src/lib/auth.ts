import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { IUser, UserRole } from "./types";
import { User } from "@/models/User";
import { connectDB } from "./db";

const JWT_SECRET = process.env.JWT_SECRET || "super_secret_jwt_ther_inv_key_change_in_production_2026";
const COOKIE_NAME = "ther_inv_session";

export interface JWTPayload {
  userId: string;
  name: string;
  email: string;
  role: UserRole;
  agentType?: "PT" | "PTA";
}

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

export function comparePassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

export async function getUserFromRequest(
  req: NextRequest
): Promise<JWTPayload | null> {
  const cookieToken = req.cookies.get(COOKIE_NAME)?.value;
  let token = cookieToken;

  if (!token) {
    const authHeader = req.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }
  }

  if (!token) return null;
  return verifyToken(token);
}

export function setAuthCookie(response: NextResponse, token: string) {
  response.cookies.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export function clearAuthCookie(response: NextResponse) {
  response.cookies.delete(COOKIE_NAME);
}

export async function verifyUserHasRole(
  req: NextRequest,
  allowedRoles: Array<UserRole>
): Promise<
  | { user: JWTPayload; errorResponse: null }
  | { user: null; errorResponse: NextResponse }
> {
  const user = await getUserFromRequest(req);
  if (!user) {
    return {
      user: null,
      errorResponse: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  if (!allowedRoles.includes(user.role)) {
    return {
      user: null,
      errorResponse: NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      ),
    };
  }

  return { user, errorResponse: null };
}
