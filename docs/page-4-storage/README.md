# Persistent Storage (MMKV)

Reference: https://github.com/mrousavy/react-native-mmkv

## Why persistence matters

Without persistence, app state resets on every app restart. This hurts UX for settings, preferences, and recently used data.

Persistent storage should be used for:

- user preferences
- lightweight cached app metadata
- recently viewed/searched items

## MMKV vs AsyncStorage

- MMKV: synchronous, very fast, native-backed
- AsyncStorage: async API, simpler mental model but slower for frequent reads

Use MMKV when you need:

- low-latency reads on app startup
- high-frequency preference access

## Example MMKV adapter

```tsx
import { MMKV } from "react-native-mmkv";

export const storage = new MMKV();

export const mmkvStorage = {
  getItem: (key: string): string | null => storage.getString(key) ?? null,
  setItem: (key: string, value: string): void => storage.set(key, value),
  removeItem: (key: string): void => storage.delete(key),
};
```

## Example: Zustand persistence middleware

```tsx
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { mmkvStorage } from "./storage";

type SettingsState = {
  language: "en" | "es";
  notificationsEnabled: boolean;
  setLanguage: (language: "en" | "es") => void;
  setNotificationsEnabled: (value: boolean) => void;
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      language: "en",
      notificationsEnabled: true,
      setLanguage: (language) => set({ language }),
      setNotificationsEnabled: (value) => set({ notificationsEnabled: value }),
    }),
    {
      name: "settings-storage",
      storage: createJSONStorage(() => mmkvStorage),
    }
  )
);
```

## Production use-case patterns

- onboarding completed flag
- preferred currency/language
- last selected network/environment
- local feature flag overrides

## Data you should avoid persisting blindly

- large response payloads better owned by query cache
- secrets without encryption strategy
- high-churn transient UI state

## Reliability guidance

- version your stored schema when shape changes
- provide migration/fallback for incompatible data
- handle corrupted values defensively

## Testing checklist

1. Write value, restart app, confirm rehydration.
2. Clear storage path and confirm sane defaults.
3. Validate behavior after schema change.
