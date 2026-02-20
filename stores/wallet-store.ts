import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { mmkvStorage } from "../lib/storage";

// ============================================
// Types
// ============================================

interface WalletState {
  // Persisted data
  favorites: string[];       // saved wallet addresses
  searchHistory: string[];   // recently searched addresses (newest first)
  isDevnet: boolean;         // true = Devnet RPC, false = Mainnet RPC

  // Hydration flag — false until persist middleware has loaded from storage.
  // Read this before rendering counts that depend on persisted data.
  _hasHydrated: boolean;

  // Actions
  addFavorite: (address: string) => void;
  removeFavorite: (address: string) => void;
  isFavorite: (address: string) => boolean;
  addToHistory: (address: string) => void;
  clearHistory: () => void;
  toggleNetwork: () => void;
  setHasHydrated: (value: boolean) => void;
}

// ============================================
// Store
// ============================================

export const useWalletStore = create<WalletState>()(
  persist(
    (set, get) => ({
      // Initial values — overwritten by persisted data on rehydration.
      favorites: [],
      searchHistory: [],
      isDevnet: false,
      _hasHydrated: false,

      addFavorite: (address) =>
        set((state) => ({
          favorites: state.favorites.includes(address)
            ? state.favorites
            : [address, ...state.favorites],
        })),

      removeFavorite: (address) =>
        set((state) => ({
          favorites: state.favorites.filter((a) => a !== address),
        })),

      isFavorite: (address) => get().favorites.includes(address),

      addToHistory: (address) =>
        set((state) => ({
          searchHistory: [
            address,
            ...state.searchHistory.filter((a) => a !== address),
          ].slice(0, 20),
        })),

      clearHistory: () => set({ searchHistory: [] }),

      toggleNetwork: () =>
        set((state) => ({ isDevnet: !state.isDevnet })),

      setHasHydrated: (value) => set({ _hasHydrated: value }),
    }),
    {
      name: "wallet-storage",
      storage: createJSONStorage(() => mmkvStorage),
      // _hasHydrated is runtime-only — never write it to storage.
      partialize: (state) => ({
        favorites: state.favorites,
        searchHistory: state.searchHistory,
        isDevnet: state.isDevnet,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
