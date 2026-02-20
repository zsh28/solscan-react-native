# Persistent Storage

Reference: https://github.com/mrousavy/react-native-mmkv

## The problem

Zustand state lives in memory. Close the app → state is gone. Users lose their favorites, search history, and devnet preference on every restart.

The fix is persisting state to the phone's storage and rehydrating it on launch.

## MMKV vs AsyncStorage

|                | AsyncStorage      | MMKV              |
|----------------|-------------------|-------------------|
| Speed          | ~50ms per read    | ~0.01ms per read  |
| API            | async (needs await) | synchronous     |
| Size limit     | recommended <6MB  | handles 100MB+    |
| Used by        | Facebook (legacy) | WeChat (2B users) |

MMKV is synchronous — no `await`, no loading state needed for reads. For a crypto app that may eventually cache price data or full transaction history, this matters.

## Install

```bash
npx expo install react-native-mmkv
```

MMKV requires a native build. It will not work in Expo Go. To run it:

```bash
npx expo run:ios
# or
npx expo run:android
```

A JS-only fallback (in-memory object with the same interface) keeps the app runnable in Expo Go during development. The fallback is set up automatically in `app/lib/storage.ts` via a try/catch.

## Storage helper (`app/lib/storage.ts`)

Adapts MMKV to the interface that Zustand's `createJSONStorage` expects:

```tsx
import { MMKV } from "react-native-mmkv";

export const storage = new MMKV();

export const mmkvStorage = {
  getItem: (key: string): string | null => {
    const value = storage.getString(key);
    return value ?? null;
  },

  setItem: (key: string, value: string): void => {
    storage.set(key, value);
  },

  removeItem: (key: string): void => {
    storage.delete(key);
  },
};
```

The helper has three methods matching the `StateStorage` interface Zustand needs.

## Connecting Zustand to MMKV (`app/stores/wallet-store.ts`)

Wrap the store creator with `persist(...)`:

```tsx
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { mmkvStorage } from "../lib/storage";

export const useWalletStore = create<WalletState>()(
  persist(
    (set, get) => ({
      // ...same store logic as before...
    }),
    {
      name: "wallet-storage",                        // key written to MMKV
      storage: createJSONStorage(() => mmkvStorage), // adapter
    }
  )
);
```

What `persist` does:
- On every `set()` call, serializes the state to JSON and writes it to MMKV.
- On app launch, reads the JSON from MMKV and rehydrates the store before any component renders.
- Partial persistence: you can pass a `partialize` option to only persist specific keys.

## Verify it works

1. Search for a wallet and tap the heart to favorite it.
2. Force-close the app (swipe away from the app switcher).
3. Reopen — the favorite is still there, the devnet toggle remembers its position, the search history is intact.

## File structure added

```text
app/
`- lib/
   `- storage.ts    MMKV instance + Zustand-compatible adapter
```
