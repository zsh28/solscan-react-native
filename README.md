# SolScan

A React Native app to explore Solana wallets. View SOL balance, token holdings, and recent transactions for any wallet address.

## Features

- View SOL balance
- List token holdings
- Recent transaction history
- Direct links to Solscan explorer

## Setup

```bash
npm install
```

## Run

```bash
# iOS
npx expo run:ios

# Android
npx expo run:android

# Development server
npx expo start
```

## Tech

- React Native + Expo
- Solana JSON-RPC (no SDK required)
- Expo Router (file-based navigation)

## Navigation Deep Dive

This app uses nested Expo Router navigators:

```text
app/
|- _layout.tsx                (Root Stack)
|- (tabs)/
|  |- _layout.tsx             (Bottom Tabs)
|  |- index.tsx               (/)
|  `- swap.tsx                (/swap)
`- token/
   `- [mint].tsx              (/token/:mint)
```

How to think about this structure:

- `app/_layout.tsx` is the root `Stack` navigator.
- `app/(tabs)/_layout.tsx` is a child `Tabs` navigator mounted as the base screen in that stack.
- `app/token/[mint].tsx` is a stack detail route that pushes on top of tabs.

Why the tab bar disappears on token detail:

- Token detail is in the root stack, not inside the tabs group.
- Pushing `/token/:mint` covers the tabs layer.
- `router.back()` pops the stack and returns to the previous tab state.

Important route naming rules:

- `_layout.tsx`: navigator wrapper for sibling routes.
- `index.tsx`: default route for its folder.
- `(tabs)`: route group for organization (not included in URL).
- `[mint].tsx`: dynamic segment captured from the URL.

Navigation methods used:

- `router.push(...)`: add new screen to history.
- `router.replace(...)`: replace current screen in history.
- `router.back()`: pop one screen.
- `useLocalSearchParams()`: read dynamic params like `mint`.

## Notes

- Page 1 (SolScan Lite): `docs/page-1-solscan-lite/README.md`
- Page 2 (Navigation): `docs/page-2-navigation/README.md`
