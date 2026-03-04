# Animations - Detailed Technical Notes

## Why animations matter

Animations are not decoration only. In product UX, they communicate state change, hierarchy, causality, and responsiveness.

Good animation helps users answer:

- What changed?
- Where did this element come from?
- What action just happened?
- Is the app still working?

Without motion, UI can feel abrupt and harder to parse.

## Performance model: JS thread vs UI thread

In React Native, heavy JavaScript work (network parsing, rerenders, business logic) can block JS-driven animations. Reanimated runs worklets on the UI thread, so motion can stay smooth even if JS is busy.

Practical rule:

- Critical interaction motion (press, drag, transitions) should be UI-thread capable.

## Core Reanimated primitives

## 1) `useSharedValue`

Mutable animation state that does not trigger React rerenders.

Use for:

- opacity
- scale
- translateX / translateY
- progress values (0 to 1)

## 2) `useAnimatedStyle`

Maps shared values to styles in worklet context.

Best for:

- transforms
- opacity
- color interpolation

Keep callback logic small and deterministic.

## 3) animation drivers

- `withTiming`: predictable duration/easing
- `withSpring`: natural, physics-based motion
- `withSequence`: chained transitions
- `withDelay`: delayed start
- `withRepeat`: loop effects (use sparingly)

## Common animation patterns and use cases

## Example: press-scale feedback

```tsx
import React from "react";
import { Pressable, Text, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from "react-native-reanimated";

export function ScaleButton({ label, onPress }: { label: string; onPress: () => void }) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        style={s.button}
        onPress={onPress}
        onPressIn={() => {
          scale.value = withTiming(0.97, { duration: 90 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 16, stiffness: 180 });
        }}
      >
        <Text style={s.label}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  button: {
    backgroundColor: "#111827",
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 12,
    alignItems: "center",
  },
  label: { color: "#fff", fontWeight: "600" },
});
```

When to use:

- primary and secondary buttons
- tappable cards
- row actions

## Example: staggered list entrance

```tsx
import Animated, { FadeInDown } from "react-native-reanimated";

<FlatList
  data={items}
  keyExtractor={(item) => item.id}
  renderItem={({ item, index }) => (
    <Animated.View entering={FadeInDown.delay(index * 60).springify()}>
      <ItemRow item={item} />
    </Animated.View>
  )}
/>
```

When to use:

- feed items after search
- transaction history
- notification center

## Example: loading skeleton pulse

```tsx
import { useEffect } from "react";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

function SkeletonBar() {
  const opacity = useSharedValue(0.35);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.8, { duration: 850 }), -1, true);
  }, [opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return <Animated.View style={[{ height: 14, borderRadius: 8, backgroundColor: "#2D3748" }, style]} />;
}
```

When to use:

- first-page load before real content is available
- replacing abrupt full-screen spinners

## Press feedback

Pattern:

- On press-in: scale down quickly (`withTiming`)
- On press-out: spring back (`withSpring`)

Use cases:

- Buttons
- Cards
- List rows

Why it works: immediate tactile confirmation.

## Enter/exit transitions

Pattern:

- Enter with fade + slight translation
- Exit with fade or directional slide

Use cases:

- Search results
- Modal content
- Toasts
- List filtering

Why it works: preserves continuity when content updates.

## Staggered list reveal

Pattern:

- Delay by index (`index * stepMs`)

Use cases:

- Transaction history
- Notification feed
- Product cards

Why it works: improves readability and reduces visual overload.

## Skeleton and loading pulse

Pattern:

- Opacity loop while data is loading

Use cases:

- Dashboard cards
- Profile sections
- Feed placeholders

Why it works: sets user expectation that content is on the way.

## Motion design guidelines for product teams

- Keep most transitions within 120ms to 350ms.
- Use spring for direct manipulation, timing for structural changes.
- Prefer subtle distance (4 to 24 px) over dramatic movement.
- Animate meaningfully; avoid animation for every element.
- Match easing to intent:
  - ease-out for entering content
  - spring for physical interaction

## Accessibility and reduced motion

Motion should not reduce usability.

Recommendations:

- Respect reduced-motion settings where possible.
- Avoid large parallax or constant pulsing.
- Keep text stable and readable during animation.
- Never hide critical actions behind long motion.

## Anti-patterns to avoid

- Long, slow transitions that block task completion
- Infinite loops that draw attention away from content
- Animating expensive layout properties unnecessarily
- Chaining too many transitions on first render
- Motion that changes unpredictably per frame

## Debugging checklist

If animation appears broken or janky:

1. Validate Reanimated setup and Babel plugin order.
2. Ensure animated styles are used on `Animated.*` components.
3. Move heavy calculations out of animated callbacks.
4. Avoid excessive rerenders in parent components.
5. Test on a lower-end device profile before shipping.

## Example architecture for teams

- Build a small animation utility layer:
  - shared durations
  - shared spring presets
  - helper wrappers for common interactions
- Standardize interaction states:
  - idle
  - pressed
  - loading
  - success
- Use design tokens for motion to keep behavior consistent.
