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
      </Stack>
    </SafeAreaProvider>
  );
}
