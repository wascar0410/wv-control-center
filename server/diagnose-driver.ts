/**
 * Diagnostic script to check test.driver account in production
 * Usage: node -r esbuild-register server/diagnose-driver.ts
 */

import { getDb } from "./db";
import { users as usersTable } from "../drizzle/schema";
import { eq } from "drizzle-orm";

async function diagnose() {
  console.log("[DIAGNOSTIC] Starting test.driver account check...");
  
  try {
    const db = await getDb();
    if (!db) {
      console.error("[DIAGNOSTIC] Database connection failed");
      process.exit(1);
    }

    // Check if test.driver exists
    const testDriver = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, "test.driver@wvtransports.com"))
      .limit(1);

    if (!testDriver || testDriver.length === 0) {
      console.log("[DIAGNOSTIC] ❌ test.driver NOT FOUND in database");
      console.log("[DIAGNOSTIC] Checking all users with 'driver' role...");
      
      const allDrivers = await db
        .select({
          id: usersTable.id,
          email: usersTable.email,
          role: usersTable.role,
          verified: usersTable.verified,
          active: usersTable.active,
          hasPasswordHash: usersTable.passwordHash ? "yes" : "no",
        })
        .from(usersTable)
        .where(eq(usersTable.role, "driver"))
        .limit(10);
      
      console.log("[DIAGNOSTIC] Drivers in database:", allDrivers);
      process.exit(1);
    }

    const user = testDriver[0];
    console.log("[DIAGNOSTIC] ✅ test.driver FOUND");
    console.log("[DIAGNOSTIC] User details:", {
      id: user.id,
      email: user.email,
      role: user.role,
      verified: user.verified,
      active: user.active,
      hasPasswordHash: !!user.passwordHash,
      passwordHashPrefix: user.passwordHash ? user.passwordHash.substring(0, 4) : "NONE",
      openId: user.openId,
    });

    // Check if password hash is valid
    if (!user.passwordHash) {
      console.log("[DIAGNOSTIC] ⚠️  WARNING: test.driver has NO password hash");
    } else if (!user.passwordHash.startsWith("$2b$") && !user.passwordHash.startsWith("$2a$")) {
      console.log("[DIAGNOSTIC] ⚠️  WARNING: password hash does not look like bcrypt");
    } else {
      console.log("[DIAGNOSTIC] ✅ Password hash looks valid (bcrypt format)");
    }

    console.log("[DIAGNOSTIC] Diagnostic complete");
    process.exit(0);
  } catch (error) {
    console.error("[DIAGNOSTIC] Error:", error);
    process.exit(1);
  }
}

diagnose();
