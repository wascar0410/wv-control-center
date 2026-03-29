import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb } from "./db";
import { users as usersTable, passwordResetTokens } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import * as bcrypt from "bcryptjs";
import {
  generateResetToken,
  isTokenExpired,
  getTokenExpirationTime,
} from "./_core/passwordReset";

describe("Password Reset Flow", () => {
  let testUserId: number;
  let testEmail = `test-reset-${Date.now()}@example.com`;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database connection failed");

    // Create test user
    const result = await db.insert(usersTable).values({
      openId: `test-reset-${Date.now()}`,
      name: "Test User",
      email: testEmail,
      loginMethod: "test",
      role: "driver",
    });

    // Get the inserted user ID
    const users = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, testEmail))
      .limit(1);

    testUserId = users[0]?.id || 0;
  });

  afterAll(async () => {
    const db = await getDb();
    if (!db) return;

    // Clean up test data
    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, testUserId));
    await db.delete(usersTable).where(eq(usersTable.id, testUserId));
  });

  it("should generate a valid reset token", () => {
    const token = generateResetToken();
    expect(token).toBeDefined();
    expect(token).toHaveLength(64); // 32 bytes * 2 (hex)
    expect(typeof token).toBe("string");
  });

  it("should calculate correct token expiration time", () => {
    const expirationTime = getTokenExpirationTime();
    const now = new Date();
    const diffInHours = (expirationTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    expect(diffInHours).toBeGreaterThan(23);
    expect(diffInHours).toBeLessThanOrEqual(24);
  });

  it("should detect expired tokens", () => {
    const expiredDate = new Date();
    expiredDate.setHours(expiredDate.getHours() - 1);

    expect(isTokenExpired(expiredDate)).toBe(true);
  });

  it("should detect non-expired tokens", () => {
    const futureDate = new Date();
    futureDate.setHours(futureDate.getHours() + 1);

    expect(isTokenExpired(futureDate)).toBe(false);
  });

  it("should create and store reset token in database", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database connection failed");

    const token = generateResetToken();
    const expiresAt = getTokenExpirationTime();

    await db.insert(passwordResetTokens).values({
      userId: testUserId,
      token,
      expiresAt,
    });

    const storedToken = await db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.token, token))
      .limit(1)
      .then((rows) => rows[0]);

    expect(storedToken).toBeDefined();
    expect(storedToken?.token).toBe(token);
    expect(storedToken?.userId).toBe(testUserId);
    expect(storedToken?.usedAt).toBeNull();
  });

  it("should hash passwords securely", async () => {
    const password = "SecurePassword123!";
    const hash = await bcrypt.hash(password, 10);

    expect(hash).not.toBe(password);
    expect(hash).toHaveLength(60); // bcrypt hash length

    const isMatch = await bcrypt.compare(password, hash);
    expect(isMatch).toBe(true);

    const wrongPassword = "WrongPassword123!";
    const isWrongMatch = await bcrypt.compare(wrongPassword, hash);
    expect(isWrongMatch).toBe(false);
  });

  it("should mark token as used after password reset", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database connection failed");

    const token = generateResetToken();
    const expiresAt = getTokenExpirationTime();

    const insertResult = await db.insert(passwordResetTokens).values({
      userId: testUserId,
      token,
      expiresAt,
    });

    const storedToken = await db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.token, token))
      .limit(1)
      .then((rows) => rows[0]);

    expect(storedToken?.usedAt).toBeNull();

    // Mark as used
    await db
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.id, storedToken!.id));

    const updatedToken = await db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.token, token))
      .limit(1)
      .then((rows) => rows[0]);

    expect(updatedToken?.usedAt).toBeDefined();
    expect(updatedToken?.usedAt).not.toBeNull();
  });

  it("should update user password hash", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database connection failed");

    const newPassword = "NewSecurePassword456!";
    const passwordHash = await bcrypt.hash(newPassword, 10);

    await db
      .update(usersTable)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(usersTable.id, testUserId));

    const updatedUser = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, testUserId))
      .limit(1)
      .then((rows) => rows[0]);

    expect(updatedUser?.passwordHash).toBe(passwordHash);

    const isMatch = await bcrypt.compare(newPassword, updatedUser?.passwordHash || "");
    expect(isMatch).toBe(true);
  });
});
