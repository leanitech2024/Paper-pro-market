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

        // Load subscription ONCE at login — stored in JWT, updated via session.update()
        let subscriptionStatus: string = "unknown";
        let plan: string = "free_trial";
        try {
          const sub = await SubscriptionService.getEffectivePlan(user.id);
          subscriptionStatus = sub.status;
          plan = sub.plan;
        } catch {
          // Non-fatal — defaults applied
        }

        return {
          ...user,
          role: user.role ?? "user",
          onboardingCompleted: user.onboardingCompleted,
          subscriptionStatus,
          plan,
        };
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

            try {
              await WatchlistService.ensureDefaultWatchlist(createdId);
            } catch (err) {
              logger.warn(
                { err: err, userId: createdId },
                "Failed to create default watchlist during Google sign-in"
              );
            }

            user.id = createdId;
            user.role = "user";
            user.onboardingCompleted = false;
            user.subscriptionStatus = "active"; // New users get free trial
            user.plan = "free_trial";
          } else {
            user.id = existingUser.id;
            user.role = existingUser.role ?? "user";
            user.onboardingCompleted = existingUser.onboardingCompleted;

            // Load subscription for returning Google users
            try {
              const sub = await SubscriptionService.getEffectivePlan(existingUser.id);
              user.subscriptionStatus = sub.status;
              user.plan = sub.plan;
            } catch {
              user.subscriptionStatus = "unknown";
              user.plan = "free_trial";
            }
          }
        } catch (err) {
          logger.error({ err: err }, "Error in Google signIn callback");
          return false;
        }
      }
      return true;
    },

    // JWT callback: ZERO DB calls. Pure token manipulation.
    // Subscription + onboarding status set ONCE at sign-in.
    // Updated only via session.update() calls from the client.
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.sub = user.id;
        token.id = user.id;
        token.role = user.role;
        token.onboardingCompleted = user.onboardingCompleted ?? false;
        token.subscriptionStatus = user.subscriptionStatus;
        token.plan = user.plan;
      }

      if (!token.id && token.sub) {
        token.id = token.sub;
      }

      if (trigger === "update" && session) {
        const patch = (session as { user?: Record<string, unknown> } & Record<string, unknown>).user ?? session;
        if (patch?.onboardingCompleted !== undefined) {
          token.onboardingCompleted = patch.onboardingCompleted as boolean;
        }
        if (patch?.subscriptionStatus !== undefined) {
          token.subscriptionStatus = patch.subscriptionStatus as string;
        }
        if (patch?.plan !== undefined) {
          token.plan = patch.plan as string;
        }
        if (patch?.role !== undefined) {
          token.role = patch.role as string;
        }
      }

      return token;
    },
  },
});
