import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getDb } from "../db";
import { users as usersTable, passwordAuditLog } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";

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

const JWT_SECRET = process.env.JWT_SECRET || "wv-transport-secret-2026";
const TOKEN_EXPIRY_SECONDS = 365 * 24 * 60 * 60; // 1 año

/**
 * Authenticate user with email and password.
 */
export async function driverLogin(payload: DriverLoginPayload): Promise<DriverToken> {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  // 🔍 Buscar usuario
  const rows = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, payload.email))
    .limit(1);

  const user = rows[0];

  if (!user) {
    throw new Error("Email o contraseña incorrectos");
  }

  // 🔒 Validar rol permitido
  if (!["driver", "owner", "admin"].includes(user.role)) {
    throw new Error("Este usuario no tiene acceso al sistema");
  }

  // 🔒 Validar contraseña
  if (!user.passwordHash) {
    throw new Error("Usuario sin contraseña configurada");
  }

  const isPasswordValid = await bcrypt.compare(payload.password, user.passwordHash);

  if (!isPasswordValid) {
    throw new Error("Email o contraseña incorrectos");
  }

  // 🧾 Log de login (no crítico)
  try {
    await db.insert(passwordAuditLog).values({
      userId: user.id,
      action: "login",
      ipAddress: payload.ipAddress,
      userAgent: payload.userAgent,
      reason: "login",
    });
  } catch {
    // no bloquear login
  }

  // 🔑 Generar JWT
  const token = jwt.sign(
    {
      userId: user.id,
      openId: user.openId,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRY_SECONDS }
  );

  return {
    token,
    expiresIn: TOKEN_EXPIRY_SECONDS,
    userId: user.id,
    email: user.email || "",
    name: user.name || "",
    role: user.role,
  };
}

/**
 * 🔥 NUEVO: helper para setear cookie correctamente
 */
export function setAuthCookie(res: any, token: string) {
  res.cookie("wv_session", token, {
    httpOnly: true,
    secure: true,          // obligatorio en Railway
    sameSite: "none",      // necesario si frontend != backend
    maxAge: TOKEN_EXPIRY_SECONDS * 1000,
    path: "/",
  });
}

/**
 * Verify JWT token
 */
export function verifyDriverToken(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET) as {
      userId: number;
      openId: string;
      email: string;
      name: string;
      role: string;
    };
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
 * Get password audit history
 */
export async function getPasswordAuditHistory(userId: number, limit = 10) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(passwordAuditLog)
    .where(eq(passwordAuditLog.userId, userId))
    .orderBy(desc(passwordAuditLog.createdAt))
    .limit(limit);
}
