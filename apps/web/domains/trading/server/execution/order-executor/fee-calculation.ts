import { MarginCalculatorService } from "@/domains/trading/server/margin/margin-calculator.service";
import { LedgerService } from "@/domains/platform/server/accounting/ledger/ledger.service";

export function round2(value: number): number {
    return Math.round(value * 100) / 100;
}

export function calculateOpeningClosingQuantities(
    previousQuantity: number,
    tradeDelta: number
): { openingQuantity: number; closingQuantity: number; projectedQuantity: number } {
    const projectedQuantity = previousQuantity + tradeDelta;

    let openingQuantity = 0;
    let closingQuantity = 0;
    if (previousQuantity === 0 || Math.sign(previousQuantity) === Math.sign(tradeDelta)) {
        openingQuantity = Math.abs(tradeDelta);
    } else {
        closingQuantity = Math.min(Math.abs(previousQuantity), Math.abs(tradeDelta));
        openingQuantity = Math.max(0, Math.abs(tradeDelta) - Math.abs(previousQuantity));
    }

    return { openingQuantity, closingQuantity, projectedQuantity };
}

export function calculateMarginDeltas(params: {
    fillQuantity: number;
    marginRequired: number;
    openingQuantity: number;
    closingQuantity: number;
    reservedMargin: number;
}) {
    const { fillQuantity, marginRequired, openingQuantity, closingQuantity, reservedMargin } = params;
    const marginPerUnit = fillQuantity > 0 ? marginRequired / fillQuantity : 0;
    const marginToBlock = Math.max(0, round2(marginPerUnit * openingQuantity));
    const marginToRelease = Math.max(0, round2(marginPerUnit * closingQuantity));
    const marginBlockDelta = Math.max(0, round2(marginToBlock - reservedMargin));
    const marginReserveReleaseDelta = Math.max(0, round2(reservedMargin - marginToBlock));

    return {
        marginPerUnit,
        marginToBlock,
        marginToRelease,
        marginBlockDelta,
        marginReserveReleaseDelta,
    };
}

export function calculateRealizedPnl(params: {
    finalExecutionPrice: number;
    previousAveragePrice: number;
    previousQuantity: number;
    closingQuantity: number;
}): { realizedPnlString: string; realizedPnl: number } {
    const { finalExecutionPrice, previousAveragePrice, previousQuantity, closingQuantity } = params;
    const realizedPnlString: string = (() => {
        if (closingQuantity <= 0) return "0";
        const direction = previousQuantity > 0 ? 1 : -1;
        const priceDelta = LedgerService.subtract(
            finalExecutionPrice.toString(),
            previousAveragePrice.toString()
        );
        const gross = LedgerService.multiplyByInteger(priceDelta, closingQuantity);
        return direction === 1 ? gross : LedgerService.subtract("0", gross);
    })();

    return {
        realizedPnlString,
        realizedPnl: parseFloat(realizedPnlString),
    };
}

export async function calculateOptionMarginDeltas(params: {
    instrument: any;
    previousQuantity: number;
    projectedQuantity: number;
    finalExecutionPrice: number;
    reservedMargin: number;
}) {
    const { instrument, previousQuantity, projectedQuantity, finalExecutionPrice, reservedMargin } = params;

    let optionMarginToBlock = 0;
    let optionMarginToRelease = 0;
    if (instrument.instrumentType === "OPTION") {
        const previousShortQty = Math.max(0, -previousQuantity);
        const nextShortQty = Math.max(0, -projectedQuantity);
        const previousShortMargin = await MarginCalculatorService.calculateOptionShortMarginForQuantity(
            instrument,
            previousShortQty,
            finalExecutionPrice
        );
        const nextShortMargin = await MarginCalculatorService.calculateOptionShortMarginForQuantity(
            instrument,
            nextShortQty,
            finalExecutionPrice
        );
        optionMarginToBlock = Math.max(0, round2(nextShortMargin - previousShortMargin));
        optionMarginToRelease = Math.max(0, round2(previousShortMargin - nextShortMargin));
    }

    return {
        optionMarginToBlock,
        optionMarginToRelease,
        optionMarginBlockDelta: Math.max(0, round2(optionMarginToBlock - reservedMargin)),
        optionReserveReleaseDelta: Math.max(0, round2(reservedMargin - optionMarginToBlock)),
    };
}
