/**
 * seed-admin.mjs — Applies schema DDL + seeds admin users on both DBs
 */

import pkg from 'pg';
const { Client } = pkg;
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

const env = loadEnv(resolve('.env.local'));
const LOCAL_DB = env.DATABASE_URL;
const PROD_DB  = env.DIRECT_URL;

if (!LOCAL_DB) { console.error('❌ DATABASE_URL missing'); process.exit(1); }
if (!PROD_DB)  { console.error('❌ DIRECT_URL missing');   process.exit(1); }

const ADMIN_EMAILS = ['john@gmail.com', 'sumanth1659@gmail.com'];
const now = () => new Date().toISOString();
const monthLater = () => { const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString(); };

async function run(client, sql, params = []) {
  try { await client.query(sql, params); }
  catch (e) { console.warn(`   ⚠️  ${e.message.split('\n')[0]}`); }
}

async function seedDb(label, connectionString) {
  const isNeon = connectionString.includes('neon');
  console.log(`\n🔧  [${label}]`);
  const client = new Client({ connectionString, ssl: isNeon ? { rejectUnauthorized: false } : false });
  await client.connect();

  try {
    // ── 0. Apply DDL (idempotent) ─────────────────────────────────────────────
    console.log('   Applying schema changes...');
    // Add role to users if missing
    await run(client, `ALTER TABLE users ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user'`);

    // Create enums if missing (pg won't let CREATE TYPE IF NOT EXISTS, so use DO block)
    await run(client, `
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_plan') THEN
          CREATE TYPE subscription_plan AS ENUM ('free_trial','basic','pro');
        END IF;
      END $$
    `);
    await run(client, `
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_status') THEN
          CREATE TYPE subscription_status AS ENUM ('active','expired','cancelled');
        END IF;
      END $$
    `);
    // Create subscriptions table if missing
    await run(client, `
      CREATE TABLE IF NOT EXISTS subscriptions (
        id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId"            text NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
        plan                subscription_plan NOT NULL DEFAULT 'free_trial',
        status              subscription_status NOT NULL DEFAULT 'active',
        "trialStartDate"    timestamptz,
        "trialEndDate"      timestamptz,
        "currentPeriodStart" timestamptz,
        "currentPeriodEnd"  timestamptz,
        "createdAt"         timestamptz NOT NULL DEFAULT now(),
        "updatedAt"         timestamptz NOT NULL DEFAULT now()
      )
    `);
    console.log('   ✅ Schema up to date');

    // ── 1. Wipe data in FK order ──────────────────────────────────────────────
    console.log('   ⏳ Clearing data...');
    const tables = [
      'write_ahead_journal', 'ledger_entries', 'ledger_account_balances',
      'ledger_accounts', 'trades', 'orders', 'positions', 'transactions',
      'wallets', 'watchlist_items', 'watchlists', 'subscriptions',
      'session', 'account', '"verificationToken"', 'upstox_tokens', 'users',
    ];
    for (const t of tables) await run(client, `DELETE FROM ${t}`);
    console.log('   ✅ Cleared');

    // ── 2. Insert admin+pro users ─────────────────────────────────────────────
    for (const email of ADMIN_EMAILS) {
      const userId   = randomUUID();
      const walletId = randomUUID();
      const n = now(), m = monthLater();

      await client.query(
        `INSERT INTO users (id, name, email, role, balance, "createdAt")
         VALUES ($1,$2,$3,'admin','1000000.00',$4)`,
        [userId, email.split('@')[0], email, n]
      );
      await client.query(
        `INSERT INTO wallets (
           id,"userId",balance,equity,"marginStatus","accountState",
           "blockedBalance",currency,"lastReconciled","createdAt","updatedAt"
         ) VALUES ($1,$2,'1000000.00','1000000.00','NORMAL','NORMAL','0.00','INR',$3,$3,$3)`,
        [walletId, userId, n]
      );
      await client.query(
        `INSERT INTO subscriptions (
           id,"userId",plan,status,"currentPeriodStart","currentPeriodEnd","createdAt","updatedAt"
         ) VALUES ($1,$2,'pro','active',$3,$4,$3,$3)`,
        [randomUUID(), userId, n, m]
      );
      console.log(`   ✅ ${email}  →  admin + pro  (id: ${userId})`);
    }
  } finally {
    await client.end();
  }
}

(async () => {
  console.log('📋  Emails:', ADMIN_EMAILS.join(', '));
  await seedDb('LOCAL (postgres)', LOCAL_DB);
  await seedDb('PROD  (Neon)',     PROD_DB);
  console.log('\n🎉  Done!\n');
})().catch(e => { console.error('\n❌', e.message); process.exit(1); });
