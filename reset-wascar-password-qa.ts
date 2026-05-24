import bcrypt from 'bcryptjs';
import { getDb } from './server/db';
import { users } from './drizzle/schema';
import { eq } from 'drizzle-orm';

const WASCAR_EMAIL = 'wascar.ortiz0410@gmail.com';
const QA_TEMP_PASSWORD = 'WVTransportQA2026!Temp';
const BCRYPT_ROUNDS = 10;

async function resetWascarPassword() {
  try {
    console.log('🔄 Resetting Wascar password for QA...');
    console.log(`📧 Email: ${WASCAR_EMAIL}`);
    
    // Get database connection
    const db = await getDb();
    if (!db) {
      throw new Error('Database connection failed');
    }

    // Find Wascar user
    const user = await db.query.users.findFirst({
      where: eq(users.email, WASCAR_EMAIL)
    });

    if (!user) {
      throw new Error(`User not found: ${WASCAR_EMAIL}`);
    }

    console.log(`✅ Found user: ${user.email} (ID: ${user.id}, Role: ${user.role})`);

    // Generate new password hash
    const newPasswordHash = await bcrypt.hash(QA_TEMP_PASSWORD, BCRYPT_ROUNDS);
    console.log(`🔐 Generated new password hash with ${BCRYPT_ROUNDS} rounds`);

    // Update password hash only
    await db.update(users)
      .set({ passwordHash: newPasswordHash })
      .where(eq(users.id, user.id));

    console.log(`✅ Password reset successfully`);
    console.log(`\n📋 QA Credentials:`);
    console.log(`   Email: ${WASCAR_EMAIL}`);
    console.log(`   Temporary Password: ${QA_TEMP_PASSWORD}`);
    console.log(`\n⚠️  IMPORTANT: This temporary password should be changed after QA testing`);
    console.log(`\n✅ Ready for owner regression testing in production`);

  } catch (error) {
    console.error('❌ Error resetting password:', (error as Error).message);
    process.exit(1);
  }
}

resetWascarPassword();
