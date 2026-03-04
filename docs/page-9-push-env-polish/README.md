# Push Notifications, Environment Variables, and App Polish

## What We Are Covering

1. Push Notifications (local + remote) with Expo
2. Environment Variables and configuration hygiene
3. Error Boundaries and crash prevention
4. App Icon, Splash Screen, and metadata polish
5. Testing essentials for demo reliability

---

## 1) Push Notifications with Expo

## Why notifications matter

Notifications prove your app has value beyond one active session. They show lifecycle awareness and event-driven behavior.

Examples:

- wallet: transaction confirmed, large balance change
- gaming: your turn, reward available
- commerce: order shipped, wishlist price drop
- social: new message, comment/reply

## Install

```bash
npx expo install expo-notifications expo-device expo-constants
```

## Permission and token setup

```tsx
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotifications() {
  if (!Device.isDevice) return null;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") return null;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Default",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#9945FF",
    });
  }

  const token = await Notifications.getExpoPushTokenAsync({
    projectId: Constants.expoConfig?.extra?.eas?.projectId,
  });

  return token.data;
}
```

## Local notifications (no backend needed)

```tsx
import * as Notifications from "expo-notifications";

export async function notifyTransactionConfirmed(signature: string) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Transaction Confirmed",
      body: "Your transfer has been confirmed.",
      data: { type: "transaction", signature },
      sound: "default",
    },
    trigger: null,
  });
}

export async function scheduleDailyReminder(hour: number, minute: number) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Daily Portfolio Check",
      body: "Open the app to review your activity.",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}
```

## Handle notification taps (deep linking)

```tsx
import { useEffect, useRef } from "react";
import { useRouter } from "expo-router";
import * as Notifications from "expo-notifications";

export function useNotificationRouting() {
  const router = useRouter();
  const responseSub = useRef<Notifications.EventSubscription>();

  useEffect(() => {
    responseSub.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as {
        type?: string;
        signature?: string;
      };

      if (data.type === "transaction" && data.signature) {
        router.push(`/transaction/${data.signature}`);
      } else if (data.type === "price_alert") {
        router.push("/portfolio");
      }
    });

    return () => responseSub.current?.remove();
  }, [router]);
}
```

---

## 2) Environment Variables and Config

## Why this matters

Hardcoded RPC URLs and API endpoints are risky. Env-based config avoids accidental devnet/mainnet mixups and keeps builds predictable.

## Expo env rule

Client-visible env variables must start with `EXPO_PUBLIC_`.

## Example env files

```bash
# .env.local
EXPO_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
EXPO_PUBLIC_SOLANA_NETWORK=devnet
EXPO_PUBLIC_JUPITER_API_URL=https://quote-api.jup.ag/v6
EXPO_PUBLIC_ENABLE_NOTIFICATIONS=true
```

```bash
# .env.production
EXPO_PUBLIC_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
EXPO_PUBLIC_SOLANA_NETWORK=mainnet-beta
EXPO_PUBLIC_JUPITER_API_URL=https://quote-api.jup.ag/v6
EXPO_PUBLIC_ENABLE_NOTIFICATIONS=true
```

## Central config module

```tsx
const config = {
  solana: {
    rpcUrl: process.env.EXPO_PUBLIC_SOLANA_RPC_URL ?? "https://api.devnet.solana.com",
    network: (process.env.EXPO_PUBLIC_SOLANA_NETWORK as "devnet" | "mainnet-beta") ?? "devnet",
  },
  jupiter: {
    apiUrl: process.env.EXPO_PUBLIC_JUPITER_API_URL ?? "https://quote-api.jup.ag/v6",
  },
  features: {
    notifications: process.env.EXPO_PUBLIC_ENABLE_NOTIFICATIONS === "true",
  },
} as const;

export default config;
```

## EAS build profile env

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "env": {
        "EXPO_PUBLIC_SOLANA_NETWORK": "devnet"
      }
    },
    "production": {
      "env": {
        "EXPO_PUBLIC_SOLANA_NETWORK": "mainnet-beta"
      }
    }
  }
}
```

---

## 3) Error Boundaries and Crash Prevention

## Why this matters

Demo reliability is mostly failure handling. Your app should fail gracefully, not crash.

## Error boundary example

```tsx
import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";

type Props = { children: React.ReactNode };
type State = { hasError: boolean; error: Error | null };

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    console.error("Boundary error:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={s.container}>
          <Text style={s.title}>Something went wrong</Text>
          <Text style={s.message}>{this.state.error?.message}</Text>
          <Pressable style={s.button} onPress={() => this.setState({ hasError: false, error: null })}>
            <Text style={s.buttonText}>Try Again</Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}

const s = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  title: { fontSize: 20, fontWeight: "700", marginBottom: 8 },
  message: { color: "#6B7280", marginBottom: 14, textAlign: "center" },
  button: { backgroundColor: "#111827", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  buttonText: { color: "#fff", fontWeight: "600" },
});
```

## Safe async helper

```tsx
export async function safeAsync<T>(fn: () => Promise<T>, onError?: (err: Error) => void): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    onError?.(err);
    console.error(err);
    return null;
  }
}
```

---

## 4) App Icon, Splash Screen, and Metadata

## Why this matters

First impressions happen before the first tap.

- icon quality
- splash quality
- app name/version/package consistency

## App config example

```json
{
  "expo": {
    "name": "YourAppName",
    "slug": "your-app-name",
    "version": "1.0.0",
    "scheme": "yourapp",
    "icon": "./assets/icon.png",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#1a1a2e"
    },
    "ios": {
      "bundleIdentifier": "com.yourteam.yourapp",
      "supportsTablet": true
    },
    "android": {
      "package": "com.yourteam.yourapp",
      "permissions": ["NOTIFICATIONS"],
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#1a1a2e"
      }
    }
  }
}
```

## Controlled splash hide

```tsx
import { useEffect, useState } from "react";
import * as SplashScreen from "expo-splash-screen";

SplashScreen.preventAutoHideAsync();

export default function AppRoot() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      // load fonts, auth, warmup
      setReady(true);
      await SplashScreen.hideAsync();
    }
    prepare();
  }, []);

  if (!ready) return null;
  return <MainNavigator />;
}
```

---

## 5) Testing Essentials

## Minimal manual checklist

1. Fresh install: app opens without crash
2. Offline mode: graceful error states, no fatal crash
3. Invalid input: validation shown, no throw
4. Missing connection/auth: clear CTA state
5. Background/foreground cycle: state remains stable

## One meaningful unit test

```tsx
import { describe, it, expect } from "@jest/globals";
import { formatAmount, shortenAddress } from "../utils/formatting";

describe("formatAmount", () => {
  it("formats values consistently", () => {
    expect(formatAmount(1)).toBe("1.0000");
    expect(formatAmount(0.5)).toBe("0.5000");
    expect(formatAmount(0)).toBe("0.0000");
  });
});

describe("shortenAddress", () => {
  it("shortens long identifiers", () => {
    expect(shortenAddress("7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU")).toMatch(/^7xKX.*AsU$/);
  });
});
```

Run tests:

```bash
npx jest --passWithNoTests
```

---

## Final Demo Checklist

- Notification permission + one trigger flow works
- Env config is profile-driven (not hardcoded)
- Error boundary fallback renders on forced error
- Icon/splash/metadata are customized
- Smoke tests pass on physical device
