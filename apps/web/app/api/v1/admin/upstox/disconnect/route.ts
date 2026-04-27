import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { handleError } from "@/lib/errors";
import { UpstoxAuthService } from "@/domains/market/server/feeds/upstox-auth.service";

export async function POST(_req: Request) {
  try {
    const authResult = await requireAdmin();
    if (!authResult.ok) return authResult.response;

    const session = authResult.session;
    await UpstoxAuthService.disconnect(session.user.id);

    return NextResponse.redirect(new URL("/admin/upstox?status=disconnected", _req.url));
  } catch (err) {
    return handleError(err);
  }
}
