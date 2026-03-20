/**
 * setup.mjs — Upserts NSE equity instruments + creates default watchlist per user
 *
 * Run: node scripts/setup.mjs
 * Requires: .env.local with DATABASE_URL and DIRECT_URL
 */
import pkg from 'pg';
const { Client } = pkg;
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { randomUUID } from 'crypto';

// ── ENV loading ────────────────────────────────────────────────────────────────
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

// ── Nifty 50 Equities (instrument_token format: NSE_EQ|<SYMBOL>) ──────────────
const NIFTY50_EQUITIES = [
  { symbol: 'RELIANCE',   name: 'Reliance Industries Ltd',    lotSize: 1 },
  { symbol: 'TCS',        name: 'Tata Consultancy Services',  lotSize: 1 },
  { symbol: 'INFY',       name: 'Infosys Ltd',                lotSize: 1 },
  { symbol: 'HDFCBANK',   name: 'HDFC Bank Ltd',              lotSize: 1 },
  { symbol: 'ICICIBANK',  name: 'ICICI Bank Ltd',             lotSize: 1 },
  { symbol: 'HINDUNILVR', name: 'Hindustan Unilever Ltd',     lotSize: 1 },
  { symbol: 'SBIN',       name: 'State Bank of India',        lotSize: 1 },
  { symbol: 'BAJFINANCE', name: 'Bajaj Finance Ltd',          lotSize: 1 },
  { symbol: 'AXISBANK',   name: 'Axis Bank Ltd',              lotSize: 1 },
  { symbol: 'LT',         name: 'Larsen & Toubro Ltd',        lotSize: 1 },
  { symbol: 'KOTAKBANK',  name: 'Kotak Mahindra Bank Ltd',    lotSize: 1 },
  { symbol: 'HCLTECH',    name: 'HCL Technologies Ltd',       lotSize: 1 },
  { symbol: 'WIPRO',      name: 'Wipro Ltd',                  lotSize: 1 },
  { symbol: 'TECHM',      name: 'Tech Mahindra Ltd',          lotSize: 1 },
  { symbol: 'ASIANPAINT', name: 'Asian Paints Ltd',           lotSize: 1 },
  { symbol: 'MARUTI',     name: 'Maruti Suzuki India Ltd',    lotSize: 1 },
  { symbol: 'TITAN',      name: 'Titan Company Ltd',          lotSize: 1 },
  { symbol: 'SUNPHARMA',  name: 'Sun Pharmaceutical Ind Ltd', lotSize: 1 },
  { symbol: 'ONGC',       name: 'Oil & Natural Gas Corp Ltd', lotSize: 1 },
  { symbol: 'NESTLEIND',  name: 'Nestle India Ltd',           lotSize: 1 },
  { symbol: 'POWERGRID',  name: 'Power Grid Corp of India',   lotSize: 1 },
  { symbol: 'NTPC',       name: 'NTPC Ltd',                   lotSize: 1 },
  { symbol: 'COALINDIA',  name: 'Coal India Ltd',             lotSize: 1 },
  { symbol: 'ADANIENT',   name: 'Adani Enterprises Ltd',      lotSize: 1 },
  { symbol: 'ADANIPORTS', name: 'Adani Ports & SEZ Ltd',      lotSize: 1 },
  { symbol: 'TATAMOTORS', name: 'Tata Motors Ltd',            lotSize: 1 },
  { symbol: 'TATASTEEL',  name: 'Tata Steel Ltd',             lotSize: 1 },
  { symbol: 'JSWSTEEL',   name: 'JSW Steel Ltd',              lotSize: 1 },
  { symbol: 'HINDALCO',   name: 'Hindalco Industries Ltd',    lotSize: 1 },
  { symbol: 'GRASIM',     name: 'Grasim Industries Ltd',      lotSize: 1 },
  { symbol: 'ULTRACEMCO', name: 'UltraTech Cement Ltd',       lotSize: 1 },
  { symbol: 'M&M',        name: 'Mahindra & Mahindra Ltd',    lotSize: 1 },
  { symbol: 'DRREDDY',    name: 'Dr. Reddy\'s Laboratories',  lotSize: 1 },
  { symbol: 'CIPLA',      name: 'Cipla Ltd',                  lotSize: 1 },
  { symbol: 'DIVISLAB',   name: 'Divi\'s Laboratories Ltd',   lotSize: 1 },
  { symbol: 'BRITANNIA',  name: 'Britannia Industries Ltd',   lotSize: 1 },
  { symbol: 'APOLLOHOSP', name: 'Apollo Hospitals Enterprise',lotSize: 1 },
  { symbol: 'BAJAJ-AUTO', name: 'Bajaj Auto Ltd',             lotSize: 1 },
  { symbol: 'BAJAJFINSV', name: 'Bajaj Finserv Ltd',          lotSize: 1 },
  { symbol: 'EICHERMOT',  name: 'Eicher Motors Ltd',          lotSize: 1 },
  { symbol: 'HEROMOTOCO', name: 'Hero MotoCorp Ltd',          lotSize: 1 },
  { symbol: 'SHRIRAMFIN', name: 'Shriram Finance Ltd',        lotSize: 1 },
  { symbol: 'TRENT',      name: 'Trent Ltd',                  lotSize: 1 },
  { symbol: 'BEL',        name: 'Bharat Electronics Ltd',     lotSize: 1 },
  { symbol: 'BPCL',       name: 'Bharat Petroleum Corp Ltd',  lotSize: 1 },
  { symbol: 'VEDL',       name: 'Vedanta Ltd',                lotSize: 1 },
  { symbol: 'HDFCLIFE',   name: 'HDFC Life Insurance Co',     lotSize: 1 },
  { symbol: 'SBILIFE',    name: 'SBI Life Insurance Co',      lotSize: 1 },
  { symbol: 'INDUSINDBK', name: 'IndusInd Bank Ltd',          lotSize: 1 },
  { symbol: 'ITC',        name: 'ITC Ltd',                    lotSize: 1 },
];

