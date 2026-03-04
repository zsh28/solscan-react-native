# Mobile App Foundations (Expo + React Native)

## What this topic covers

This page explains the baseline stack for building mobile apps with Expo and React Native:

- project setup
- runtime model
- file roles
- common UI + data patterns

It is intentionally framework-focused and reusable across projects.

## Why Expo is a strong default

Expo removes most native build setup overhead so teams can iterate on product behavior earlier.

Use Expo when you want:

- quick prototype-to-production path
- one codebase for iOS and Android
- smooth developer experience for OTA updates, assets, and tooling

## Quick start commands

```bash
npx create-expo-app MyApp --template blank-typescript
cd MyApp
npx expo start
```

## Core project files and their role

- `package.json`: dependencies + scripts
- `app.json`: app metadata and native configuration
- `tsconfig.json`: TypeScript behavior
- `assets/`: icons, images, fonts
- `app/` or `src/`: application screens and logic

## React Native mental model

Web-to-native mapping:

- `div` -> `View`
- text nodes/tags -> `Text`
- `<input>` -> `TextInput`
- `<button>` -> `Pressable` / `TouchableOpacity`
- css file -> `StyleSheet.create(...)`

## Example: basic searchable screen

```tsx
import { useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator, StyleSheet } from "react-native";

export default function SearchScreen() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const onSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 600));
      setResult(`Result for: ${query}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={s.container}>
      <Text style={s.title}>Search</Text>
      <TextInput value={query} onChangeText={setQuery} style={s.input} placeholder="Type here" />
      <Pressable style={s.button} onPress={onSearch}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.buttonText}>Run</Text>}
      </Pressable>
      {result ? <Text style={s.result}>{result}</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: "center" },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 12 },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 10, padding: 12, marginBottom: 12 },
  button: { backgroundColor: "#111827", padding: 14, borderRadius: 10, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "600" },
  result: { marginTop: 16, fontSize: 16 },
});
```

## Common early-stage pitfalls

- mixing too much app logic into one screen file
- skipping loading/error states for network actions
- overusing inline styles for large components
- not testing on both iOS and Android early

## Recommended progression for teams

1. Build vertical slice (one flow end-to-end)
2. Add navigation and shared state
3. Add persistence and network caching
4. Add animations/gestures for UX polish
5. Add observability and error reporting
