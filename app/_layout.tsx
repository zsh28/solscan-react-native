// Polyfills must be imported before anything else so that Buffer and
// crypto.getRandomValues are available when @solana/web3.js initialises.
import "../polyfills";

import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function RootLayout() {
  return (
    // Keep safe-area handling at the root so every route inherits it.
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }}>
        {/* Base app shell that contains our bottom tabs. */}
        <Stack.Screen name="(tabs)" />
        {/* Dynamic token details route pushed on top of tabs. */}
        <Stack.Screen name="token/[mint]" />
        {/* Watchlist pushed from Settings — lives above the tab layer. */}
        <Stack.Screen name="watchlist" />
        {/* Send SOL screen — pushed from the Wallet tab when connected. */}
        <Stack.Screen name="send" />
      </Stack>
    </SafeAreaProvider>
  );
}
