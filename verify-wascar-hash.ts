import { getDb } from "./server/db";
import { users } from "./drizzle/schema";
import { eq } from "drizzle-orm";

const db = await getDb();
const email = "wascar.ortiz0410@gmail.com";

const user = await db
  .select({
    id: users.id,
    email: users.email,
    passwordHash: users.passwordHash,
  })
  .from(users)
  .where(eq(users.email, email))
  .limit(1);

if (user.length === 0) {
  console.log(JSON.stringify({ error: "User not found" }, null, 2));
} else {
  const hashStr = user[0].passwordHash ? user[0].passwordHash.toString() : null;
  console.log(JSON.stringify({
    wascarId: user[0].id,
    wascarEmail: user[0].email,
    passwordHashUpdated: hashStr,
  }, null, 2));
}

process.exit(0);
