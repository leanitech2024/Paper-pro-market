import "dotenv/config";
import { createDb, users, subscriptions, wallets } from "@paper-market/core/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

// Force load envs since we run from outside Next.js
import { config } from "dotenv";
config({ path: ".env.local" });

const { db, pool } = createDb(process.env.DATABASE_URL!);

const EMAIL = "john@gmail.com";
const PASSWORD = "123456";

async function main() {
  try {
    console.log(`Ensuring admin user ${EMAIL}...`);
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
      console.log("Updated user:", userId);
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
      console.log("Created user:", userId);
    }

    const [wallet] = await db
      .select({ id: wallets.id })
      .from(wallets)
      .where(eq(wallets.userId, userId))
      .limit(1);
    if (!wallet) {
      await db.insert(wallets).values({ userId });
      console.log("Wallet created.");
    }

    console.log("Upserting PRO subscription...");
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
    console.log("PRO subscription set.");
    
    console.log("Done database updates.");
  } catch (err) {
    console.error("Error setting up user:", err);
  } finally {
    await pool.end();
  }
}

main();
