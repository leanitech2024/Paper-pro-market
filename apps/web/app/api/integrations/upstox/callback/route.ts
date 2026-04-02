
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { UpstoxService } from "@/services/market/feeds/upstox-feed.service";
import { cookies } from "next/headers";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized - Please Login First" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const state = searchParams.get("state");

  const cookieStore = await cookies();
  const storedState = cookieStore.get("upstox_oauth_state")?.value;
  cookieStore.delete("upstox_oauth_state");

  if (!state || state !== storedState) {
    return NextResponse.redirect(new URL("/admin/upstox?status=error&error=oauth_failed", req.url));
  }

  if (error) {
    return NextResponse.redirect(new URL("/admin/upstox?status=error&error=oauth_failed", req.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL("/admin/upstox?status=error&error=oauth_failed", req.url));
  }

  try {
    await UpstoxService.generateToken(code, session.user.id);
    return NextResponse.redirect(new URL("/admin/upstox?status=success", req.url));
  } catch (_: any) {
    return NextResponse.redirect(new URL("/admin/upstox?status=error&error=oauth_failed", req.url));
  }
}

