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
  const fetchDest = req.headers.get("sec-fetch-dest");
  const isDocumentNavigation = !fetchDest || fetchDest === "document";

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
      // Razorpay callback: browser is redirected here by Razorpay after payment.
      // redirect:true sends payment params as GET query params (not a form POST).
      // The browser GET carries no session cookie (cross-origin redirect strips it).
      // Security is guaranteed by HMAC signature verification in the handler.
      const isRazorpayCallback = path === "/api/v1/payments/razorpay-callback";

      if (!isLoggedIn && !isRazorpayCallback) {
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
    const isSubscriptionRoute = path.startsWith('/subscription');
    const isAdmin = req.auth?.user?.role === 'admin';

    // onb_done cookie: set by /api/v1/onboarding/complete after DB write.
    // Acts as a bypass signal when the httponly JWT cookie hasn't been rotated
    // yet (session.update() is unreliable across the two NextAuth instances).
    const onbDoneCookie = req.cookies.get('onb_done')?.value === '1';
    const isOnboardingDone = onboardingCompleted || onbDoneCookie;

    if (!isOnboardingDone && !isAdmin) {
      if (
        isDocumentNavigation &&
        !isOnboardingRoute &&
        !isApiRoute &&
        !isSubscriptionRoute
      ) {
        return NextResponse.redirect(new URL('/onboarding', nextUrl));
      }
    }
  }

  // 5. Expiry Gate — block specific routes, allow everything else
  if (isLoggedIn) {
    const isExpired = req.auth?.user?.subscriptionStatus === 'expired';
    const isAdmin = req.auth?.user?.role === 'admin';

    // Routes blocked when expired
    const EXPIRY_BLOCKED_ROUTES = [
      '/trade/equity',
      '/trade/futures',
      '/trade/options',
      '/trade/strategy',
      '/analytics',
      '/journal',
    ];

    const isBlocked = EXPIRY_BLOCKED_ROUTES.some(r => path.startsWith(r));

    if (isExpired && !isAdmin && isBlocked) {
      return NextResponse.redirect(new URL('/subscription', nextUrl));
    }
  }

  // 6. Plan Feature Gate
  const PRO_ONLY_ROUTES = ['/analytics', '/journal'];
  const isProOnlyRoute = PRO_ONLY_ROUTES.some(r => path.startsWith(r));

  if (isLoggedIn && isProOnlyRoute) {
    const subscriptionStatus = req.auth?.user?.subscriptionStatus;
    const plan = req.auth?.user?.plan;
    const isAdmin = req.auth?.user?.role === 'admin';
    
    const hasAccess = 
      isAdmin ||
      plan === 'pro' ||
      (plan === 'free_trial' && subscriptionStatus === 'active');
    
    if (!hasAccess) {
      return NextResponse.redirect(new URL('/subscription', nextUrl));
    }
  }

  // Allow all other routes — inject x-pathname and x-user-id headers
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-pathname', path);
  if (req.auth?.user?.id) {
    requestHeaders.set('x-user-id', req.auth.user.id);
  }
  return NextResponse.next({
    request: { headers: requestHeaders },
  });
});

export const config = {
    // Include API routes in middleware
    matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
