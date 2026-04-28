import { clientLogger } from "@/lib/client-logger";

export async function submitOrder(payload: Record<string, unknown>) {
  const res = await fetch("/api/v1/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const rawBody = await res.text();
  let data: any = null;
  if (rawBody) {
    try {
      data = JSON.parse(rawBody);
    } catch {
      data = null;
    }
  }

  if (!res.ok || !data?.success) {
    const apiError = data?.error;
    const errorCode =
      (typeof apiError?.code === "string" && apiError.code) ||
      (typeof data?.code === "string" && data.code) ||
      "";

    const backendMessage = (() => {
      if (errorCode === "MARKET_CLOSED")
        return (
          apiError?.message ||
          data?.message ||
          "Market is closed. Trading hours are 9:15 AM - 3:30 PM IST (Mon-Fri). You can still exit existing positions anytime."
        );
      if (errorCode === "INSUFFICIENT_FUNDS")
        return apiError?.message || data?.message || "Insufficient balance to place this order.";
      if (errorCode === "INSTRUMENT_INACTIVE")
        return "This instrument is no longer active or has expired.";
      if (errorCode === "INSTRUMENT_NOT_ALLOWED")
        return "Trading this instrument is not allowed in paper trading mode.";
      if (errorCode === "PARTIAL_EXIT_NOT_ALLOWED")
        return "Partial exit is disabled in paper trading mode.";
      if (errorCode === "INVALID_STOP_LOSS")
        return apiError?.message || "Stop-loss price is on the wrong side of the entry price.";
      if (errorCode === "INVALID_TARGET")
        return apiError?.message || "Target price is on the wrong side of the entry price.";
      if (errorCode === "CNC_LEVERAGE_NOT_ALLOWED")
        return "CNC orders cannot use leverage above 1x. Switch to MIS for leveraged intraday trading.";
      return (
        (typeof apiError === "string" && apiError) ||
        apiError?.message ||
        (typeof data?.message === "string" && data.message) ||
        (!data && rawBody ? rawBody.slice(0, 300) : null) ||
        `Order placement failed (HTTP ${res.status})`
      );
    })();

    clientLogger.error("Place Order API Failed", {
      status: res.status,
      errorCode,
      data,
    });

    throw new Error(backendMessage);
  }

  return data;
}

export async function fetchOpenOrders() {
  const res = await fetch("/api/v1/orders?status=OPEN");
  return res.json();
}