// Indices
const INDICES = [
  { token: 'NSE_INDEX|Nifty 50',         symbol: 'NIFTY 50',        name: 'NIFTY 50',        lotSize: 75,  type: 'INDEX' },
  { token: 'NSE_INDEX|Nifty Bank',       symbol: 'NIFTY BANK',      name: 'NIFTY BANK',      lotSize: 30,  type: 'INDEX' },
  { token: 'NSE_INDEX|Nifty Fin Service',symbol: 'NIFTY FIN SERVICE',name: 'NIFTY FIN SERVICE',lotSize: 65, type: 'INDEX' },
  { token: 'NSE_INDEX|Nifty Midcap 100', symbol: 'NIFTY MIDCAP 100',name: 'NIFTY MIDCAP 100',lotSize: 1,  type: 'INDEX' },
];

// Default watchlist contents — first 10 Nifty50 stocks
const DEFAULT_WATCHLIST_SYMBOLS = [
  'RELIANCE','TCS','INFY','HDFCBANK','ICICIBANK',
  'SBIN','AXISBANK','LT','KOTAKBANK','ITC',
];

async function setup(label, connectionString) {
  if (!connectionString) { console.warn(`⚠️  [${label}] No connection string, skipping`); return; }
  const isNeon = connectionString.includes('neon');
  const client = new Client({ connectionString, ssl: isNeon ? { rejectUnauthorized: false } : false });
  await client.connect();
  console.log(`\n🔧  [${label}]`);

  try {
    // ── 1. Upsert equity instruments ────────────────────────────────────────────
    console.log('   ⏳ Upserting instruments...');
    let upserted = 0;

    for (const eq of NIFTY50_EQUITIES) {
      const token = `NSE_EQ|${eq.symbol}`;
      await client.query(`
        INSERT INTO instruments (
          "instrumentToken","exchangeToken","tradingsymbol","name",
          expiry,strike,"tickSize","lotSize","instrumentType",segment,exchange,"isActive","updatedAt"
        ) VALUES ($1,$2,$3,$4,NULL,NULL,'0.05',$5,'EQUITY','NSE_EQ','NSE',true,NOW())
        ON CONFLICT ("instrumentToken") DO UPDATE SET
          "tradingsymbol"=EXCLUDED."tradingsymbol","name"=EXCLUDED."name",
          "tickSize"=EXCLUDED."tickSize","lotSize"=EXCLUDED."lotSize",
          "instrumentType"=EXCLUDED."instrumentType","isActive"=true,"updatedAt"=NOW()
      `, [token, eq.symbol, eq.symbol, eq.name, eq.lotSize]);
      upserted++;
    }

    for (const idx of INDICES) {
      await client.query(`
        INSERT INTO instruments (
          "instrumentToken","exchangeToken","tradingsymbol","name",
          expiry,strike,"tickSize","lotSize","instrumentType",segment,exchange,"isActive","updatedAt"
        ) VALUES ($1,$2,$3,$4,NULL,NULL,'0.05',$5,$6,'NSE_EQ','NSE',true,NOW())
        ON CONFLICT ("instrumentToken") DO UPDATE SET
          "tradingsymbol"=EXCLUDED."tradingsymbol","name"=EXCLUDED."name",
          "lotSize"=EXCLUDED."lotSize","instrumentType"=EXCLUDED."instrumentType",
          "isActive"=true,"updatedAt"=NOW()
      `, [idx.token, idx.symbol, idx.symbol, idx.name, idx.lotSize, idx.type]);
      upserted++;
    }
    console.log(`   ✅ ${upserted} instruments upserted (${NIFTY50_EQUITIES.length} equities + ${INDICES.length} indices)`);

    // ── 2. Create default watchlist per user ────────────────────────────────────
    console.log('   ⏳ Creating default watchlists...');
    const { rows: users } = await client.query(`SELECT id FROM users`);

    for (const user of users) {
      // Check if user already has a default watchlist
      const { rows: existing } = await client.query(
        `SELECT id FROM watchlists WHERE "userId"=$1 AND "isDefault"=true`, [user.id]
      );

      let watchlistId;
      if (existing.length > 0) {
        watchlistId = existing[0].id;
        console.log(`   ℹ️  User ${user.id}: default watchlist already exists`);
      } else {
        watchlistId = randomUUID();
        await client.query(`
          INSERT INTO watchlists (id,"userId",name,"isDefault","maxItems","createdAt","updatedAt")
          VALUES ($1,$2,'My Watchlist',true,30,NOW(),NOW())
        `, [watchlistId, user.id]);
        console.log(`   ✅ Created default watchlist for user ${user.id}`);
      }

      // Add default symbols to the watchlist
      let added = 0;
      for (const symbol of DEFAULT_WATCHLIST_SYMBOLS) {
        const token = `NSE_EQ|${symbol}`;
        try {
          await client.query(`
            INSERT INTO watchlist_items (id,"watchlistId","instrumentToken","addedAt")
            VALUES ($1,$2,$3,NOW())
            ON CONFLICT ("watchlistId","instrumentToken") DO NOTHING
          `, [randomUUID(), watchlistId, token]);
          added++;
        } catch (e) {
          // Silently skip if instrument doesn't exist (shouldn't happen after step 1)
        }
      }
      if (added > 0) console.log(`   ✅ Added ${added} instruments to watchlist`);
    }

    console.log(`   ✅ Default watchlists done for ${users.length} user(s)`);
  } finally {
    await client.end();
  }
}

(async () => {
  console.log('🚀  Paper Market — Instrument Sync + Default Watchlist Setup');
  console.log(`   Equities: ${NIFTY50_EQUITIES.length}  |  Indices: ${INDICES.length}`);
  await setup('LOCAL (postgres)', LOCAL_DB);
  await setup('PROD  (Neon)',     PROD_DB);
  console.log('\n🎉  Done!\n');
})().catch(e => { console.error('\n❌', e.message); process.exit(1); });
