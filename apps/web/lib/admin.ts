import { NextResponse } from "next/server";
import type { Session } from "next-auth";
import { auth } from "@/lib/auth";

type SessionLike = Session | null;
type AdminSession = Session & { user: Session["user"] & { id: string } };

type AdminAuthResult =
  | { ok: true; session: AdminSession }
  | { ok: false; response: NextResponse };

export function requireAdminFromSession(session: SessionLike): AdminAuthResult {
  if (!session?.user?.id) {
    return { ok: false, response: new NextResponse("Unauthorized", { status: 401 }) };
  }

  const role =
    typeof (session.user as any)?.role === "string"
      ? String((session.user as any).role).toLowerCase()
      : "";

  if (role !== "admin") {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Forbidden", code: "ADMIN_REQUIRED" },
        { status: 403 }
      ),
    };
  }

  return { ok: true, session: session as AdminSession };
}

export async function requireAdmin(): Promise<AdminAuthResult> {
  const session = await auth();
  return requireAdminFromSession(session);
}
