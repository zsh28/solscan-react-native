// Polyfills must be imported before anything else so that Buffer and
// crypto.getRandomValues are available when @solana/web3.js initialises.
import "../polyfills";

import { useEffect, useRef } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ErrorBoundary } from "../components/ErrorBoundary";
import config from "../config/env";
import { WalletProvider } from "../context/WalletContext";
import { registerForPushNotifications } from "../utils/notifications";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      gcTime: 5 * 60 * 1000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

export default function RootLayout() {
  const router = useRouter();
  const notificationListener = useRef<Notifications.EventSubscription | null>(
    null
  );
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    if (!config.app.enableNotifications || Platform.OS === "web") {
      return;
    }

    registerForPushNotifications().then((token) => {
      if (token) {
        console.log("[Notifications] Expo push token:", token);
      }
    });

    notificationListener.current =
      Notifications.addNotificationReceivedListener(() => {
        // Foreground notifications can be logged/observed here.
      });

    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data as {
          type?: string;
          signature?: string;
        };

        if (data.type === "transaction" && data.signature) {
          router.push({
            pathname: "/transaction/[signature]",
            params: { signature: data.signature },
          });
        }
      });

    Notifications.getLastNotificationResponseAsync().then((response) => {
      const data = response?.notification.request.content.data as
        | { type?: string; signature?: string }
        | undefined;
      if (data?.type === "transaction" && data.signature) {
        router.push({
          pathname: "/transaction/[signature]",
          params: { signature: data.signature },
        });
      }
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [router]);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <SafeAreaProvider>
            {/* Single WalletProvider at the root so all screens share one wallet state. */}
            <WalletProvider>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="token/[mint]" />
                <Stack.Screen name="send" />
                <Stack.Screen name="transaction/[signature]" />
              </Stack>
            </WalletProvider>
          </SafeAreaProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
