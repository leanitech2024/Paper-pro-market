const INDEX_ALIAS_BY_KEY: Record<string, string> = {
  NIFTY: "NIFTY 50",
  NIFTY50: "NIFTY 50",
  NIFTY_50: "NIFTY 50",
  BANKNIFTY: "NIFTY BANK",
  NIFTYBANK: "NIFTY BANK",
  NIFTY_BANK: "NIFTY BANK",
  FINNIFTY: "NIFTY FIN SERVICE",
  NIFTYFINSERVICE: "NIFTY FIN SERVICE",
  NIFTY_FIN_SERVICE: "NIFTY FIN SERVICE",
};

// Upstox uses mixed-case format for indices (e.g., "NSE_INDEX|Nifty 50")
// This map ensures we preserve the exact format Upstox expects
// Note: some indices (e.g. MIDCAP) are stored ALL-CAPS in Upstox — we preserve those too.
const UPSTOX_INDEX_FORMAT: Record<string, string> = {
  "NIFTY 50": "Nifty 50",
  "NIFTY BANK": "Nifty Bank",
  "NIFTY FIN SERVICE": "Nifty Fin Service",
  "NIFTY MIDCAP 100": "Nifty Midcap 100",  // Title case — Upstox token: NSE_INDEX|Nifty Midcap 100
  "NIFTY NEXT 50": "Nifty Next 50",
  "INDIA VIX": "INDIA VIX",               // ALL CAPS — Upstox token: NSE_INDEX|INDIA VIX
  "NIFTY MIDCAP 50": "Nifty Midcap 50",
  "NIFTY SMALLCAP 100": "Nifty Smallcap 100",
  "NIFTY 100": "Nifty 100",
  "NIFTY 200": "Nifty 200",
  "NIFTY 500": "Nifty 500",
  "NIFTY AUTO": "Nifty Auto",
  "NIFTY IT": "Nifty IT",
  "NIFTY FMCG": "Nifty FMCG",
  "NIFTY PHARMA": "Nifty Pharma",
  "NIFTY METAL": "Nifty Metal",
  "NIFTY REALTY": "Nifty Realty",
  "NIFTY ENERGY": "Nifty Energy",
  "NIFTY INFRA": "Nifty Infra",
  "NIFTY MEDIA": "Nifty Media",
  "NIFTY PSU BANK": "Nifty PSU Bank",
  "NIFTY PRIVATE BANK": "Nifty Private Bank",
};

export function toSymbolKey(symbol: string): string {
  return String(symbol || "")
    .trim()
    .replace(/\s+/g, "")
    .toUpperCase();
}

export function toCanonicalSymbol(symbol: string): string {
  const raw = String(symbol || "").trim();
  if (!raw) return "";

  const key = toSymbolKey(raw);
  return INDEX_ALIAS_BY_KEY[key] ?? raw.toUpperCase();
}

/**
 * Normalizes instrument keys to the format expected by Upstox.
 * 
 * For equities: Converts to uppercase (e.g., "NSE_EQ|INE002A01018")
 * For indices: Preserves Upstox's mixed-case format (e.g., "NSE_INDEX|Nifty 50")
 * For F&O: Converts to uppercase (e.g., "NSE_FO|NIFTY25FEB22000CE")
 * 
 * This is critical because Upstox WebSocket expects exact format matching:
 * - Subscribe with "NSE_INDEX|Nifty 50" (mixed case)
 * - Receive ticks with "NSE_INDEX|Nifty 50" (mixed case)
 * - Subscribe with "NSE_FO|NIFTY25FEB22000CE" (uppercase)
 * - Receive ticks with "NSE_FO|NIFTY25FEB22000CE" (uppercase)
 */
export function toInstrumentKey(value: string): string {
  if (!value) return "";
  
  const normalized = String(value)
    .trim()
    .replace(":", "|")
    .replace(/\s*\|\s*/g, "|")
    .replace(/\s+/g, " ");
  
  // Check if this is an index instrument (case-insensitive check)
  const upperNormalized = normalized.toUpperCase();
  if (upperNormalized.startsWith("NSE_INDEX|")) {
    const parts = normalized.split("|");
    if (parts.length === 2) {
      const indexPart = parts[1];
      const upperIndexPart = indexPart.toUpperCase();
      
      // If we have a known Upstox format for this index, use it
      if (UPSTOX_INDEX_FORMAT[upperIndexPart]) {
        return `NSE_INDEX|${UPSTOX_INDEX_FORMAT[upperIndexPart]}`;
      }
    }
  }
  
  // For F&O instruments (NSE_FO|...), convert to uppercase
  if (upperNormalized.startsWith("NSE_FO|")) {
    return upperNormalized;
  }
  
  // For equity instruments (NSE_EQ|...), convert to uppercase
  if (upperNormalized.startsWith("NSE_EQ|")) {
    return upperNormalized;
  }
  
  // For other segments (BSE_EQ, MCX_FO, etc.), convert to uppercase
  return normalized.toUpperCase();
}

export function symbolToIndexInstrumentKey(symbol: string): string | null {
  const canonical = toCanonicalSymbol(symbol);
  if (!canonical) return null;

  // Use toInstrumentKey to ensure proper format (mixed case for indices)
  if (UPSTOX_INDEX_FORMAT[canonical]) {
    return toInstrumentKey(`NSE_INDEX|${UPSTOX_INDEX_FORMAT[canonical]}`);
  }

  return null;
}

export function toIndexInstrumentSuffix(instrumentToken: string): string {
    const key = String(instrumentToken || '').toUpperCase();
    if (key.includes('NIFTY_50') || key.includes('NIFTY 50')) return 'NIFTY';
    if (key.includes('BANKNIFTY') || key.includes('NIFTY BANK')) return 'BANKNIFTY';
    if (key.includes('FINNIFTY') || key.includes('FIN_SERVICE')) return 'FINNIFTY';
    return '';
}

export function canonicalizeUnderlyingSymbol(symbol: string): string {
    const s = String(symbol || "").toUpperCase();
    if (s === "NIFTY 50" || s === "NIFTY") return "NIFTY";
    if (s === "NIFTY BANK" || s === "BANKNIFTY") return "BANKNIFTY";
    if (s === "NIFTY FIN SERVICE" || s === "FINNIFTY") return "FINNIFTY";
    return s;
}

