import { create } from 'zustand';
import { JournalEntry } from '@paper-market/core';

export interface LedgerEntryView {
  id: string;
  amount: string;
  currency: string;
  referenceType: string;
  referenceId: string;
  idempotencyKey: string;
  createdAt: string;
  debitType: string;
  creditType: string;
  globalSequence: number;
}

interface JournalState {
  entries: JournalEntry[];
  ledgerEntries: LedgerEntryView[];
  isLoading: boolean;
  isLedgerLoading: boolean;
  // Actions
  fetchJournal: () => Promise<void>;
  fetchLedger: (params?: { page?: number; limit?: number; referenceType?: string }) => Promise<void>;
  addJournalEntry: (entry: JournalEntry) => void;
  updateJournalOnExit: (id: string, exitData: Partial<JournalEntry>) => void;
  resetJournal: () => void;
}

export const useJournalStore = create<JournalState>((set) => ({
  entries: [],
  ledgerEntries: [],
  isLoading: false,
  isLedgerLoading: false,

  fetchJournal: async () => {
    set({ isLoading: true });
    try {
      const res = await fetch('/api/v1/orders?status=FILLED');
      const data = await res.json();

      if (data.success) {
        const mappedEntries: JournalEntry[] = data.data
          .filter((t: any) => t.realizedPnL && parseFloat(t.realizedPnL) !== 0)
          .map((t: any) => ({
            id: t.id,
            instrument: t.instrument || 'EQUITY', 
            symbol: t.symbol,
            entryTime: new Date(t.createdAt),
            exitTime: new Date(t.updatedAt),
            side: t.side,
            quantity: t.quantity,
            entryPrice: parseFloat(t.averagePrice || t.price),
            exitPrice: parseFloat(t.averagePrice || t.price),
            realizedPnL: parseFloat(t.realizedPnL || "0"),
          }));
        set({ entries: mappedEntries });
      }
    } catch (err) {
      console.error("Failed to fetch journal", err);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchLedger: async (params = {}) => {
    set({ isLedgerLoading: true });
    try {
      const query = new URLSearchParams();
      if (params.page) query.append('page', params.page.toString());
      if (params.limit) query.append('limit', params.limit.toString());
      if (params.referenceType) query.append('referenceType', params.referenceType);

      const res = await fetch(`/api/v1/journal?${query.toString()}`);
      const data = await res.json();

      if (data.success) {
        set({ ledgerEntries: data.data.entries });
      }
    } catch (err) {
      console.error("Failed to fetch ledger", err);
    } finally {
      set({ isLedgerLoading: false });
    }
  },

  addJournalEntry: (entry) => set((state) => ({ entries: [...state.entries, entry] })),
  updateJournalOnExit: (_id, _exitData) => { },
  resetJournal: () => set({ entries: [], ledgerEntries: [] }),
}));
