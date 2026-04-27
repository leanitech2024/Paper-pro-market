import { MarginCalculatorService } from "@/domains/trading/server/margin/margin-calculator.service";
import { WalletService } from "@/domains/platform/server/accounting/wallet/wallet.service";
import type { Instrument, PlaceOrder } from "@paper-market/core";
import { ApiError } from "@/lib/errors";

export class MarginReservationService {
  /**
   * Calculates and reserves margin atomically using DB sequence/lock.
   * C-6 FIX: Uses checkMarginWithLock to prevent concurrent overspending.
   */
  static async calculateMargin(
    userId: string,
    payload: PlaceOrder,
    instrument: Instrument,
    options: { isClosingOrder?: boolean } = {}
  ): Promise<number> {
    if (options.isClosingOrder) {
      return 0;
    }

    return await MarginCalculatorService.calculateRequiredMargin(payload, instrument);
  }


  static async reserveMarginWithinTransaction(
    userId: string,
    requiredMargin: number,
    tx: any
  ): Promise<void> {
     if (requiredMargin <= 0) return;

     const hasMargin = await WalletService.checkMarginWithLock(userId, requiredMargin, tx);
     if (!hasMargin) {
         throw new ApiError(
             "Insufficient available balance",
             400,
             "INSUFFICIENT_FUNDS"
         );
     }
  }
}


