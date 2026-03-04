# Page 8 - Animations, Gestures, and Data Fetching

This folder contains deep technical notes for the three topics integrated into the app.

## Detailed Notes

1. `animations.md`
   - React Native Reanimated architecture (UI thread vs JS thread)
   - App-level setup and Babel requirements
   - Press feedback, list enter animations, and implementation details in `app/(tabs)/index.tsx`

2. `gestures.md`
   - Gesture Handler architecture and lifecycle callbacks
   - `GestureHandlerRootView` requirements
   - Swipe-to-delete implementation in `app/(tabs)/watchlist.tsx`

3. `data-fetching.md`
   - TanStack Query architecture and cache lifecycle
   - Query client defaults in `app/_layout.tsx`
   - Solana RPC hooks in `hooks/useSolanaQueries.ts`
   - Migration from manual `useState/useEffect` fetching to query hooks in `app/(tabs)/index.tsx`

## Implementation Files

| File | Purpose |
|---|---|
| `app/_layout.tsx` | App providers for Query + Gesture + existing app context |
| `babel.config.js` | Reanimated Babel plugin setup |
| `hooks/useSolanaQueries.ts` | Reusable query hooks for wallet data |
| `app/(tabs)/index.tsx` | Reanimated polish + TanStack Query integration |
| `app/(tabs)/watchlist.tsx` | Gesture-driven swipe deletion + animated rows |

## Primary References

| Resource | Link |
| --- | --- |
| Reanimated Docs | https://docs.swmansion.com/react-native-reanimated/ |
| Gesture Handler Docs | https://docs.swmansion.com/react-native-gesture-handler/ |
| TanStack Query Docs | https://tanstack.com/query/latest |
