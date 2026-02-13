# Navigation

Reference: https://docs.expo.dev/router/introduction/

## What We Are Doing and Why

The app originally used manual screen switching in `App.tsx` with `useState`.
Expo Router replaces that with file-based routing so each screen is a file, and navigation scales cleanly.

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

## Step 1: Install dependencies

```bash
npx expo install expo-router expo-linking expo-constants expo-status-bar react-native-screens react-native-safe-area-context
```

## Step 2: Update package entry

Set in `package.json`:

```json
{
  "main": "expo-router/entry"
}
```

## Step 3: Update app config

In `app.json` under `expo`:

```json
{
  "scheme": "solscan",
  "plugins": ["expo-router"]
}
```

## Step 4: Route file structure

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

### Special names

- `_layout.tsx`: navigator wrapper for sibling routes
- `index.tsx`: default route in a folder
- `(tabs)`: route group (not part of URL)
- `[mint].tsx`: dynamic route parameter

## Step 5: Root layout

`app/_layout.tsx` uses a root `Stack` with:

- `(tabs)` as base navigator
- `token/[mint]` as detail screen on top

## Step 6: Tab layout

`app/(tabs)/_layout.tsx` uses `Tabs` and defines:

- `index` tab -> Wallet
- `swap` tab -> Swap
- tab icons and colors

## Step 7: Move screens to routes

- `src/screens/WalletScreen.tsx` -> `app/(tabs)/index.tsx`
- `src/screens/SwapScreen.tsx` -> `app/(tabs)/swap.tsx`

Important: each route file must use `export default`.

## Step 8: Remove old entry files

- remove `App.tsx`
- remove `index.ts`
- remove old `src/screens` files after migration

## Step 9: Dynamic token detail route

`app/token/[mint].tsx`:

- reads `mint` using `useLocalSearchParams`
- fetches token supply data
- renders detail UI
- supports `router.back()`

## Step 10: Navigate to token detail

From wallet token row press:

```tsx
router.push(`/token/${item.mint}`);
```

## Step 11: Run clean

```bash
npx expo start --clear
```

## Mental model

- File = route
- Layout file = navigator wrapper
- Route groups organize navigator structure without changing URL
- Dynamic segments capture URL params

## Navigation cheat sheet

```tsx
router.push("/swap");
router.push(`/token/${mint}`);
router.replace("/swap");
router.back();
```

```tsx
const { mint } = useLocalSearchParams<{ mint: string }>();
```

## Common errors

- Missing default export in route file
- Missing `(tabs)/_layout.tsx`
- Wrong path after moving files
- Stale Metro cache (use `--clear`)
