import { create } from 'zustand';
import { Stock } from '@paper-market/core';

export type SearchMode = "ALL" | "EQUITY" | "FUTURE" | "OPTION";

interface SearchState {
  isOpen: boolean;
  searchMode: SearchMode;
  placeholder: string;
  onSelect?: (stock: Stock) => void;
  
  openSearch: (options?: {
    mode?: SearchMode;
    placeholder?: string;
    onSelect?: (stock: Stock) => void;
  }) => void;
  closeSearch: () => void;
}

export const useSearchStore = create<SearchState>((set) => ({
  isOpen: false,
  searchMode: "ALL",
  placeholder: "Search stocks, indices, commodities...",
  onSelect: undefined,

  openSearch: (options) => set({
    isOpen: true,
    searchMode: options?.mode ?? "ALL",
    placeholder: options?.placeholder ?? "Search stocks, indices, commodities...",
    onSelect: options?.onSelect
  }),
  
  closeSearch: () => set({ isOpen: false, onSelect: undefined }),
}));
