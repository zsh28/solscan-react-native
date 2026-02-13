import { useState } from "react"; // React hook for local component state.
import { View } from "react-native"; // Generic container for layout sections.
import { Text } from "react-native"; // Renders text labels like tab names.
import { TouchableOpacity } from "react-native"; // Pressable element for tab buttons.
import { StyleSheet } from "react-native"; // Creates optimized style objects.
import { useColorScheme } from "react-native"; // Reads system light/dark appearance.
import { SafeAreaProvider } from "react-native-safe-area-context"; // Provides safe-area insets to descendants.
import { SafeAreaView } from "react-native-safe-area-context"; // Keeps UI out of notches/home indicators.
import { Ionicons } from "@expo/vector-icons"; // Icon set used in bottom tabs.
import { StatusBar } from "expo-status-bar"; // Cross-platform status bar control.
import { WalletScreen } from "./src/screens/WalletScreen"; // Wallet tab screen component.
import { SwapScreen } from "./src/screens/SwapScreen"; // Swap tab screen component.

export default function App() {
  const colorScheme = useColorScheme();

  // Single source of truth for bottom-tab selection:
  // - "wallet" shows WalletScreen
  // - "swap" shows SwapScreen
  const [activeTab, setActiveTab] = useState<"wallet" | "swap">("wallet");

  return (
    <SafeAreaProvider>
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
      <SafeAreaView style={s.safe}>
        {/* Conditionally render screen content from activeTab state. */}
        {activeTab === "wallet" ? <WalletScreen /> : <SwapScreen />}

        {/* Simple custom bottom tab bar. */}
        <View style={s.tabBar}>
          <TouchableOpacity
            style={s.tab}
            // Pressing this tab sets activeTab to "wallet".
            onPress={() => setActiveTab("wallet")}
          >
            <Ionicons
              // Active tab gets filled icon + green color.
              name={activeTab === "wallet" ? "wallet" : "wallet-outline"}
              size={24}
              color={activeTab === "wallet" ? "#14F195" : "#6B7280"}
            />
            <Text style={[s.tabLabel, activeTab === "wallet" && s.tabActive]}>
              Wallet
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={s.tab}
            // Pressing this tab sets activeTab to "swap".
            onPress={() => setActiveTab("swap")}
          >
            <Ionicons
              // Active tab gets filled icon + green color.
              name={activeTab === "swap" ? "swap-horizontal" : "swap-horizontal-outline"}
              size={24}
              color={activeTab === "swap" ? "#14F195" : "#6B7280"}
            />
            <Text style={[s.tabLabel, activeTab === "swap" && s.tabActive]}>
              Swap
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const s = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#0D0D12",
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#16161D",
    borderTopWidth: 1,
    borderTopColor: "#2A2A35",
    paddingBottom: 8,
    paddingTop: 12,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  tabLabel: {
    color: "#6B7280",
    fontSize: 12,
  },
  tabActive: {
    color: "#14F195",
  },
});
