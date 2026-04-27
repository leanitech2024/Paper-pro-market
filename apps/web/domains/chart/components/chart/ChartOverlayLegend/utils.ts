export function formatPrice(price: number): string {
  return price.toFixed(2);
}

export function formatVolume(volume: string | number | undefined): string | null {
  if (volume === undefined || !Number.isFinite(Number(volume))) {
    return null;
  }
  return (Number(volume) / 1000).toFixed(2) + 'K';
}

export function calculateChange(open: number, close: number): { change: string, changePct: string } {
  const diff = close - open;
  const pct = open !== 0 ? (diff / open) * 100 : 0;
  return {
    change: diff.toFixed(2),
    changePct: pct.toFixed(2)
  };
}
