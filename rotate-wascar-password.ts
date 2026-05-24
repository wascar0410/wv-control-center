import { getDb } from "./server/db";
import { users } from "./drizzle/schema";
import { eq } from "drizzle-orm";
import bcryptjs from "bcryptjs";

async function rotateWascarPassword() {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // New temporary password (rotated after exposure)
    const newTempPassword = "WVTransportQA2026!Rotated";
    const salt = await bcryptjs.genSalt(10);
    const hashedPassword = await bcryptjs.hash(newTempPassword, salt);

    // Update only Wascar's password hash
    await db
      .update(users)
      .set({ 
        passwordHash: hashedPassword,
        updatedAt: new Date()
      })
      .where(eq(users.email, "wascar.ortiz0410@gmail.com"));

    console.log("✅ Wascar password rotated successfully");
    console.log(`📧 Email: wascar.ortiz0410@gmail.com`);
    console.log(`🔐 New temporary password: ${newTempPassword}`);
    console.log(`⚠️  This password should be changed after QA testing`);
  } catch (error) {
    console.error("❌ Error rotating password:", error);
  }
}

rotateWascarPassword();
