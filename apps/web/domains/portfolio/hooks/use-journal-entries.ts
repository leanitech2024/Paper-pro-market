import { useJournalStore } from '@/domains/portfolio/stores/journal.store';
import { JournalEntry } from '@paper-market/core';

export function useJournalEntries(): JournalEntry[] {
    const entries = useJournalStore((state) => state.entries);

    // Sort by entry time
    return [...entries].sort((a, b) =>
        new Date(b.entryTime).getTime() - new Date(a.entryTime).getTime()
    );
}
