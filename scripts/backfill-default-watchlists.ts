/**
 * Backfill default watchlists for all users.
 *
 * Usage:
 *   npx tsx scripts/backfill-default-watchlists.ts
 *   ENV_FILE=.env.production npx tsx scripts/backfill-default-watchlists.ts
 */

import { config as loadEnv } from "dotenv";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function resolveRepoRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
}

function loadEnvFromCandidates() {
  const repoRoot = resolveRepoRoot();
  const candidates = [
    process.env.ENV_FILE,
    process.env.DOTENV_CONFIG_PATH,
    // path.join(repoRoot, ".env.local"),
    path.join(repoRoot, ".env.production"),
    path.join(repoRoot, "apps", "web", ".env.local"),
    path.join(repoRoot, ".env"),
  ].filter(Boolean) as string[];

  for (const envPath of candidates) {
    if (existsSync(envPath)) {
      loadEnv({ path: envPath });
      console.log(`Loaded env: ${envPath}`);
      return;
    }
  }
}

loadEnvFromCandidates();

const { db } = await import("../apps/web/lib/db");
const { users } = await import("@paper-market/core/db");
const { WatchlistService } = await import(
  "../apps/web/services/market/catalog/watchlist.service"
);
const { asc } = await import("drizzle-orm");

async function main() {
  const batchSize = 200;
  let offset = 0;
  let processed = 0;
  let ensured = 0;
  let failed = 0;

  console.log("Backfilling default watchlists for all users...");

  while (true) {
    const batch = await db
      .select({ id: users.id })
      .from(users)
      .orderBy(asc(users.id))
      .limit(batchSize)
      .offset(offset);

    if (batch.length === 0) break;

    for (const user of batch) {
      processed += 1;
      try {
        await WatchlistService.ensureDefaultWatchlist(user.id);
        ensured += 1;
      } catch (_) {
        failed += 1;
        console.error(`Failed for user ${user.id}:`, error);
      }
    }

    offset += batch.length;
  }

  console.log(
    `Done. processed=${processed} ensured=${ensured} failed=${failed}`
  );
}

main().catch((error) => {
  console.error("Backfill failed:", error);
  process.exit(1);
});
