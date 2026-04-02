import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@paper-market/core/db";
import { eq } from "drizzle-orm";
import { logger } from "@/lib/logger";

export async function POST() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    await db
      .update(users)
      .set({ onboardingCompleted: true })
      .where(eq(users.id, userId));

    logger.info({ userId }, "Onboarding marked complete");

    // Set a short-lived plain cookie alongside the JSON response.
    // The middleware reads this cookie (not the httponly JWT) as a bypass signal
    // for the onboarding gate on the very next navigation — before session.update()
    // has a chance to rotate the JWT cookie (which is unreliable across the two
    // separate NextAuth instances: middleware authConfig vs server auth.ts).
    const response = NextResponse.json({ success: true });
    response.cookies.set("onb_done", "1", {
      httpOnly: false,   // Must be readable by both middleware and client
      sameSite: "lax",
      path: "/",
      maxAge: 86400,     // 24-hour TTL — covers the full user session
    });
    return response;
  } catch (err) {
    logger.error({ err: err }, "Failed to complete onboarding");
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
