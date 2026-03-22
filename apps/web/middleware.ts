import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

// Define protected routes that require authentication
const PROTECTED_ROUTES = [
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
  "/admin",
];

// Define auth routes that should redirect to dashboard if already logged in
const AUTH_ROUTES = [
  "/login",
  "/signup",
  "/forgot-password",
];

// Admin auth routes should remain public for unauthenticated users
const ADMIN_AUTH_ROUTES = [
  "/admin/login",
];

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const path = nextUrl.pathname;

  // 0. Admin auth route handling
  const isAdminAuthRoute = ADMIN_AUTH_ROUTES.some(route => path.startsWith(route));
  if (isAdminAuthRoute) {
    if (!isLoggedIn) {
      return NextResponse.next();
    }

    const userRole = req.auth?.user?.role;
    if (userRole === "admin") {
      return NextResponse.redirect(new URL("/admin/dashboard", nextUrl));
    }

    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  // 1. API Route Protection (Keep existing logic)
  if (path.startsWith("/api/v1")) {
      if (!isLoggedIn) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      // Guard admin API routes — only admin role can access
      if (path.startsWith("/api/v1/admin") || path.startsWith("/api/admin")) {
          const userRole = req.auth?.user?.role;
          if (userRole !== 'admin') {
              return NextResponse.json(
                  { error: "Forbidden", code: "ADMIN_REQUIRED" },
                  { status: 403 }
              );
          }
      }

      const requestHeaders = new Headers(req.headers);
      if (req.auth?.user?.id) {
          requestHeaders.set("x-user-id", req.auth.user.id);
      }

      return NextResponse.next({
          request: {
              headers: requestHeaders,
          },
      });
  }

  // 2. Protected Routes (Redirect to login)
  const isProtectedRoute = PROTECTED_ROUTES.some(route => path.startsWith(route));
  if (isProtectedRoute && !isLoggedIn) {
    const redirectPath = path.startsWith("/admin") ? "/admin/login" : "/login";
    const redirectUrl = new URL(redirectPath, nextUrl);
    redirectUrl.searchParams.set("callbackUrl", path); // Remembers where to go back
    return NextResponse.redirect(redirectUrl);
  }

  // 3. Admin Page Guard — redirect non-admins to dashboard
  if (path.startsWith("/admin") && isLoggedIn) {
    const userRole = req.auth?.user?.role;
    if (userRole !== 'admin') {
      return NextResponse.redirect(new URL("/dashboard", nextUrl));
    }
  }

  // 3. Auth Routes (Redirect to trade/dashboard if already logged in)
  const isAuthRoute = AUTH_ROUTES.some(route => path.startsWith(route));
  if (isAuthRoute && isLoggedIn) {
    return NextResponse.redirect(new URL("/trade", nextUrl));
  }

  // 4. Onboarding Gate
  if (isLoggedIn) {
    const onboardingCompleted = req.auth?.user?.onboardingCompleted;
    const isApiRoute = path.startsWith('/api');
    const isOnboardingRoute = path.startsWith('/onboarding');
    const isOnboardingApi = path.startsWith('/api/v1/onboarding/complete');
    
    // Admins bypass onboarding
    const isAdmin = req.auth?.user?.role === 'admin';

    if (onboardingCompleted === false && !isAdmin) {
      if (!isOnboardingRoute && !isOnboardingApi && !isApiRoute) {
        return NextResponse.redirect(new URL('/onboarding', nextUrl));
      }
    }
  }

  // Allow all other routes
  return NextResponse.next();
});

export const config = {
    // Include API routes in middleware
    matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
