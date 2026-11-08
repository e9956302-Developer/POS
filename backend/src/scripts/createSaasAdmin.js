import bcrypt from "bcryptjs";
import { query } from "../db/pool.js";

/**
 * Script to create or update a SaaS Platform Super Admin (role: top_admin).
 *
 * Usage:
 *   node src/scripts/createSaasAdmin.js [email] [password] [fullName]
 *
 * Defaults:
 *   email: e9956302@gmail.com
 *   password: admin123
 *   fullName: SaaS Platform Administrator
 */
async function main() {
  const emailArg = process.argv[2] || "e9956302@gmail.com";
  const passwordArg = process.argv[3] || "admin123";
  const nameArg = process.argv[4] || "SaaS Platform Administrator";

  const cleanEmail = emailArg.trim().toLowerCase();
  console.log(`\n======================================================`);
  console.log(` Registering SaaS Platform Super Admin (top_admin)`);
  console.log(` Email:    ${cleanEmail}`);
  console.log(` Name:     ${nameArg}`);
  console.log(` Password: ${passwordArg}`);
  console.log(`======================================================\n`);

  // 1. Verify 'top_admin' role exists
  const [role] = await query("SELECT id, name FROM roles WHERE name = 'top_admin' LIMIT 1");
  if (!role) {
    console.error("❌ Error: 'top_admin' role not found in roles table!");
    process.exit(1);
  }

  // 2. Hash the password
  const passwordHash = await bcrypt.hash(passwordArg, 10);

  // 3. Check if user already exists
  const [existingUser] = await query("SELECT id, email, role_id, full_name, is_active FROM users WHERE LOWER(email) = ?", [cleanEmail]);

  if (existingUser) {
    console.log(`ℹ Found existing user (ID: ${existingUser.id}, Name: "${existingUser.full_name}"). Upgrading/updating to SaaS Top Admin...`);
    await query(
      `UPDATE users 
       SET role_id = ?, business_id = NULL, branch_id = NULL, full_name = ?, password_hash = ?, is_active = 1, mfa_enabled = 1, mfa_secret = 'JBSWY3DPEHPK3PXP', failed_login_attempts = 0, locked_until = NULL
       WHERE id = ?`,
      [role.id, nameArg, passwordHash, existingUser.id]
    );
    console.log(`✔ User '${cleanEmail}' updated successfully as SaaS Platform Super Admin (ID: ${existingUser.id})!`);
  } else {
    const result = await query(
      `INSERT INTO users (business_id, role_id, branch_id, full_name, email, password_hash, is_active, mfa_enabled, mfa_secret, is_break_glass, must_change_password)
       VALUES (NULL, ?, NULL, ?, ?, ?, 1, 1, 'JBSWY3DPEHPK3PXP', 0, 0)`,
      [role.id, nameArg, cleanEmail, passwordHash]
    );
    console.log(`✔ New SaaS Platform Super Admin registered successfully with ID: ${result.insertId}!`);
  }

  console.log(`\n🎉 You can now log into the SaaS Portal with:`);
  console.log(`   Email:    ${cleanEmail}`);
  console.log(`   Password: ${passwordArg}`);
  console.log(`   Role:     SaaS Top Admin (Full Master Platform Access)\n`);

  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Fatal error creating SaaS admin:", err);
  process.exit(1);
});
