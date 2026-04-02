import { NextRequest, NextResponse } from "next/server";
import { UpstoxService } from "@/services/market/feeds/upstox-feed.service";
import { auth } from "@/lib/auth";
import { handleError, ApiError } from "@/lib/errors";

export async function GET(_req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      throw new ApiError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const state = crypto.randomUUID();
    const url = UpstoxService.getAuthUrl(state);
    
    const response = NextResponse.redirect(url);
    response.cookies.set("upstox_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 300,
      path: "/",
    });

    return response;
  } catch (err) {
    return handleError(err);
  }
}

