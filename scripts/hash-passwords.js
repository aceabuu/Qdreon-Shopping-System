/**
 * scripts/hash-passwords.js
 * Run ONCE after importing the seed to set real bcrypt passwords.
 * Usage: node scripts/hash-passwords.js
 */
require('dotenv').config({ path: '../.env' });
const bcrypt = require('bcryptjs');
const db = require('../config/database');

const accounts = [
  { email: 'admin@qdreon.com',       password: 'admin123' },
  { email: '24105121@usc.edu.ph',    password: 'lance123' },
  { email: '24100644@usc.edu.ph',    password: 'zhen123' },
  { email: '24103744@usc.edu.ph',    password: 'sancho123' },
  { email: '22101315@usc.edu.ph',    password: 'andre123' },
  { email: '23104688@usc.edu.ph',    password: 'kyle123' },
];

(async () => {
  console.log('Hashing passwords...\n');
  for (const acc of accounts) {
    const hash = await bcrypt.hash(acc.password, 10);
    await db.execute('UPDATE users SET password_hash = ? WHERE email = ?', [hash, acc.email]);
    console.log(`✅  ${acc.email}  →  hashed`);
  }
  console.log('\nAll passwords updated.');
  process.exit(0);
})();
