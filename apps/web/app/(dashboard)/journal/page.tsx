"use client";

import { useEffect } from 'react';
import { useJournalStore } from '@/stores/trading/journal.store';
import { useJournalEntries } from '@/hooks/use-journal-entries';
import { JournalTable } from '@/components/journal/JournalTable';
import { LedgerTable } from '@/components/journal/LedgerTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, History } from 'lucide-react';

export default function JournalPage() {
  const { fetchJournal, fetchLedger, ledgerEntries, isLedgerLoading } = useJournalStore();
  const sortedTradeEntries = useJournalEntries();

  useEffect(() => {
    fetchJournal();
    fetchLedger();
  }, [fetchJournal, fetchLedger]);

  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      {/* Page Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-foreground">Account Journal</h1>
        <p className="text-muted-foreground text-sm">
          A comprehensive record of your trading activity and financial ledger.
        </p>
      </div>

      <Tabs defaultValue="trades" className="space-y-6">
        <div className="flex items-center justify-between">
          <TabsList className="bg-muted/50 border border-border p-1 h-11">
            <TabsTrigger value="trades" className="px-6 py-2 gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <BookOpen className="h-4 w-4" />
              Trade Journal
            </TabsTrigger>
            <TabsTrigger value="ledger" className="px-6 py-2 gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <History className="h-4 w-4" />
              Financial Ledger
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="trades">
          <Card className="bg-card border-border shadow-md">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-foreground flex items-center gap-2 text-lg">
                <BookOpen className="h-5 w-5 text-primary" />
                Performance Log
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <JournalTable entries={sortedTradeEntries} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ledger">
          <Card className="bg-card border-border shadow-md">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-foreground flex items-center gap-2 text-lg">
                <History className="h-5 w-5 text-primary" />
                Transaction Ledger
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <LedgerTable entries={ledgerEntries} isLoading={isLedgerLoading} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}