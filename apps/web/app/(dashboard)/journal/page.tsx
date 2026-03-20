"use client";

import { useEffect } from 'react';
import { useJournalStore } from '@/stores/trading/journal.store';
import { useJournalEntries } from '@/hooks/use-journal-entries';
import { JournalTable } from '@/components/journal/JournalTable';
import { LedgerTable } from '@/components/journal/LedgerTable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, History } from 'lucide-react';
import { UpgradeGate } from '@/components/subscription/UpgradeGate';

export default function JournalPage() {
  const { fetchJournal, fetchLedger, ledgerEntries, isLedgerLoading } = useJournalStore();
  const sortedTradeEntries = useJournalEntries();

  useEffect(() => {
    fetchJournal();
    fetchLedger();
  }, [fetchJournal, fetchLedger]);

  return (
    <UpgradeGate feature="journal">
      <div className="min-h-[calc(100vh-4rem)] p-4 md:p-8 lg:p-12 font-sans">
        <div className="max-w-7xl mx-auto space-y-8">
          
          {/* Header Section */}
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
              Account Journal
            </h1>
            <p className="text-muted-foreground mt-1">
              A comprehensive record of your trading activity and financial ledger.
            </p>
          </div>

          <Tabs defaultValue="trades" className="space-y-6">
            <div className="flex items-center justify-between">
              <TabsList className="bg-muted/50 border border-border p-1 h-11 rounded-xl">
                <TabsTrigger value="trades" className="px-6 py-2 gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <BookOpen className="h-4 w-4" />
                  Trade Journal
                </TabsTrigger>
                <TabsTrigger value="ledger" className="px-6 py-2 gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <History className="h-4 w-4" />
                  Financial Ledger
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="trades">
              <div className="rounded-3xl border border-border/50 bg-card/40 backdrop-blur-xl p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-foreground">Performance Log</h2>
                    <p className="text-sm text-muted-foreground">Detailed history of your executed trades and positions.</p>
                  </div>
                </div>
                <div className="pt-2">
                  <JournalTable entries={sortedTradeEntries} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="ledger">
              <div className="rounded-3xl border border-border/50 bg-card/40 backdrop-blur-xl p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                    <History className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-foreground">Transaction Ledger</h2>
                    <p className="text-sm text-muted-foreground">Complete double-entry record of all account balance changes.</p>
                  </div>
                </div>
                <div className="pt-2">
                  <LedgerTable entries={ledgerEntries} isLoading={isLedgerLoading} />
                </div>
              </div>
            </TabsContent>
          </Tabs>

        </div>
      </div>
    </UpgradeGate>
  );
}