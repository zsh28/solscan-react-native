# SolScan Lite

Solana Wallet Balance Checker

## Part A: Project Setup and File Breakdown

### What is Expo?

Expo is a toolchain on top of React Native that removes most native setup pain.
Without Expo, you usually configure Xcode, Android Studio, Gradle, CocoaPods, and native linking.
With Expo, you can start quickly with one command and run on a real device via Expo Go.

### Creating the Project

```bash
npx create-expo-app SolScan --template blank-typescript
cd SolScan
npx expo start
```

- `npx create-expo-app SolScan --template blank-typescript`: create a clean TypeScript Expo project.
- `cd SolScan`: enter the project folder.
- `npx expo start`: start dev server and open with Expo Go.

### Project structure (initial)

```text
SolScan/
|- App.tsx
|- app.json
|- babel.config.js
|- tsconfig.json
|- package.json
|- node_modules/
`- assets/
```

### File roles

- `App.tsx`: app entry UI (pre-router setup).
- `app.json`: app metadata and native settings.
- `babel.config.js`: Babel transpilation config.
- `tsconfig.json`: TypeScript compiler rules.
- `package.json`: dependencies and npm scripts.
- `assets/`: icons/splash/fonts/images.

## Part B: Running the App

### Option 1: Physical phone (recommended)

1. Install Expo Go (iOS/Android).
2. Run `npx expo start`.
3. Scan QR code.
4. App launches on phone.

### Option 2: Android emulator

1. Create/start Android emulator.
2. Run `npx expo start`.
3. Press `a` in terminal.

### Option 3: iOS simulator (macOS)

1. Install Xcode.
2. Run `npx expo start`.
3. Press `i` in terminal.

## Part C: Code Breakdown (SolScan Lite)

### Imports (React Native core)

```tsx
import { useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Alert,
  Linking,
} from "react-native";
```

### Solana RPC helper

```tsx
const RPC = "https://api.mainnet-beta.solana.com";

const rpc = async (method: string, params: any[]) => {
  const res = await fetch(RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message);
  return json.result;
};
```

### RPC methods used

- `getBalance`: reads SOL balance (lamports -> SOL).
- `getTokenAccountsByOwner`: reads SPL token accounts.
- `getSignaturesForAddress`: reads recent transaction signatures.

### Helpers used in UI

- `short(value, n)`: shorten long wallet/token strings.
- `timeAgo(ts)`: show relative time labels.

### State used

- `address`
- `loading`
- `balance`
- `tokens`
- `txns`

### Search flow

The search action validates input, sets loading state, runs all RPC calls in parallel with `Promise.all`, updates state, and handles errors with `Alert.alert`.

### UI building blocks

- `SafeAreaView` avoids notch/status overlap.
- `ScrollView` enables full-page scroll.
- `TextInput` captures wallet input.
- `TouchableOpacity` handles press interactions.
- `FlatList` renders token/txn lists efficiently.
- `Linking.openURL` opens Solscan transaction links.

## Part D: Quick Reference (Web vs Native)

- `div` -> `View`
- text tags -> `Text`
- `input` -> `TextInput`
- `button` -> `TouchableOpacity`
- map list -> `FlatList`
- `window.alert` -> `Alert.alert`
- `window.open` -> `Linking.openURL`
- CSS -> `StyleSheet.create`
