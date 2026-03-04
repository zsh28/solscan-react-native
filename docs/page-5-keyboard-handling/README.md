# Keyboard Handling (Mobile UX)

## Why this matters

On mobile, the software keyboard can cover important UI (inputs, action buttons, validation messages). Good keyboard handling is essential for forms and search workflows.

## Core building blocks

- `KeyboardAvoidingView`: shifts/resizes content around keyboard
- `TouchableWithoutFeedback + Keyboard.dismiss`: tap outside to close
- `keyboardShouldPersistTaps`: controls tap behavior inside scroll views

## Example: cross-platform keyboard-safe layout

```tsx
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";

export default function FormScreen() {
  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={{ padding: 16 }}
          keyboardShouldPersistTaps="handled"
        >
          <TextInput placeholder="Email" style={{ marginBottom: 12 }} />
          <TextInput placeholder="Password" secureTextEntry />
        </ScrollView>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}
```

## Use cases

- login/signup forms
- checkout address forms
- search/filter screens
- messaging composer interfaces

## UX recommendations

- auto-focus only where it clearly helps
- keep primary action visible while typing
- use appropriate keyboard type (`email-address`, `numeric`, etc.)
- set return key intent (`next`, `done`, `search`)

## Common pitfalls

- missing `flex: 1` on wrapper views
- no tap-to-dismiss behavior
- submit buttons hidden behind keyboard
- nested scroll + keyboard conflicts

## Extra patterns

## Example: chained form focus

```tsx
const emailRef = useRef<TextInput>(null);
const passwordRef = useRef<TextInput>(null);

<TextInput
  ref={emailRef}
  returnKeyType="next"
  onSubmitEditing={() => passwordRef.current?.focus()}
/>

<TextInput
  ref={passwordRef}
  returnKeyType="done"
  onSubmitEditing={handleSubmit}
/>
```

## Accessibility notes

- ensure labels/placeholder meaning is clear
- avoid layouts that jump unpredictably on keyboard open
- keep error text readable and close to corresponding input
