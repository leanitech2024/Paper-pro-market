import { clientLogger } from "@/lib/client-logger";

export type AnalysisTelemetryLevel = "info" | "warn" | "error";

export type AnalysisTelemetryEvent = {
  name: string;
  level?: AnalysisTelemetryLevel;
  payload?: Record<string, unknown>;
};

export function trackAnalysisEvent(event: AnalysisTelemetryEvent) {
  const level = event.level || "info";
  const logFn =
    level === "error"
      ? clientLogger.error
      : level === "warn"
      ? clientLogger.warn
      : clientLogger.info;

  logFn(`[analysis:${event.name}]`, event.payload || {});

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("analysis:telemetry", {
        detail: {
          name: event.name,
          level,
          payload: event.payload || {},
          ts: Date.now(),
        },
      })
    );
  }
}
