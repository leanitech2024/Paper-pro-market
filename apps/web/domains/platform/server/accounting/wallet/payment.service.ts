import { WalletService } from "@/domains/platform/server/accounting/wallet/wallet.service";
import { ApiError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { v4 as uuidv4 } from "uuid";

export class PaymentService {
    /**
     * Check if user has sufficient funds (Transactional).
     */
    static async hasSufficientBalance(tx: any, userId: string, amount: number): Promise<boolean> {
        return WalletService.checkMarginWithLock(userId, amount, tx);
    }

    /**
     * Deduct funds from user balance.
     */
    static async deductFunds(tx: any, userId: string, amount: number, description: string) {
        if (amount <= 0) return;

        // Use a unique reference ID for the ledger entry
        const referenceId = `PAYMENT_DED_ ${uuidv4()}`;

        try {
            await WalletService.debitBalance(
                userId,
                amount,
                "ADJUSTMENT",
                referenceId,
                tx,
                description
            );
            logger.info({ userId, amount }, `Funds deducted via WalletService: ${description}`);
        } catch (err: any) {
            if (err?.code === "INSUFFICIENT_FUNDS") {
                throw new ApiError("Insufficient funds", 400, "INSUFFICIENT_FUNDS");
            }
            throw err;
        }
    }

    /**
     * Credit funds to user balance.
     */
    static async creditFunds(tx: any, userId: string, amount: number, description: string) {
        if (amount <= 0) return;

        // Use a unique reference ID for the ledger entry
        const referenceId = `PAYMENT_CR_ ${uuidv4()}`;

        await WalletService.creditBalance(
            userId,
            amount,
            "ADJUSTMENT",
            referenceId,
            description,
            tx
        );
        logger.info({ userId, amount }, `Funds credited via WalletService: ${description}`);
    }
}
