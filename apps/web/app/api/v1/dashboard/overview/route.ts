import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { DashboardService } from "@/domains/platform/server/reporting/dashboard.service";
import { handleError, ApiError } from "@/lib/errors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      throw new ApiError("Unauthorized", 401, "UNAUTHORIZED");
    }

    if (session.user.subscriptionStatus === 'expired' && session.user.role !== 'admin') {
      throw new ApiError("Subscription expired", 403, "FORBIDDEN");
    }

    const overview = await DashboardService.getOverview(session.user.id);

    return NextResponse.json({
      success: true,
      data: overview,
    });
  } catch (err) {
    return handleError(err);
  }
}

