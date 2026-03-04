# Gestures - Detailed Technical Notes

## Why gestures matter

Gestures turn static interfaces into direct manipulation experiences. Instead of tapping buttons for every action, users can drag, swipe, pinch, and long-press to control UI more naturally.

High-quality gesture handling improves:

- perceived speed
- control precision
- platform-native feel

## Why use Gesture Handler

React Native Gesture Handler provides native-driven recognition and better conflict resolution than basic touch responders for complex interactions.

Benefits:

- smooth recognition for pan/swipe interactions
- better composition of multiple gestures
- stronger behavior under load

## Core concepts

## Gesture objects

Gestures are defined declaratively, for example:

- Pan: drag or swipe
- Tap: single or multi-tap
- LongPress: hold actions
- Pinch: zoom
- Rotation: rotate media/canvas

## Lifecycle callbacks

Typical callback flow:

- `onBegin`
- `onUpdate`
- `onEnd`
- `onFinalize`

Use cases by stage:

- `onBegin`: capture initial state
- `onUpdate`: update motion values
- `onEnd`: decide final state (commit or rollback)
- `onFinalize`: cleanup

## Common event properties (Pan)

- `translationX`, `translationY`
- `velocityX`, `velocityY`
- absolute touch coordinates

These values power threshold logic and snapping behavior.

## Canonical product use cases

## Example: swipe to delete

```tsx
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

function SwipeRow({ onDelete, children }: { onDelete: () => void; children: React.ReactNode }) {
  const translateX = useSharedValue(0);

  const pan = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onUpdate((event) => {
      translateX.value = Math.min(0, event.translationX);
    })
    .onEnd(() => {
      if (translateX.value < -96) {
        runOnJS(onDelete)();
      } else {
        translateX.value = withSpring(0);
      }
    });

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={style}>{children}</Animated.View>
    </GestureDetector>
  );
}
```

Use when:

- users need fast destructive actions in list-heavy screens
- you still provide an alternate delete action for accessibility

## Example: pull to refresh gesture wrapper

```tsx
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";

function PullToRefresh({ onRefresh, children }: { onRefresh: () => Promise<void>; children: React.ReactNode }) {
  const pullY = useSharedValue(0);

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      if (e.translationY > 0) pullY.value = Math.min(90, e.translationY * 0.5);
    })
    .onEnd(() => {
      if (pullY.value > 60) runOnJS(onRefresh)();
      pullY.value = withSpring(0);
    });

  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: pullY.value }],
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={contentStyle}>{children}</Animated.View>
    </GestureDetector>
  );
}
```

Use when:

- the view is a top-level feed/timeline
- you want custom refresh visuals beyond default `RefreshControl`

## Example: double tap to like

```tsx
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from "react-native-reanimated";

function DoubleTapLike({ onLike, children }: { onLike: () => void; children: React.ReactNode }) {
  const scale = useSharedValue(0);

  const tap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      scale.value = withSequence(withTiming(1.2, { duration: 140 }), withTiming(1, { duration: 120 }));
      runOnJS(onLike)();
    });

  const heartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: scale.value,
  }));

  return (
    <GestureDetector gesture={tap}>
      <Animated.View>
        {children}
        <Animated.View style={[{ position: "absolute", alignSelf: "center" }, heartStyle]}>{/* heart icon */}</Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}
```

Use when:

- the action is very frequent and should be low-friction
- visual feedback confirms successful interaction

## Swipe to delete/archive

Interaction model:

- User swipes list row left/right
- Background action revealed
- Crossing threshold commits action
- Otherwise row snaps back

Best for:

- inboxes
- task lists
- watchlists

## Pull to refresh

Interaction model:

- User drags down at top of list
- Indicator appears with progress
- Release past threshold triggers refresh

Best for:

- feeds
- timelines
- transaction history

## Drag and reorder

Interaction model:

- Long press to pick up item
- Drag to new position
- Drop to commit ordering

Best for:

- playlists
- dashboard widgets
- priority task boards

## Double tap to like/favorite

Interaction model:

- Two taps in quick succession
- Fire action + visual confirmation animation

Best for:

- media apps
- social feeds

## Pinch to zoom

Interaction model:

- Scale content around focal point
- Clamp scale range
- Optional inertial settle on release

Best for:

- images
- charts
- maps

## Gesture composition strategies

## Simultaneous

Allow two gestures together (example: pinch + pan on image).

## Exclusive

Prioritize one gesture over another (example: long press vs single tap).

## Race

First recognized gesture wins (example: left-swipe vs right-swipe action).

## Scroll conflict management

Gestures often compete with `ScrollView`/`FlatList`.

Practical techniques:

- configure `activeOffsetX`/`activeOffsetY`
- require minimum distance before activation
- constrain direction (horizontal-only, vertical-only)

Goal: scroll should feel normal, while intentional gestures still trigger reliably.

## Threading and `runOnJS`

When gesture callbacks run in UI-thread worklets, JS-side state updates must be bridged using `runOnJS`.

Use `runOnJS` for:

- React state setters
- navigation calls
- analytics events
- store mutations

Do not put heavy JS operations in high-frequency update callbacks.

## UX and safety guidance

- Always provide visual affordance for destructive gestures.
- Use clear thresholds to prevent accidental actions.
- Prefer preview + commit patterns for risky actions.
- Add haptic feedback where available.
- Keep cancellation easy (snap-back behavior).

## Accessibility guidance

- Do not make gestures the only way to trigger critical actions.
- Provide accessible alternatives (button/menu action).
- Ensure touch targets are large enough.
- Preserve predictable behavior across screen sizes.

## Anti-patterns to avoid

- Hidden destructive actions with no visual cue
- Overly sensitive thresholds causing accidental triggers
- Gesture logic that blocks normal scrolling
- Too many conflicting gestures on one element
- Non-recoverable actions with immediate irreversible commit

## Production checklist

1. Gesture root view configured correctly.
2. Thresholds tuned on real devices.
3. Scroll conflict tested with fast and slow drags.
4. Accessibility fallback actions provided.
5. Analytics captures gesture success/failure rates.
