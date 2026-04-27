import Link from "next/link";
import { auth } from "@/lib/auth";
import { UpstoxAuthService } from "@/domains/market/server/feeds/upstox-auth.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type UpstoxPageProps = {
  searchParams: Promise<{
    status?: string;
    error?: string;
  }>;
};

function formatTimestamp(value: Date | null) {
  if (!value) return "â€”";
  return value.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
}

function statusMessage(status?: string, error?: string) {
  if (status === "success") {
    return { text: "Upstox token refreshed successfully.", tone: "success" as const };
  }
  if (status === "disconnected") {
    return { text: "Upstox token disconnected.", tone: "muted" as const };
  }
  if (status === "error") {
    return {
      text: error ? `Upstox token refresh failed: ${error}` : "Upstox token refresh failed.",
      tone: "error" as const,
    };
  }
  return null;
}

export default async function AdminUpstoxPage({ searchParams }: UpstoxPageProps) {
  const { status: statusParam, error: errorParam } = await searchParams;
  const session = await auth();
  const userId = session?.user?.id;
  const configured = UpstoxAuthService.isConfigured();
  const status = userId ? await UpstoxAuthService.getStatus(userId) : { connected: false, expiresAt: null };
  const message = statusMessage(statusParam, errorParam);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Upstox Integration</h1>
        <p className="text-sm text-slate-400">
          Re-authenticate to refresh the Upstox access token used for market data.
        </p>
      </div>

      {message && (
        <div
          className={
            message.tone === "success"
              ? "rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200"
              : message.tone === "error"
              ? "rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"
              : "rounded-lg border border-slate-800 bg-slate-950/70 px-4 py-3 text-sm text-slate-300"
          }
        >
          {message.text}
        </div>
      )}

      <Card className="border-slate-800 bg-slate-950/70">
        <CardHeader>
          <CardTitle className="text-white">Connection Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-slate-300">
          {!configured && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-amber-200">
              Upstox credentials are missing. Set `UPSTOX_API_KEY`, `UPSTOX_API_SECRET`,
              and `UPSTOX_REDIRECT_URI` before attempting refresh.
            </div>
          )}

          <div className="flex items-center justify-between">
            <span>Status</span>
            <span className={status.connected ? "text-emerald-400" : "text-rose-400"}>
              {status.connected ? "Connected" : "Disconnected"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Expires At (IST)</span>
            <span className="text-slate-200">{formatTimestamp(status.expiresAt)}</span>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <Button asChild disabled={!configured}>
              <Link href="/api/upstox/login">Connect / Refresh Token</Link>
            </Button>
            <form action="/api/v1/admin/upstox/disconnect" method="post">
              <Button type="submit" variant="destructive" disabled={!status.connected}>
                Disconnect
              </Button>
            </form>
          </div>

          <p className="text-xs text-slate-500">
            Upstox does not issue long-lived refresh tokens. A fresh OAuth login is required
            whenever the access token expires.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
