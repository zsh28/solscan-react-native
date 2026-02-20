# State Management

Reference: https://zustand.docs.pmnd.rs/

## The problem with local state only

Each screen manages its own `useState`. That works for a single screen, but breaks as soon as two screens need the same data.

Examples:
- Explorer tab favorites a wallet → Settings tab has no idea.
- Devnet toggle changed in Settings → Explorer still hits mainnet RPC.
- Search history lives in Explorer → can't be cleared from Settings.

The fix is global state: one store any screen can read and write.

## Why Zustand and not Context

React Context re-renders every consumer when any value changes.
Zustand only re-renders the component that subscribes to the specific slice that changed.

In a list of 100 items, Context re-renders all 100. Zustand re-renders the one that changed.

Why not Redux? Redux needs actions, reducers, dispatchers, middleware, and boilerplate files. Zustand does the same in ~30 lines.

## Install

```bash
npm install zustand
```

## Store shape (`app/stores/wallet-store.ts`)

```tsx
import { create } from "zustand";

interface WalletState {
  favorites: string[];
  searchHistory: string[];
  isDevnet: boolean;

  addFavorite: (address: string) => void;
  removeFavorite: (address: string) => void;
  isFavorite: (address: string) => boolean;
  addToHistory: (address: string) => void;
  clearHistory: () => void;
  toggleNetwork: () => void;
}

export const useWalletStore = create<WalletState>((set, get) => ({
  favorites: [],
  searchHistory: [],
  isDevnet: false,

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

  toggleNetwork: () => set((state) => ({ isDevnet: !state.isDevnet })),
}));
```

Key concepts:
- `create<WalletState>()` — creates the store with typed state.
- `set()` — updates state. Always returns a new object, never mutates.
- `get()` — reads current state inside an action without causing a re-render.
- No Provider wrapper needed. Import the hook, use it anywhere.

## Using the store in components

Subscribe to only the slice you need. The component only re-renders when that specific value changes.

```tsx
// In Explorer (app/(tabs)/index.tsx)
const addToHistory = useWalletStore((s) => s.addToHistory);
const searchHistory = useWalletStore((s) => s.searchHistory);
const isDevnet = useWalletStore((s) => s.isDevnet);

// In Settings (app/(tabs)/settings.tsx)
const isDevnet = useWalletStore((s) => s.isDevnet);
const toggleNetwork = useWalletStore((s) => s.toggleNetwork);
const favorites = useWalletStore((s) => s.favorites);
const clearHistory = useWalletStore((s) => s.clearHistory);
```

Both screens share the same store instance. Toggle devnet in Settings → Explorer immediately uses the devnet RPC. No prop drilling, no Provider.

## FavoriteButton component (`app/components/FavoriteButton.tsx`)

A reusable component that reads from and writes to the store directly. The parent screen only needs to pass the wallet address.

```tsx
import { useWalletStore } from "../stores/wallet-store";

export function FavoriteButton({ address }: { address: string }) {
  const addFavorite    = useWalletStore((s) => s.addFavorite);
  const removeFavorite = useWalletStore((s) => s.removeFavorite);
  const isFavorite     = useWalletStore((s) => s.isFavorite);

  const favorited = isFavorite(address);

  return (
    <TouchableOpacity onPress={() => favorited ? removeFavorite(address) : addFavorite(address)}>
      <Ionicons name={favorited ? "heart" : "heart-outline"} size={24} color={favorited ? "#FF4545" : "#666"} />
    </TouchableOpacity>
  );
}
```

Zustand updates are synchronous so the heart icon fills/unfills instantly on tap.

## Devnet banner pattern

The Explorer screen derives the RPC endpoint from the store:

```tsx
const MAINNET = "https://api.mainnet-beta.solana.com";
const DEVNET  = "https://api.devnet.solana.com";

const isDevnet = useWalletStore((s) => s.isDevnet);
const RPC = isDevnet ? DEVNET : MAINNET;

// Banner renders conditionally
{isDevnet && (
  <View style={s.devnetBanner}>
    <Text style={s.devnetText}>DEVNET — Testing network</Text>
  </View>
)}
```

## File structure added

```text
app/
|- stores/
|  `- wallet-store.ts    global Zustand store
`- components/
   `- FavoriteButton.tsx heart toggle backed by the store
```
