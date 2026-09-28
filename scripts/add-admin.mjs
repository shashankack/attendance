import { randomBytes, scryptSync } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";

import { neon } from "@neondatabase/serverless";

import { prepareDatabase } from "../src/lib/schema.mjs";

function loadEnvFile(file) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

function option(flag) {
  const index = process.argv.indexOf(flag);
  if (index === -1) return "";
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) return "";
  return value.trim();
}

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 32).toString("hex");
  return `${salt}:${hash}`;
}

loadEnvFile(".env.local");
loadEnvFile(".env");

const reset = process.argv.includes("--reset");
const name = option("--name") || (process.env.BAW_ADMIN_NAME ?? "").trim();
const email = (option("--email") || (process.env.BAW_ADMIN_EMAIL ?? "")).trim().toLowerCase();
const password = option("--password") || process.env.BAW_ADMIN_PASSWORD || "";

if (!email || !password || (!reset && !name)) {
  console.error('Add an admin:  npm run admin -- --name "Ada Shah" --email ada@example.com --password "a long password"');
  console.error('Reset password: npm run admin -- --reset --email ada@example.com --password "a new long password"');
  process.exit(1);
}

if (!email.includes("@") || email.startsWith("@") || email.endsWith("@")) {
  console.error("Enter a full email address.");
  process.exit(1);
}

if (password.length < 8) {
  console.error("Use a password of at least 8 characters.");
  process.exit(1);
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is missing. Add the Neon connection string to .env.local.");
  process.exit(1);
}

const sql = neon(databaseUrl);
await prepareDatabase((statement) => sql.query(statement));

const existing = await sql`SELECT id FROM users WHERE lower(email) = ${email}`;
if (reset) {
  if (existing.length === 0) {
    console.error(`${email} is not an admin.`);
    process.exit(1);
  }
  await sql`
    UPDATE users
    SET password_hash = ${hashPassword(password)},
        session_token = NULL,
        name = COALESCE(${name || null}, name)
    WHERE lower(email) = ${email}
  `;
  console.log(`Reset the password for ${email}. Sign in again at /login.`);
  process.exit(0);
}

if (existing.length > 0) {
  console.error(`${email} is already an admin. Reset it with --reset.`);
  process.exit(1);
}

await sql`
  INSERT INTO users (id, email, name, role, password_hash, session_token)
  VALUES (${crypto.randomUUID()}, ${email}, ${name}, 'ADMIN', ${hashPassword(password)}, NULL)
`;

console.log(`Added admin ${email}.`);
console.log("Sign in at /login, then set the office location with Use my location.");
