import { InstrumentMode, UserPosition } from '@paper-market/core';

export function getExitQuantity(
  positions: UserPosition[],
  instrumentToken: string | undefined,
  side: "BUY" | "SELL",
  instrumentMode: InstrumentMode,
  requestedQuantity: number
): { isOppositeExitFlow: boolean; effectiveQuantity: number; existingPositionQty: number } {
  if (!instrumentToken) {
    return { isOppositeExitFlow: false, effectiveQuantity: requestedQuantity, existingPositionQty: 0 };
  }

  const existingPosition = positions.find(
    (p) => String(p.instrumentToken || "") === instrumentToken && Number(p.quantity || 0) > 0
  );

  const existingPositionQty = existingPosition ? Math.abs(Number(existingPosition.quantity || 0)) : 0;
  const existingPositionSide = existingPosition?.side || null;
  const fullExitGuardEnabled = instrumentMode === 'equity' || instrumentMode === 'futures' || instrumentMode === 'options';

  const isOppositeExitFlow =
    fullExitGuardEnabled &&
    existingPositionQty > 0 &&
    ((existingPositionSide === 'BUY' && side === 'SELL') || (existingPositionSide === 'SELL' && side === 'BUY'));

  const effectiveQuantity = isOppositeExitFlow ? existingPositionQty : requestedQuantity;

  return { isOppositeExitFlow, effectiveQuantity, existingPositionQty };
}
