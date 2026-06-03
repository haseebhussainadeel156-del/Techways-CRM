import 'dotenv/config';
import bcrypt from 'bcryptjs';
import readline from 'readline-sync';
import { getPool } from './server/db.js';
import { v4 as uuidv4 } from 'uuid';

async function main() {
  console.log("--- Nexus ISP: Robust Admin Creation Wizard ---");

  const username = readline.question("Username: ");
  const name = readline.question("Full Name: ");
  let email = readline.question("Email Address: ");
  const cnic = readline.question("CNIC: ");
  const phone = readline.question("Phone Number: ");
  const location = readline.question("Location: ");
  const address = readline.question("Address: ");
  const joiningDate = readline.question("Joining Date (YYYY-MM-DD): ");

  let password = "";
  while (true) {
    password = readline.question("Password: ", { hideEchoBack: true });
    const confirm = readline.question("Confirm Password: ", { hideEchoBack: true });
    
    // Simple robust check: length
    if (password.length < 8) {
        console.log("Password must be at least 8 characters long.");
        continue;
    }
    
    if (password !== confirm) {
        console.log("Passwords do not match. Try again.");
        continue;
    }
    break;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const adminId = `adm-${uuidv4().substring(0, 8)}`;

  const pool = getPool();
  if (!pool) {
      console.error("Database connection failed. Check your .env setup first.");
      process.exit(1);
  }

  try {
    const client = await pool.connect();
    await client.query(
        "INSERT INTO admins (id, username, email, password_hash, name, cnic, phone, location, address, joining_date) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
        [adminId, username, email, passwordHash, name, cnic, phone, location, address, joiningDate]
    );
    client.release();
    console.log(`Successfully created admin: ${username} (ID: ${adminId})`);
  } catch (err) {
      console.error("Failed to create admin:", err);
      process.exit(1);
  }
}

main();
