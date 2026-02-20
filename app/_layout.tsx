// Polyfills must be imported before anything else so that Buffer and
// crypto.getRandomValues are available when @solana/web3.js initialises.
import "../polyfills";

import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { WalletProvider } from "../context/WalletContext";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      {/* Single WalletProvider at the root so all screens share one wallet state. */}
      <WalletProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="token/[mint]" />
          <Stack.Screen name="send" />
        </Stack>
      </WalletProvider>
    </SafeAreaProvider>
  );
}
