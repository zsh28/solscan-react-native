# Gestures - Technical Notes

## Why Gesture Handler in this app

For interaction-heavy UI (watchlist item deletion), native gesture recognition gives better latency and stability than JS-thread-only touch handling.

We moved from long-press confirmation to direct manipulation (swipe-to-delete), which is more aligned with mobile UX patterns.

## Setup implemented

### Dependency

Installed:

```bash
npx expo install react-native-gesture-handler
```

### Root integration

In `app/_layout.tsx`, the app is wrapped in:

```tsx
<GestureHandlerRootView style={{ flex: 1 }}>
  {/* existing providers + router stack */}
</GestureHandlerRootView>
```

Why this matters:

- Gesture Handler needs a root host view for proper event coordination.
- `flex: 1` ensures app content receives full layout and touch area.

## Swipe-to-delete architecture in watchlist

Implementation file: `app/(tabs)/watchlist.tsx`.

The screen now defines `SwipeableRow`, responsible for:

1. Tracking horizontal drag offset
2. Translating the row with user input
3. Revealing delete affordance behind the row
4. Triggering deletion when threshold is crossed

## Gesture object and callbacks

Core gesture:

```tsx
const panGesture = Gesture.Pan()
  .activeOffsetX([-10, 10])
  .onUpdate((event) => {
    translateX.value = Math.min(0, event.translationX);
  })
  .onEnd(() => {
    if (translateX.value < -110) {
      translateX.value = withSpring(-260);
      runOnJS(onDelete)(item.address);
    } else {
      translateX.value = withSpring(0);
    }
  });
```

Key decisions:

- Left-swipe only: `Math.min(0, event.translationX)` prevents right drag.
- Intent threshold: `-110` avoids accidental deletes.
- Spring snap-back keeps interaction native-feeling.

## Threading model and `runOnJS`

Gesture callbacks execute in a UI-thread worklet context.

Store mutation (`removeFavorite`) is JS-side React logic, so it cannot be called directly from the worklet. We bridge using:

```tsx
runOnJS(onDelete)(item.address)
```

Without `runOnJS`, deletion side effects may fail or be ignored.

## Visual feedback implementation

### Foreground card movement

- `translateX` shared value drives row transform.

### Background delete affordance

- Static red background view sits behind row.
- Opacity is derived from swipe distance:

```tsx
opacity: Math.min(1, Math.abs(translateX.value) / 100)
```

This gives progressive reveal and clearer affordance.

### Entrance animation composition

Each row is wrapped with `FadeInDown.delay(index * 60).springify()` so initial list appearance and gesture behavior feel consistent.

## UX changes from previous implementation

Before:

- Long press row
- Show alert
- Confirm delete

After:

- Swipe left row
- Immediate visual affordance
- Auto-delete after threshold crossing

Net effect: fewer taps, clearer intent, better native parity.

## Edge cases and constraints

- Very short swipes do not delete (threshold guard).
- If user releases before threshold, card snaps to origin.
- Deletion is state-driven via persisted store action, so list and storage remain in sync.

## Troubleshooting

If gestures fail:

1. Confirm root wrapper in `app/_layout.tsx`.
2. Confirm `GestureDetector` wraps the interactive row.
3. Confirm action callbacks crossing from worklets use `runOnJS`.
4. Restart app with cache clear if setup changed.
