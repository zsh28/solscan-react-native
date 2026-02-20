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

  // Actions
  addFavorite: (address: string) => void;
  removeFavorite: (address: string) => void;
  isFavorite: (address: string) => boolean;
  addToHistory: (address: string) => void;
  clearHistory: () => void;
  toggleNetwork: () => void;
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

      addFavorite: (address) =>
        set((state) => ({
          favorites: state.favorites.includes(address)
            ? state.favorites // already saved, skip
            : [address, ...state.favorites],
        })),

      removeFavorite: (address) =>
        set((state) => ({
          favorites: state.favorites.filter((a) => a !== address),
        })),

      // Reads current state without triggering a re-render.
      isFavorite: (address) => get().favorites.includes(address),

      addToHistory: (address) =>
        set((state) => ({
          searchHistory: [
            address,
            // Remove any earlier occurrence so the latest is always first.
            ...state.searchHistory.filter((a) => a !== address),
          ].slice(0, 20), // cap at 20 entries
        })),

      clearHistory: () => set({ searchHistory: [] }),

      toggleNetwork: () =>
        set((state) => ({ isDevnet: !state.isDevnet })),
    }),
    {
      name: "wallet-storage",                    // MMKV key
      storage: createJSONStorage(() => mmkvStorage),
    }
  )
);
