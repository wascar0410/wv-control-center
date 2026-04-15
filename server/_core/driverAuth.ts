import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getDb } from "../db";
import { users as usersTable, passwordAuditLog } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export interface DriverLoginPayload {
  email: string;
  password: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface DriverToken {
  token: string;
  expiresIn: number;
  userId: number;
  email: string;
  name: string;
  role: string;
}

/**
 * Authenticate user with email and password.
 * Works for all roles: owner, admin, driver.
 * Returns a JWT token AND the user role so the frontend can redirect correctly.
 */
export async function driverLogin(payload: DriverLoginPayload): Promise<DriverToken> {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  // Find user by email
  console.log("[driverLogin] Attempting login with email:", payload.email, "type:", typeof payload.email);
  const rows = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, payload.email))
    .limit(1);
  console.log("[driverLogin] Query result rows count:", rows.length);
  const user = rows[0];

  if (!user) {
    throw new Error("Email o contraseña incorrectos");
  }

  // Allow owner, admin, and driver roles
  if (user.role !== "driver" && user.role !== "owner" && user.role !== "admin") {
    throw new Error("Este usuario no tiene acceso al sistema");
  }

  // Verify password
  if (!user.passwordHash) {
    throw new Error("Este usuario no tiene contraseña configurada. Contacta al administrador.");
  }

  const isPasswordValid = await bcrypt.compare(payload.password, user.passwordHash);
  if (!isPasswordValid) {
    throw new Error("Email o contraseña incorrectos");
  }

  // Log successful login (non-fatal)
  try {
    await db.insert(passwordAuditLog).values({
      userId: user.id,
      action: "changed",
      ipAddress: payload.ipAddress,
      userAgent: payload.userAgent,
      reason: "login",
    });
  } catch {
    // Non-fatal - don't block login if audit log fails
  }

  // Generate JWT token (used as session cookie value)
  const jwtSecret = process.env.JWT_SECRET || "wv-transport-secret-2026";
  const expiresIn = 365 * 24 * 60 * 60; // 1 year in seconds

  const token = (jwt as any).sign(
    {
      userId: user.id,
      openId: user.openId,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    jwtSecret,
    { expiresIn }
  );

  return {
    token,
    expiresIn,
    userId: user.id,
    email: user.email || "",
    name: user.name || "",
    role: user.role,
  };
}

/**
 * Verify JWT token (used by context.ts to authenticate requests)
 */
export function verifyDriverToken(token: string): { userId: number; openId: string; email: string; name: string; role: string } | null {
  try {
    const jwtSecret = process.env.JWT_SECRET || "wv-transport-secret-2026";
    return (jwt as any).verify(token, jwtSecret) as any;
  } catch {
    return null;
  }
}

/**
 * Log password change
 */
export async function logPasswordChange(
  userId: number,
  ipAddress?: string,
  userAgent?: string,
  reason?: string
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.insert(passwordAuditLog).values({
    userId,
    action: "changed",
    ipAddress,
    userAgent,
    reason,
  });
}

/**
 * Log password reset
 */
export async function logPasswordReset(
  userId: number,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.insert(passwordAuditLog).values({
    userId,
    action: "reset",
    ipAddress,
    userAgent,
    reason: "password_reset",
  });
}

/**
 * Get password audit history for user
 */
export async function getPasswordAuditHistory(userId: number, limit = 10) {
  const db = await getDb();
  if (!db) return [];

  const rows = await db
    .select()
    .from(passwordAuditLog)
    .where(eq(passwordAuditLog.userId, userId))
    .orderBy(desc(passwordAuditLog.createdAt))
    .limit(limit);
  return rows;
}
// Force redeploy Mon Apr 13 09:59:01 EDT 2026
// Force redeploy 1776111999
