/**
 * set-password.mjs
 * Sets password, role=admin, and pro subscription for john@gmail.com
 * on both local and Neon prod DBs.
 */
import pkg from 'pg';
const { Client } = pkg;
import bcrypt from 'bcryptjs';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { randomUUID } from 'crypto';

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

const env     = loadEnv(resolve('.env.local'));
const LOCAL_DB = env.DATABASE_URL;
const PROD_DB  = env.DIRECT_URL;

const EMAIL    = 'sumanth1659@gmail.com';
const PASSWORD = '123456';
const HASH     = await bcrypt.hash(PASSWORD, 10);

function now()        { return new Date().toISOString(); }
function monthLater() { const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString(); }

async function update(label, connectionString) {
  const isNeon = connectionString.includes('neon');
  const client = new Client({ connectionString, ssl: isNeon ? { rejectUnauthorized: false } : false });
  await client.connect();
  console.log(`\n🔧  [${label}]`);

  try {
    // 1. Ensure user exists, create if not
    const { rows } = await client.query(
      `SELECT id FROM users WHERE email = $1`, [EMAIL]
    );

    let userId;
    if (rows.length > 0) {
      userId = rows[0].id;
      console.log(`   Found user: ${userId}`);
    } else {
      userId = randomUUID();
      await client.query(
        `INSERT INTO users (id, name, email, role, password, balance, "createdAt")
         VALUES ($1, 'john', $2, 'admin', $3, '1000000.00', $4)`,
        [userId, EMAIL, HASH, now()]
      );
      // Create wallet
      await client.query(
        `INSERT INTO wallets (id,"userId",balance,equity,"marginStatus","accountState","blockedBalance",currency,"lastReconciled","createdAt","updatedAt")
         VALUES ($1,$2,'1000000.00','1000000.00','NORMAL','NORMAL','0.00','INR',$3,$3,$3)`,
        [randomUUID(), userId, now()]
      );
      console.log(`   Created user: ${userId}`);
    }

    // 2. Set password + role
    await client.query(
      `UPDATE users SET password = $1, role = 'admin' WHERE id = $2`,
      [HASH, userId]
    );
    console.log(`   ✅ Password (123456) + role=admin set`);

    // 3. Upsert pro subscription
    const n = now(), m = monthLater();
    await client.query(
      `INSERT INTO subscriptions (id,"userId",plan,status,"currentPeriodStart","currentPeriodEnd","createdAt","updatedAt")
       VALUES ($1,$2,'pro','active',$3,$4,$3,$3)
       ON CONFLICT ("userId") DO UPDATE
         SET plan='pro', status='active', "currentPeriodStart"=$3, "currentPeriodEnd"=$4, "updatedAt"=$3`,
      [randomUUID(), userId, n, m]
    );
    console.log(`   ✅ Subscription → pro (active, 30 days)`);

  } finally {
    await client.end();
  }
}

(async () => {
  console.log(`📋  Setting up: ${EMAIL}  /  password: ${PASSWORD}`);
  await update('LOCAL', LOCAL_DB);
  await update('PROD (Neon)', PROD_DB);
  console.log('\n🎉  Done!\n');
})().catch(e => { console.error('❌', e.message); process.exit(1); });
