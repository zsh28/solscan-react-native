# Navigation

Reference: https://docs.expo.dev/router/introduction/

## What changed and why it matters

The old app manually switched screens in `App.tsx` with local state.
That works for 2 screens, but becomes hard to maintain as soon as you add detail pages, nested flows, deep links, or auth redirects.

Expo Router gives you file-based navigation:

- Add a file -> add a route
- Add a folder + `_layout.tsx` -> add a navigator layer
- Use URL paths as your navigation contract (great for deep linking)

Before:

```text
App.tsx
src/screens/WalletScreen
src/screens/SwapScreen
```

After:

```text
app/(tabs)/index.tsx
app/(tabs)/swap.tsx
app/token/[mint].tsx
```

## Setup checklist

1) Install router-related deps

```bash
npx expo install expo-router expo-linking expo-constants expo-status-bar react-native-screens react-native-safe-area-context
```

2) Use router entry in `package.json`

```json
{
  "main": "expo-router/entry"
}
```

3) Ensure router plugin and scheme in `app.json`

```json
{
  "scheme": "solscan",
  "plugins": ["expo-router"]
}
```

## Route tree (current app)

```text
app/
|- _layout.tsx
|- (tabs)/
|  |- _layout.tsx
|  |- index.tsx
|  `- swap.tsx
`- token/
   `- [mint].tsx
```

URL mapping:

- `app/(tabs)/index.tsx` -> `/`
- `app/(tabs)/swap.tsx` -> `/swap`
- `app/token/[mint].tsx` -> `/token/:mint`

## Deep mental model: nested navigators

You have two navigation layers:

1) Root `Stack` in `app/_layout.tsx`
- Registers `(tabs)` as the base screen.
- Registers `token/[mint]` as a detail screen pushed above base.

2) Child `Tabs` in `app/(tabs)/_layout.tsx`
- Defines wallet and swap tabs.

Think of it as:

```text
Root Stack
|- (tabs)    <- persistent app shell
`- token/[mint] <- pushed on top when needed
```

### Why tabs disappear on token detail

- Because `/token/:mint` lives in the root stack, not inside `(tabs)`.
- Stack push overlays the entire tab navigator.
- Back pops the stack and reveals the previous tab state.

This is expected native behavior for “list -> detail” flows.

## Special route naming rules

- `_layout.tsx`: navigator wrapper for sibling routes.
- `index.tsx`: default child route for its folder.
- `(tabs)`: route group for organization; not part of URL.
- `[mint].tsx`: dynamic segment from URL path.

## Dynamic route flow (`[mint]`)

From wallet screen:

```tsx
router.push(`/token/${item.mint}`);
```

In `app/token/[mint].tsx`:

```tsx
const { mint } = useLocalSearchParams<{ mint: string }>();
```

Execution path:

1. User taps token row.
2. Router resolves `/token/<mint>` to `[mint].tsx`.
3. Screen reads param and fetches token details.
4. User taps back or swipes back.
5. Stack pops and returns to wallet tab.

## Navigation API behavior (important)

- `router.push(path)`
  - Adds a new history entry.
  - Back returns to previous screen.

- `router.replace(path)`
  - Replaces current history entry.
  - Back does not return to replaced screen.
  - Good for login/onboarding redirects.

- `router.back()`
  - Pops one level of navigation history.

- `Link`
  - Declarative navigation in JSX for static links.

## Deep linking behavior

With `scheme: "solscan"`, routes can be opened externally:

- `solscan://swap`
- `solscan://token/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`

This is important for wallet and cross-app flows.

## Practical migration steps recap

1. Create route structure under `app/`.
2. Build root stack in `app/_layout.tsx`.
3. Build tabs in `app/(tabs)/_layout.tsx`.
4. Move wallet/swap screens into route files.
5. Ensure every route component is `export default`.
6. Add dynamic token detail route.
7. Replace token rows with `router.push`.
8. Remove old entry files (`App.tsx`, `index.ts`).

## Troubleshooting

- No route found:
  - Check file is under `app/`.
  - Check default export exists.
  - Check `_layout.tsx` registration names match path.

- Tabs not visible:
  - Confirm `app/(tabs)/_layout.tsx` exists.
  - Confirm `index.tsx` route exists in `(tabs)`.

- Import errors after moving screens:
  - Fix relative paths, or use path aliases.

- Stale behavior after moving routes:

```bash
npx expo start --clear
```
