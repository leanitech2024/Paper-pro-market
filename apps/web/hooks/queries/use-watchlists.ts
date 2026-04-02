import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Stock } from '@paper-market/core';

// ═══════════════════════════════════════════════════════════
// 📊 WATCHLIST QUERY HOOKS
// ═══════════════════════════════════════════════════════════

interface Watchlist {
  id: string;
  name: string;
  isDefault: boolean;
  userId: string;
}

type AddInstrumentInput = string | Stock;

async function fetchWatchlists(): Promise<Watchlist[]> {
  const res = await fetch('/api/v1/watchlists');
  if (!res.ok) throw new Error('Failed to fetch watchlists');
  const { data } = await res.json();
  return data as Watchlist[];
}


// ─────────────────────────────────────────────────────────────────
// 🔍 QUERY: Fetch all watchlists
// ─────────────────────────────────────────────────────────────────
export function useWatchlists() {
  return useQuery({
    queryKey: ['watchlists'],
    queryFn: fetchWatchlists,
    staleTime: 5 * 60_000, // 5 minutes — watchlist names rarely change
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

// ─────────────────────────────────────────────────────────────────
// 🔍 QUERY: Fetch default watchlist + snapshot (prefill cache)
// ─────────────────────────────────────────────────────────────────
export function useDefaultWatchlistSnapshot() {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ['watchlist', 'default'],
    queryFn: async () => {
      const watchlists = await queryClient.fetchQuery({
        queryKey: ['watchlists'],
        queryFn: fetchWatchlists,
        staleTime: 5 * 60_000,
      });

      const defaultWatchlist = watchlists.find((w) => w.isDefault) ?? watchlists[0];
      if (!defaultWatchlist) {
        return { watchlists, defaultId: null as string | null, instruments: [] as Stock[] };
      }

      const res = await fetch(`/api/v1/watchlists/${defaultWatchlist.id}/snapshot`);
      if (!res.ok) throw new Error('Failed to fetch snapshot');
      const { data } = await res.json();

      return {
        watchlists,
        defaultId: defaultWatchlist.id,
        instruments: (data ?? []) as Stock[],
      };
    },
    staleTime: 15_000,
    refetchOnWindowFocus: false,
    retry: 0,
  });
}

// ─────────────────────────────────────────────────────────────────
// 🔍 QUERY: Fetch instruments for a specific watchlist
// ─────────────────────────────────────────────────────────────────
export function useWatchlistInstruments(watchlistId: string | null) {
  return useQuery({
    queryKey: ['watchlist', watchlistId],
    queryFn: async () => {
      if (!watchlistId) return [];
      const res = await fetch(`/api/v1/watchlists/${watchlistId}/snapshot`);
      if (!res.ok) throw new Error('Failed to fetch watchlist');
      const { data } = await res.json();
      return (data ?? []) as Stock[];
    },
    enabled: !!watchlistId,
    staleTime: 15_000,
    refetchOnWindowFocus: false,
    retry: 0,
    placeholderData: (prev) => prev,
  });
}

// ─────────────────────────────────────────────────────────────────
// ✏️ MUTATION: Create new watchlist
// ─────────────────────────────────────────────────────────────────
export function useCreateWatchlist() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch('/api/v1/watchlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      
      if (!res.ok) throw new Error('Failed to create watchlist');
      return res.json();
    },
    onSuccess: (result) => {
      const createdWatchlist = result?.data;

      if (createdWatchlist) {
        queryClient.setQueryData<Watchlist[]>(['watchlists'], (current = []) => {
          const withoutDuplicate = current.filter((item) => item.id !== createdWatchlist.id);
          const defaultWatchlists = withoutDuplicate.filter((item) => item.isDefault);
          const customWatchlists = withoutDuplicate.filter((item) => !item.isDefault);
          return [...defaultWatchlists, createdWatchlist, ...customWatchlists];
        });
      }

      queryClient.invalidateQueries({ queryKey: ['watchlists'] });
    },
  });
}

// ─────────────────────────────────────────────────────────────────
// ✏️ MUTATION: Delete a watchlist
// ─────────────────────────────────────────────────────────────────
export function useDeleteWatchlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (watchlistId: string) => {
      const res = await fetch(`/api/v1/watchlists/${watchlistId}`, {
        method: 'DELETE',
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete watchlist');
      }
      return res.json();
    },
    onSuccess: (_, deletedId) => {
      queryClient.setQueryData<Watchlist[]>(['watchlists'], (current = []) => 
        current.filter(w => w.id !== deletedId)
      );
      queryClient.removeQueries({ queryKey: ['watchlist', deletedId] });
    },
  });
}

// ─────────────────────────────────────────────────────────────────
// ✏️ MUTATION: Add instrument to watchlist
// ─────────────────────────────────────────────────────────────────
export function useAddInstrument(watchlistId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: AddInstrumentInput) => {
      const instrumentToken =
        typeof input === 'string' ? input : String(input.instrumentToken || '').trim();
      const res = await fetch(`/api/v1/watchlists/${watchlistId}/instruments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instrumentToken }),
      });
      
      if (!res.ok) throw new Error('Failed to add instrument');
      return res.json();
    },
    onMutate: async (input: AddInstrumentInput) => {
      await queryClient.cancelQueries({ queryKey: ['watchlist', watchlistId] });

      const previousWatchlist = queryClient.getQueryData<Stock[]>(['watchlist', watchlistId]);
      const optimisticStock = typeof input === 'string' ? null : input;
      const optimisticToken = typeof input === 'string'
        ? String(input || '').trim()
        : String(input.instrumentToken || '').trim();

      if (optimisticStock && optimisticToken) {
        queryClient.setQueryData<Stock[]>(['watchlist', watchlistId], (current = []) => {
          if (current.some((item) => item.instrumentToken === optimisticToken)) return current;
          return [...current, optimisticStock];
        });
      }

      return { previousWatchlist };
    },
    onError: (_error, _input, context) => {
      if (context?.previousWatchlist) {
        queryClient.setQueryData(['watchlist', watchlistId], context.previousWatchlist);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist', watchlistId] });
    },
  });
}

// ─────────────────────────────────────────────────────────────────
// ✏️ MUTATION: Remove instrument from watchlist
// ─────────────────────────────────────────────────────────────────
export function useRemoveInstrument(watchlistId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (instrumentToken: string) => {
      const res = await fetch(`/api/v1/watchlists/${watchlistId}/instruments/${instrumentToken}`, {
        method: 'DELETE',
      });
      
      if (!res.ok) throw new Error('Failed to remove instrument');
      return res.json();
    },
    onMutate: async (instrumentToken: string) => {
      await queryClient.cancelQueries({ queryKey: ['watchlist', watchlistId] });

      const previousWatchlist = queryClient.getQueryData<Stock[]>(['watchlist', watchlistId]);

      queryClient.setQueryData<Stock[]>(['watchlist', watchlistId], (current = []) =>
        current.filter((item) => item.instrumentToken !== instrumentToken)
      );

      return { previousWatchlist };
    },
    onError: (_error, _instrumentToken, context) => {
      if (context?.previousWatchlist) {
        queryClient.setQueryData(['watchlist', watchlistId], context.previousWatchlist);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist', watchlistId] });
    },
  });
}

