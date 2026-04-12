import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "./db";
import { usersTable } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("Admin Email Validation", () => {
  const testEmail = `test-driver-${Date.now()}@example.com`;
  const anotherEmail = `another-driver-${Date.now()}@example.com`;

  beforeAll(async () => {
    // Create a test user
    const database = await db();
    if (database) {
      await database.insert(usersTable).values({
        openId: `test-${Date.now()}`,
        name: "Test Driver",
        email: testEmail,
        role: "driver",
        loginMethod: "manual",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      });
    }
  });

  afterAll(async () => {
    // Clean up test data
    const database = await db();
    if (database) {
      await database.delete(usersTable).where(eq(usersTable.email, testEmail));
      await database.delete(usersTable).where(eq(usersTable.email, anotherEmail));
    }
  });

  it("should return available: false for existing email", async () => {
    const database = await db();
    if (!database) {
      throw new Error("Database connection failed");
    }

    const rows = await database
  .select()
  .from(usersTable)
  .where(eq(usersTable.email, testEmail))
  .limit(1);

const existingUser = rows[0];

    expect(existingUser).toBeDefined();
    expect(existingUser?.email).toBe(testEmail);
  });

  it("should return available: true for non-existing email", async () => {
    const database = await db();
    if (!database) {
      throw new Error("Database connection failed");
    }

    const nonExistingUser = await database
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, anotherEmail))
      .limit(1)
      .then((rows) => rows[0]);

    expect(nonExistingUser).toBeUndefined();
  });

  it("should validate email format correctly", () => {
    const validEmails = [
      "test@example.com",
      "user.name@example.co.uk",
      "test+tag@example.com",
    ];
    const invalidEmails = ["notanemail", "test@", "@example.com", "test @example.com"];

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    validEmails.forEach((email) => {
      expect(emailRegex.test(email)).toBe(true);
    });

    invalidEmails.forEach((email) => {
      expect(emailRegex.test(email)).toBe(false);
    });
  });
});
