import { getDb } from './server/db.ts';

async function main() {
  const db = await getDb();
  if (!db) {
    console.log('DB connection failed');
    process.exit(1);
  }
  
  const allUsers = await db.query.users.findMany({
    columns: { id: true, email: true, name: true, role: true, passwordHash: true }
  });
  
  console.log('=== ALL USERS ===');
  allUsers.forEach(u => {
    console.log(`${u.id}: ${u.email} (${u.role}) - name: ${u.name} - hash: ${u.passwordHash ? 'SET' : 'MISSING'}`);
  });
}

main().catch(console.error);
