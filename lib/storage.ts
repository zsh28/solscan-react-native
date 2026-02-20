// MMKV requires a native (dev build) environment.
// In Expo Go (JS-only) the createMMKV call throws at runtime, so we catch
// that and fall back to a plain in-memory object with the same interface.

import { createMMKV } from "react-native-mmkv";

// Minimal subset of the MMKV interface that this module needs.
// Note: v3 renamed `delete` → `remove`.
type MMKVLike = {
  getString(key: string): string | undefined;
  set(key: string, value: string): void;
  remove(key: string): boolean;
};

let mmkvInstance: MMKVLike;

try {
  mmkvInstance = createMMKV();
} catch {
  // Expo Go fallback — keeps the app runnable without a native build.
  const mem: Record<string, string> = {};
  mmkvInstance = {
    getString: (key: string) => mem[key],
    set: (key: string, value: string) => { mem[key] = value; },
    remove: (key: string) => { delete mem[key]; return true; },
  };
}

export const storage = mmkvInstance;

// Adapts MMKV (or its fallback) to the interface Zustand's
// createJSONStorage expects.
export const mmkvStorage = {
  getItem: (key: string): string | null => {
    const value = mmkvInstance.getString(key);
    return value ?? null;
  },

  setItem: (key: string, value: string): void => {
    mmkvInstance.set(key, value);
  },

  removeItem: (key: string): void => {
    mmkvInstance.remove(key);
  },
};
