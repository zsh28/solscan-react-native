# Keyboard Handling

## The problem

On mobile, the software keyboard takes up roughly half the screen when it opens. If a `TextInput` sits near the bottom of the screen, the keyboard slides up and covers it. The user types blind.

Two components fix this: `KeyboardAvoidingView` and `TouchableWithoutFeedback`.

## KeyboardAvoidingView

Pushes the content above the keyboard as it opens.

```tsx
import { KeyboardAvoidingView, Platform } from "react-native";

<KeyboardAvoidingView
  behavior={Platform.OS === "ios" ? "padding" : "height"}
  style={{ flex: 1 }}
>
  {/* Your content and TextInputs */}
</KeyboardAvoidingView>
```

`behavior` options:
- `"padding"` (iOS): adds bottom padding equal to the keyboard height. Pushes content up.
- `"height"` (Android): shrinks the view height. Android handles keyboard insets differently.

`Platform.OS` is `"ios"` or `"android"` at runtime. This one check handles both platforms correctly.

Always pair `KeyboardAvoidingView` with `style={{ flex: 1 }}` so it fills the available space.

## Dismiss keyboard on tap

Users expect to close the keyboard by tapping anywhere outside the input. React Native does not do this automatically.

```tsx
import { TouchableWithoutFeedback, Keyboard } from "react-native";

<TouchableWithoutFeedback onPress={Keyboard.dismiss}>
  <View style={{ flex: 1 }}>
    {/* Screen content */}
  </View>
</TouchableWithoutFeedback>
```

`TouchableWithoutFeedback` captures the tap without showing any visual feedback (no ripple, no opacity change). It wraps the entire screen so any tap outside the input triggers `Keyboard.dismiss`.

`Keyboard.dismiss` is a static method — no hook needed.

## Combining both

Wrap in this order: `TouchableWithoutFeedback` on the outside (catches taps), `KeyboardAvoidingView` on the inside (adjusts layout).

```tsx
<TouchableWithoutFeedback onPress={Keyboard.dismiss}>
  <KeyboardAvoidingView
    behavior={Platform.OS === "ios" ? "padding" : "height"}
    style={{ flex: 1 }}
  >
    <ScrollView keyboardShouldPersistTaps="handled">
      {/* Content */}
    </ScrollView>
  </KeyboardAvoidingView>
</TouchableWithoutFeedback>
```

`keyboardShouldPersistTaps="handled"` on `ScrollView` ensures taps on buttons inside the scroll view still fire even while the keyboard is open, instead of just dismissing the keyboard and eating the tap.

## Where this is used in SolScan

Applied in `app/(tabs)/index.tsx` around the entire wallet explorer screen. The search input is near the top, so keyboard overlap is not severe here, but the pattern is correct for any screen that has inputs.

## Quick reference

| Component                   | What it does                              |
|-----------------------------|-------------------------------------------|
| `KeyboardAvoidingView`      | Moves content above the keyboard          |
| `TouchableWithoutFeedback`  | Catches taps without visual feedback      |
| `Keyboard.dismiss`          | Programmatically hides the keyboard       |
| `keyboardShouldPersistTaps` | Controls scroll view tap behavior         |
| `Platform.OS`               | `"ios"` or `"android"` at runtime        |
