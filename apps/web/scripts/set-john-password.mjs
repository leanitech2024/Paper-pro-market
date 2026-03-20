/**
 * set-john-password.mjs — sets password 123456 for john@gmail.com on both DBs
 */
import pkg from 'pg';
const { Client } = pkg;
import bcrypt from 'bcryptjs';
import { readFileSync } from 'fs';
import { resolve } from 'path';

function loadEnv(filePath) {
  try {
    const raw = readFileSync(filePath, 'utf8');
    const env = {};
    for (const line of raw.split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const i = t.indexOf('=');
      if (i === -1) continue;
      env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
    }
    return env;
  } catch { return {}; }
}

const env = loadEnv(resolve('.env.local'));
const LOCAL_DB = env.DATABASE_URL;
const PROD_DB  = env.DIRECT_URL;

const EMAIL    = 'john@gmail.com';
const PASSWORD = '123456';
const HASH     = await bcrypt.hash(PASSWORD, 10);

async function setPassword(label, connectionString) {
  if (!connectionString) { console.warn(`⚠️  [${label}] No connection string, skipping`); return; }
  const isNeon = connectionString.includes('neon');
  const client = new Client({ connectionString, ssl: isNeon ? { rejectUnauthorized: false } : false });
  await client.connect();
  console.log(`\n🔧  [${label}]`);
  try {
    const { rowCount } = await client.query(
      `UPDATE users SET password = $1, role = 'admin' WHERE email = $2`,
      [HASH, EMAIL]
    );
    if (rowCount > 0) {
      console.log(`   ✅ Password set for ${EMAIL}`);
    } else {
      console.warn(`   ⚠️  User ${EMAIL} not found`);
    }
  } finally {
    await client.end();
  }
}

(async () => {
  console.log(`📋  Setting password for: ${EMAIL}`);
  await setPassword('LOCAL', LOCAL_DB);
  await setPassword('PROD (Neon)', PROD_DB);
  console.log('\n🎉  Done!\n');
})().catch(e => { console.error('❌', e.message); process.exit(1); });
