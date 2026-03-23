import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { eq } from "drizzle-orm";
import { LoginSchema } from "@paper-market/core";
import { db } from "@/lib/db";
import { users } from "@paper-market/core/db";
import { WalletService } from "@/services/accounting/wallet/wallet.service";
import { bootstrapUserLedgerState } from "@/services/accounting/ledger/ledger-bootstrap.service";
import { WatchlistService } from "@/services/market/catalog/watchlist.service";
import { SubscriptionService } from "@/services/subscription/subscription.service";
import { logger } from "@/lib/logger";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    ...authConfig.providers,
    Credentials({
      async authorize(credentials) {
        const validated = LoginSchema.safeParse(credentials);
        if (!validated.success) return null;

        const { email, password } = validated.data;

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

        if (!user || !user.password) return null;
        if (user.isActive === false) return null;

        const passwordsMatch = await compare(password, user.password);
        if (!passwordsMatch) return null;

        return { ...user, role: user.role ?? 'user', onboardingCompleted: user.onboardingCompleted };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,

    async signIn({ user, account, profile }) {
      if (account?.provider === "google" && profile?.email) {
        try {
          const emailStr = String(profile.email);

          const [existingUser] = await db
            .select({ id: users.id, role: users.role, isActive: users.isActive, onboardingCompleted: users.onboardingCompleted })
            .from(users)
            .where(eq(users.email, emailStr))
            .limit(1);

          if (existingUser && existingUser.isActive === false) {
            return false;
          }

          if (!existingUser) {
            // C-10 FIX: All three operations (user row, wallet, ledger accounts)
            // are now inside the same transaction. Previously INSERT INTO users
            // was outside, so any failure in wallet/ledger bootstrap left a zombie
            // user that could authenticate but had no wallet.
            const createdId = await db.transaction(async (tx) => {
              const [created] = await tx
                .insert(users)
                .values({
                  email: emailStr,
                  name: profile.name ? String(profile.name) : "User",
                  image: profile.image ? String(profile.image) : null,
                  balance: "1000000.00",
                })
                .returning({ id: users.id });

              await WalletService.createWallet(created.id, tx);
              await bootstrapUserLedgerState(created.id, tx);
              await SubscriptionService.createTrialSubscription(created.id, tx);

              return created.id;
            });

            // Watchlist creation is best-effort and intentionally outside the
            // transaction — a watchlist failure must not roll back the user account.
            try {
              await WatchlistService.ensureDefaultWatchlist(createdId);
            } catch (error) {
              logger.warn(
                { err: error, userId: createdId },
                "Failed to create default watchlist during Google sign-in"
              );
            }

            user.id = createdId;
            user.role = 'user'; // New users default to 'user' role
            user.onboardingCompleted = false;
          } else {
            user.id = existingUser.id;
            user.role = existingUser.role ?? 'user';
            user.onboardingCompleted = existingUser.onboardingCompleted;
          }
        } catch (error) {
          logger.error({ err: error }, "Error in Google signIn callback");
          return false;
        }
      }
      return true;
    },

    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.sub = user.id;
        token.id = user.id;
        if (user.role) token.role = user.role;
        token.onboardingCompleted = user.onboardingCompleted ?? false;
      }
      if (trigger === "update" && session) {
        const sessionUser = (session as any).user ?? session;
        if (sessionUser?.id) {
          token.sub = sessionUser.id;
          token.id = sessionUser.id;
        }
        if (sessionUser?.role) token.role = sessionUser.role;
        if (sessionUser?.onboardingCompleted !== undefined) {
          token.onboardingCompleted = sessionUser.onboardingCompleted;
        }
        if (sessionUser?.subscriptionStatus !== undefined) {
          token.subscriptionStatus = sessionUser.subscriptionStatus;
        }
        if (sessionUser?.plan !== undefined) {
          token.plan = sessionUser.plan;
        }
      }
      if (!token.id && token.sub) {
        token.id = token.sub;
      }

      if (token.id) {
        const tokenAge = Date.now() - ((token.subscriptionCheckedAt as number) ?? 0);
        if (!token.subscriptionStatus || trigger === "update" || tokenAge > 3600_000) {
          try {
            const sub = await SubscriptionService.getEffectivePlan(token.id);
            token.subscriptionStatus = sub.status;
            token.plan = sub.plan;
            token.subscriptionCheckedAt = Date.now();
          } catch (error) {
            logger.error({ err: error, userId: token.id }, "Failed to fetch subscription status for JWT");
            token.subscriptionStatus = token.subscriptionStatus || "unknown";
          }
        }
      }

      return token;
    },
  },
});
