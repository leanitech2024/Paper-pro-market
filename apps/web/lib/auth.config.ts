import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import { config as appConfig } from "@/lib/config";

// This file must be Edge-compatible (no database adapters here!)
export const authConfig = {
    providers: [
        Google({
            clientId: appConfig.auth.google.clientId,
            clientSecret: appConfig.auth.google.clientSecret,
        }),
    ],
    // Force JWT strategy for performance and Edge compatibility
    session: {
        strategy: "jwt",
    },
    secret: appConfig.auth.secret,
    trustHost: true,
    // Let Auth.js v5 use its default cookie names to avoid version conflicts
    pages: {
        signIn: "/login",
    },
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user;
            const isOnAuth =
                nextUrl.pathname.startsWith("/login") ||
                nextUrl.pathname.startsWith("/signup") ||
                nextUrl.pathname.startsWith("/admin/login");

            // Define all protected routes (requires authentication)
            const protectedRoutes = [
                "/dashboard",
                "/profile",
                "/trade",
                "/wallet",
                "/orders",
                "/positions",
                "/analytics",
                "/watchlist",
                "/journal",
                "/settings",
            ];

            // Allow public access to admin login
            if (isOnAuth && nextUrl.pathname.startsWith("/admin/login")) {
                return true;
            }

            const isProtectedRoute = protectedRoutes.some(route =>
                nextUrl.pathname.startsWith(route)
            );

            // Protect authenticated routes
            if (isProtectedRoute) {
                if (isLoggedIn) return true;
                return false; // Redirect to login
            }

            return true;
        },
        async session({ session, token }) {
            if (session.user) {
                const tokenId = token.id || token.sub;
                if (tokenId) {
                    session.user.id = tokenId as string;
                }
                if (token.role) {
                    session.user.role = token.role as string;
                }
                if (token.onboardingCompleted !== undefined) {
                    session.user.onboardingCompleted = token.onboardingCompleted as boolean;
                }
                if (token.subscriptionStatus !== undefined) {
                    session.user.subscriptionStatus = token.subscriptionStatus as string;
                }
                if (token.subscriptionCheckedAt !== undefined) {
                    session.user.subscriptionCheckedAt = token.subscriptionCheckedAt as number;
                }
                if (token.plan !== undefined) {
                    session.user.plan = token.plan as string;
                }
            }
            return session;
        },
        async jwt({ token, user, trigger, session }) {
            if (user) {
                if (user.id) {
                    token.sub = user.id;
                    token.id = user.id;
                }
                if (user.role) {
                    token.role = user.role;
                }
                token.onboardingCompleted = user.onboardingCompleted ?? false;
                if (user.subscriptionStatus !== undefined) {
                    token.subscriptionStatus = user.subscriptionStatus;
                }
                if (user.subscriptionCheckedAt !== undefined) {
                    token.subscriptionCheckedAt = user.subscriptionCheckedAt;
                }
                if (user.plan !== undefined) {
                    token.plan = user.plan;
                }
            } else if (!token.id && token.sub) {
                token.id = token.sub;
            }

            // Handle session.update() calls — merge updated fields into the JWT.
            // This is the critical fix: auth.config.ts is used by the middleware
            // (Edge runtime). Without this block, update({ onboardingCompleted: true })
            // never propagates to the JWT cookie the middleware reads, causing an
            // infinite redirect loop where the middleware always sees stale false.
            if (trigger === "update" && session) {
                const patch = (session as any).user ?? session;
                if (patch?.onboardingCompleted !== undefined) {
                    token.onboardingCompleted = patch.onboardingCompleted;
                }
                if (patch?.subscriptionStatus !== undefined) {
                    token.subscriptionStatus = patch.subscriptionStatus;
                }
                if (patch?.plan !== undefined) {
                    token.plan = patch.plan;
                }
                if (patch?.role !== undefined) {
                    token.role = patch.role;
                }
            }

            return token;
        },
    },
} satisfies NextAuthConfig;
