// MMKV requires a native (dev build) environment.
// In Expo Go (JS-only) MMKV is unavailable, so we fall back to a plain
// in-memory object that satisfies the same interface.  Swap in the real
// MMKV block once you run `npx expo run:ios` or `npx expo run:android`.

let mmkvInstance: {
  getString: (key: string) => string | undefined;
  set: (key: string, value: string) => void;
  delete: (key: string) => void;
};

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { MMKV } = require("react-native-mmkv");
  mmkvInstance = new MMKV();
} catch {
  // Expo Go fallback — keeps the app runnable without a native build.
  const mem: Record<string, string> = {};
  mmkvInstance = {
    getString: (key) => mem[key],
    set: (key, value) => { mem[key] = value; },
    delete: (key) => { delete mem[key]; },
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
    mmkvInstance.delete(key);
  },
};
