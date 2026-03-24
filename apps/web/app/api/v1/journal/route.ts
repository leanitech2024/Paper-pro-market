import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ledgerEntries, ledgerAccounts, writeAheadJournal } from "@paper-market/core/db";
import { eq, and, desc, or, inArray, count } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { handleError } from "@/lib/errors";
import { z } from "zod";

const JournalQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(50),
  page: z.coerce.number().min(1).default(1),
  referenceType: z.string().optional(),
});

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (session.user.subscriptionStatus === 'expired' && session.user.role !== 'admin') {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(req.url);
    const validated = JournalQuerySchema.parse(Object.fromEntries(searchParams));

    const offset = (validated.page - 1) * validated.limit;

    // Get all ledger accounts for the user
    const accounts = await db
      .select({ id: ledgerAccounts.id })
      .from(ledgerAccounts)
      .where(eq(ledgerAccounts.userId, userId));

    const accountIds = accounts.map((a) => a.id);
    if (accountIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: { entries: [], total: 0 },
      });
    }

    const debitAccounts = alias(ledgerAccounts, "debit_accounts");
    const creditAccounts = alias(ledgerAccounts, "credit_accounts");

    const whereConditions = [
      or(
        inArray(ledgerEntries.debitAccountId, accountIds),
        inArray(ledgerEntries.creditAccountId, accountIds)
      ),
    ];

    if (validated.referenceType) {
      whereConditions.push(eq(ledgerEntries.referenceType, validated.referenceType as any));
    }

    // Fetch ledger entries
    const [entries, [{ total }]] = await Promise.all([
      db
        .select({
          id: ledgerEntries.id,
          amount: ledgerEntries.amount,
          currency: ledgerEntries.currency,
          referenceType: ledgerEntries.referenceType,
          referenceId: ledgerEntries.referenceId,
          idempotencyKey: ledgerEntries.idempotencyKey,
          createdAt: ledgerEntries.createdAt,
          debitType: debitAccounts.accountType,
          creditType: creditAccounts.accountType,
          globalSequence: ledgerEntries.globalSequence,
        })
        .from(ledgerEntries)
        .innerJoin(debitAccounts, eq(ledgerEntries.debitAccountId, debitAccounts.id))
        .innerJoin(creditAccounts, eq(ledgerEntries.creditAccountId, creditAccounts.id))
        .where(and(...whereConditions))
        .orderBy(desc(ledgerEntries.createdAt), desc(ledgerEntries.globalSequence))
        .limit(validated.limit)
        .offset(offset),
      db
        .select({ total: count() })
        .from(ledgerEntries)
        .where(and(...whereConditions)),
    ]);

    // Fetch related WAJ status if needed (optional but helpful)
    // For now, entries are enough as they represent COMMITTED state in the ledger.

    return NextResponse.json({
      success: true,
      data: {
        entries,
        pagination: {
          total: Number(total),
          page: validated.page,
          limit: validated.limit,
        },
      },
    });
  } catch (error) {
    return handleError(error);
  }
}
