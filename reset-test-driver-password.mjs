import bcryptjs from 'bcryptjs';

// Temporary QA password for test.driver
const tempPassword = 'TestDriver123!';

// Generate hash with 10 salt rounds
async function generateHash() {
  const hash = await bcryptjs.hash(tempPassword, 10);
  console.log('Generated bcrypt hash:');
  console.log(hash);
  console.log('\nSQL UPDATE statement:');
  console.log(`UPDATE users SET passwordHash = '${hash}' WHERE email = 'test.driver@wvtransports.com';`);
}

generateHash().catch(console.error);
