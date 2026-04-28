export function toDateKey(raw: Date | string | number | null | undefined): string {
    if (raw === null || raw === undefined) return "";
    try {
        const d = typeof raw === "number" 
            ? (raw > 1e11 ? new Date(raw) : new Date(raw * 1000)) 
            : new Date(raw);
        if (Number.isNaN(d.getTime())) return "";
        return d.toISOString().split("T")[0];
    } catch {
        return "";
    }
}

export function getIstDateKey(now: Date = new Date()): string {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(now);

    const year = parts.find((p) => p.type === "year")?.value ?? "0000";
    const month = parts.find((p) => p.type === "month")?.value ?? "00";
    const day = parts.find((p) => p.type === "day")?.value ?? "00";

    return `${year}-${month}-${day}`;
}
