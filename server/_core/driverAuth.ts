import * as bcrypt from "bcryptjs";
import * as jwt from "jsonwebtoken";
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
}

/**
 * Authenticate driver with email and password
 */
export async function driverLogin(payload: DriverLoginPayload): Promise<DriverToken> {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  // Find user by email
  const user = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, payload.email))
    .limit(1)
    .then((rows) => rows[0]);

  if (!user) {
    throw new Error("Email o contraseña incorrectos");
  }

  // Check if user is a driver
  if (user.role !== "driver" && user.role !== "owner" && user.role !== "admin") {
    throw new Error("Este usuario no tiene acceso de chofer");
  }

  // Verify password
  if (!user.passwordHash) {
    throw new Error("Este usuario no tiene contraseña configurada");
  }

  const isPasswordValid = await bcrypt.compare(payload.password, user.passwordHash);
  if (!isPasswordValid) {
    throw new Error("Email o contraseña incorrectos");
  }

  // Log successful login
  await db.insert(passwordAuditLog).values({
    userId: user.id,
    action: "changed",
    ipAddress: payload.ipAddress,
    userAgent: payload.userAgent,
    reason: "login",
  });

  // Generate JWT token
  const jwtSecret = process.env.JWT_SECRET || "your-secret-key";
  const expiresIn = 24 * 60 * 60; // 24 hours
  const token = jwt.sign(
    {
      userId: user.id,
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
  };
}

/**
 * Verify JWT token
 */
export function verifyDriverToken(token: string): any {
  try {
    const jwtSecret = process.env.JWT_SECRET || "your-secret-key";
    return jwt.verify(token, jwtSecret);
  } catch (error) {
    throw new Error("Token inválido o expirado");
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

  return await db
    .select()
    .from(passwordAuditLog)
    .where(eq(passwordAuditLog.userId, userId))
    .orderBy((table) => table.createdAt)
    .limit(limit);
}
