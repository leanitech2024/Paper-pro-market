export const fmt = (n?: number) => n?.toFixed(2) || '0.00';
export const fmtVol = (n?: number) => n ? (n / 1000000).toFixed(2) + 'M' : '0';
