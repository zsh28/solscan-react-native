# Animations - Technical Notes

## Why Reanimated in this app

React Native animations can run on the JS thread (classic approach) or on the UI thread (Reanimated worklets). In this app, we added animation where network-bound screens are active (wallet search and watchlist), so UI-thread execution is important for maintaining responsiveness during fetches and rerenders.

Key outcome: visual transitions stay smooth while RPC calls are running.

## Setup implemented

### Dependency

Installed:

```bash
npx expo install react-native-reanimated
```

### Babel configuration

Added `babel.config.js`:

```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: ["react-native-reanimated/plugin"],
  };
};
```

Important constraints:

- Reanimated plugin must be last in Babel plugins.
- Cache clear (`npx expo start -c`) is needed after setup changes.

## Reanimated primitives used in codebase

### 1) `useSharedValue`

Used for animation state that should not trigger React rerenders.

In `app/(tabs)/index.tsx` (`ScalePressable`):

- `scale` is a shared value.
- Updated in `onPressIn` and `onPressOut`.

### 2) `useAnimatedStyle`

Used to derive style from shared values on UI thread.

In `ScalePressable`:

- Animated style maps `scale.value` to `transform: [{ scale }]`.

### 3) animation functions

- `withTiming(0.97, { duration: 80 })` for instant press-in feedback.
- `withSpring(1, { damping: 15 })` for natural press-out recovery.
- `FadeInDown.delay(...).springify()` for staggered item entrance.

## Screen-level implementation details

## `app/(tabs)/index.tsx`

### `ScalePressable` component

Purpose: provide reusable press feedback animation without rewriting logic for each button.

Behavior:

- Wraps `Pressable` in `Animated.View`.
- Shrinks to `0.97` scale during press-in.
- Springs back to `1` on press-out.

Applied to:

- Search button
- Demo button
- Recent search rows

Benefits:

- Better tactile feedback
- Consistent interaction style
- Minimal code duplication

### Entering transitions

Applied `FadeInDown` to:

- Balance card container
- Token list rows (staggered by `index * 70`)
- Transaction rows (staggered by `index * 50`)

Design rationale:

- Staggering improves visual hierarchy when results appear.
- Animation timing is short enough not to block information access.

## `app/(tabs)/watchlist.tsx`

Rows are wrapped with:

```tsx
<Animated.View entering={FadeInDown.delay(index * 60).springify()}>
  <SwipeableRow ... />
</Animated.View>
```

This keeps watchlist updates visually coherent when balances refresh or rows are removed.

## Performance and safety notes

- Shared values avoid component rerenders for motion updates.
- Animated transforms are GPU-friendly compared to layout-heavy style changes.
- Animation logic remains small and deterministic (no heavy computations in animated style callbacks).

## Troubleshooting checklist

If animations do not run:

1. Verify `babel.config.js` exists.
2. Verify `react-native-reanimated/plugin` is present.
3. Restart with cache clear:

```bash
npx expo start -c
```

4. Ensure animated props are applied to `Animated.*` components where required.
