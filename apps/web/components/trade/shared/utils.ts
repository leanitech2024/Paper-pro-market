export function parseExpiryDate(value: unknown): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

export function toExpiryIso(value: unknown): string {
  const parsed = parseExpiryDate(value);
  return parsed ? parsed.toISOString() : '';
}
