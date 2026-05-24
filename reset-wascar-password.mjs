import bcryptjs from 'bcryptjs';
import mysql from 'mysql2/promise';

const password = 'WVTransportQA2026!Temp';
const saltRounds = 10;

// Hash the password
const passwordHash = await bcryptjs.hash(password, saltRounds);

console.log('Password hash:', passwordHash);

// Connect to database and update Wascar's password
const connection = await mysql.createConnection({
  host: process.env.DATABASE_URL?.split('@')[1]?.split(':')[0] || 'localhost',
  user: process.env.DATABASE_URL?.split('//')[1]?.split(':')[0] || 'root',
  password: process.env.DATABASE_URL?.split(':')[2]?.split('@')[0] || '',
  database: process.env.DATABASE_URL?.split('/')[3]?.split('?')[0] || 'wv_control',
});

try {
  // Update only Wascar's passwordHash
  const [result] = await connection.execute(
    'UPDATE users SET passwordHash = ? WHERE email = ? AND role = ?',
    [passwordHash, 'wascar.ortiz0410@gmail.com', 'owner']
  );
  
  console.log('Updated rows:', result.affectedRows);
  console.log('Wascar password reset successful');
} catch (error) {
  console.error('Error updating password:', error);
} finally {
  await connection.end();
}
