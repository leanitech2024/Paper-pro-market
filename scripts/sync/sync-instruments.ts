/**
 * Instrument Sync CLI Script (CLEAN OUTPUT VERSION)
 *
 * Usage:
 *   pnpm exec tsx scripts/sync/sync-instruments.ts
 */

import { config as loadEnv } from "dotenv";
import { existsSync } from "fs";

const envPath =
  process.env.DOTENV_CONFIG_PATH ||
  (existsSync(".env.local") ? ".env.local" : ".env");
loadEnv({ path: envPath });

const { syncInstruments } = await import(
  "../../apps/web/lib/instruments/instrument-sync.service"
);
const { db } = await import("../../apps/web/lib/db");
const { instruments } = await import("@paper-market/core/db");
const { sql } = await import("drizzle-orm");
const { logger } = await import("../../apps/web/lib/logger");

async function main() {
  console.log("\n" + "=".repeat(70));
  console.log("  INSTRUMENT SYNC - Upstox Master Data");
  console.log("=".repeat(70));
  console.log("");

  try {
    console.log("Pre-Sync Database State:\n");
    const preStats = await getInstrumentStats();
    displayStats(preStats);

    console.log("\nStarting sync...\n");
    const syncStart = Date.now();

    const heartbeat = setInterval(() => {
      const elapsed = ((Date.now() - syncStart) / 1000).toFixed(0);
      console.log(`   Still syncing... (${elapsed}s elapsed)`);
    }, 3_000);

    const originalLoggerLevel = logger.level;
    const originalConsoleLog = console.log;

    logger.level = "silent";

    console.log = (...args: any[]) => {
      if (
        typeof args[0] === "string" &&
        args[0].includes("Still syncing")
      ) {
        originalConsoleLog(...args);
      }
    };

    let report: Awaited<ReturnType<typeof syncInstruments>>;

    try {
      report = await syncInstruments();
    } finally {
      logger.level = originalLoggerLevel;
      console.log = originalConsoleLog;
      clearInterval(heartbeat);
    }

    console.log("\n" + "=".repeat(70));
    console.log("  SYNC COMPLETE");
    console.log("=".repeat(70));
    console.log("");
    console.log("Sync Report:\n");

    const total = (report.totalProcessed ?? 0).toLocaleString();
    const upserted = (report.upserted ?? 0).toLocaleString();
    const deactivated = (report.deactivated ?? 0).toLocaleString();
    const purged = (report.purged ?? 0).toLocaleString();
    const errors = (report.errors ?? 0).toLocaleString();
    const durationSec = ((report.duration ?? 0) / 1000).toFixed(2);

    console.log(`   Total Processed:  ${total}`);
    console.log(`   Upserted (Valid): ${upserted}`);
    console.log(`   Deactivated:      ${deactivated}`);
    console.log(`   Purged (Old):     ${purged}`);
    console.log(`   Skipped/Invalid:  ${errors}`);
    console.log(`   Duration:         ${durationSec}s`);
    console.log("");

    console.log("Post-Sync Database State:\n");
    const postStats = await getInstrumentStats();
    displayStats(postStats);

    console.log("\nInstruments by Segment (Active):\n");
    const segmentStats = await getSegmentStats();
    segmentStats.forEach((stat) => {
      console.log(
        `   ${(stat.segment || "Unknown").padEnd(20)}: ${Number(
          stat.count
        ).toLocaleString()}`
      );
    });

    console.log("\nValidation Checks:\n");

    const [foCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(instruments)
      .where(sql`segment = 'NSE_FO' AND "isActive" = true`);

    const foTotal = Number(foCount.count);
    console.log(`   NSE_FO: ${foTotal.toLocaleString()} instruments`);

    const [eqCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(instruments)
      .where(sql`segment = 'NSE_EQ' AND "isActive" = true`);

    const eqTotal = Number(eqCount.count);
    console.log(`   NSE_EQ: ${eqTotal.toLocaleString()} instruments`);

    console.log("\n" + "=".repeat(70));
    console.log("\nSync completed successfully!\n");

    process.exit(0);
  } catch (err: any) {
    console.error("\nSync failed:", err.message);
    console.error(err);
    console.log("");
    process.exit(1);
  }
}

async function getInstrumentStats() {
  const [total] = await db
    .select({ count: sql<number>`count(*)` })
    .from(instruments);

  const [active] = await db
    .select({ count: sql<number>`count(*)` })
    .from(instruments)
    .where(sql`"isActive" = true`);

  const [inactive] = await db
    .select({ count: sql<number>`count(*)` })
    .from(instruments)
    .where(sql`"isActive" = false`);

  return {
    total: Number(total.count),
    active: Number(active.count),
    inactive: Number(inactive.count),
  };
}

async function getSegmentStats() {
  return await db
    .select({
      segment: instruments.segment,
      count: sql<number>`count(*)`,
    })
    .from(instruments)
    .where(sql`"isActive" = true`)
    .groupBy(instruments.segment)
    .orderBy(sql`count(*) DESC`);
}

function displayStats(stats: {
  total: number;
  active: number;
  inactive: number;
}) {
  console.log(`   Total:            ${stats.total.toLocaleString()}`);
  console.log(`   Active:           ${stats.active.toLocaleString()}`);
  console.log(`   Inactive:         ${stats.inactive.toLocaleString()}`);
}

main();
