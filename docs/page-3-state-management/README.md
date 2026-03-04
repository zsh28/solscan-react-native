# State Management (Zustand)

Reference: https://zustand.docs.pmnd.rs/

## When to introduce global state

Use local `useState` for screen-only state.

Use global state when:

- multiple screens need shared data
- settings should affect behavior app-wide
- you need central actions with consistent rules

## Why Zustand

Zustand is lightweight and selective:

- no provider ceremony for basic usage
- selector-based subscriptions reduce rerenders
- simple API (`create`, `set`, `get`)

## Example store

```tsx
import { create } from "zustand";

type AppState = {
  theme: "light" | "dark";
  favorites: string[];
  setTheme: (theme: "light" | "dark") => void;
  addFavorite: (id: string) => void;
  removeFavorite: (id: string) => void;
};

export const useAppStore = create<AppState>((set, get) => ({
  theme: "light",
  favorites: [],
  setTheme: (theme) => set({ theme }),
  addFavorite: (id) =>
    set((state) => ({
      favorites: state.favorites.includes(id) ? state.favorites : [id, ...state.favorites],
    })),
  removeFavorite: (id) =>
    set((state) => ({ favorites: state.favorites.filter((x) => x !== id) })),
}));
```

## Example usage with selectors

```tsx
const theme = useAppStore((s) => s.theme);
const setTheme = useAppStore((s) => s.setTheme);
const favoritesCount = useAppStore((s) => s.favorites.length);
```

Why selectors matter:

- component rerenders only when selected slice changes

## Common use cases

- favorites/watchlist across tabs
- auth/session metadata
- app-wide feature flags
- network/environment toggles

## Modeling guidance

- keep state flat where possible
- group write logic into clear action functions
- avoid putting raw server data in global store if TanStack Query already owns it

## Interaction with data fetching

Good split:

- Zustand: UI and app-level client state
- TanStack Query: server state and cache lifecycle

## Anti-patterns

- storing everything globally “just in case”
- mutating arrays/objects directly
- subscribing to entire store in large components
- duplicating same source of truth in local + global state
