import { createDb, users, subscriptions, wallets } from "@paper-market/core/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { config as loadEnv } from "dotenv";
import { existsSync } from "fs";
import { logger } from "./lib/logger";

// Load envs since we run from outside Next.js
const envPath =
  process.env.DOTENV_CONFIG_PATH ||
  (existsSync(".env.local") ? ".env.local" : ".env");
loadEnv({ path: envPath });

const { db, pool } = createDb(process.env.DATABASE_URL!);

const EMAIL = "john@gmail.com";
const PASSWORD = process.env.SEED_ADMIN_PASSWORD as string;
if (!PASSWORD) {
  logger.error("SEED_ADMIN_PASSWORD env var is required");
  process.exit(1);
}

async function main() {
  try {
    logger.info(`Ensuring admin user ${EMAIL}...`);
    const hashedPassword = await bcrypt.hash(PASSWORD, 10);

    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, EMAIL))
      .limit(1);

    let userId: string;
    if (existing) {
      userId = existing.id;
      await db
        .update(users)
        .set({ password: hashedPassword, role: "admin" })
        .where(eq(users.id, userId));
      logger.info({ userId }, "Updated user");
    } else {
      const [created] = await db
        .insert(users)
        .values({
          name: "John Admin",
          email: EMAIL,
          password: hashedPassword,
          role: "admin",
          balance: "1000000.00",
        })
        .returning({ id: users.id });
      userId = created.id;
      logger.info({ userId }, "Created user");
    }

    const [wallet] = await db
      .select({ id: wallets.id })
      .from(wallets)
      .where(eq(wallets.userId, userId))
      .limit(1);
    if (!wallet) {
      await db.insert(wallets).values({ userId });
      logger.info("Wallet created.");
    }

    logger.info("Upserting PRO subscription...");
    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    await db
      .insert(subscriptions)
      .values({
        userId,
        plan: "pro",
        status: "active",
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: subscriptions.userId,
        set: {
          plan: "pro",
          status: "active",
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          updatedAt: now,
        },
      });
    logger.info("PRO subscription set.");
    
    logger.info("Done database updates.");
  } catch (err) {
    logger.error({ err }, "Error setting up user");
  } finally {
    await pool.end();
  }
}

main();
