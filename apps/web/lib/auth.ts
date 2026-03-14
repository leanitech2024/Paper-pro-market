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

        const passwordsMatch = await compare(password, user.password);
        if (!passwordsMatch) return null;

        return user;
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
            .select({ id: users.id })
            .from(users)
            .where(eq(users.email, emailStr))
            .limit(1);

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
          } else {
            user.id = existingUser.id;
          }
        } catch (error) {
          logger.error({ err: error }, "Error in Google signIn callback");
          return false;
        }
      }
      return true;
    },

    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.id = user.id;
        if (user.role) token.role = user.role;
      }
      if (!token.id && token.sub) {
        token.id = token.sub;
      }
      return token;
    },
  },
});


