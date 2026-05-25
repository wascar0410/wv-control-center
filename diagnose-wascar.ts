import { getDb } from "./server/db";
import { users } from "./drizzle/schema";
import { eq } from "drizzle-orm";

const db = await getDb();
const email = "wascar.ortiz0410@gmail.com";

const user = await db
  .select({
    id: users.id,
    email: users.email,
    role: users.role,
    openId: users.openId,
    passwordHash: users.passwordHash,
  })
  .from(users)
  .where(eq(users.email, email))
  .limit(1);

if (user.length === 0) {
  console.log(JSON.stringify({ wascarExists: false, email }, null, 2));
} else {
  const hashStr = user[0].passwordHash ? user[0].passwordHash.toString().substring(0, 4) : null;
  console.log(JSON.stringify({
    wascarExists: true,
    wascarUserId: user[0].id,
    wascarEmail: user[0].email,
    wascarRole: user[0].role,
    wascarOpenId: user[0].openId,
    wascarHasPasswordHash: user[0].passwordHash !== null,
    passwordHashPrefix: hashStr,
  }, null, 2));
}

process.exit(0);
