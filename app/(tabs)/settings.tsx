import {
  View,
  Text,
  Switch,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useWalletStore } from "../../stores/wallet-store";

export default function SettingsScreen() {
  const hasHydrated  = useWalletStore((s) => s._hasHydrated);
  const isDevnet     = useWalletStore((s) => s.isDevnet);
  const toggleNetwork = useWalletStore((s) => s.toggleNetwork);
  const favorites    = useWalletStore((s) => s.favorites);
  const searchHistory = useWalletStore((s) => s.searchHistory);
  const clearHistory  = useWalletStore((s) => s.clearHistory);

  const handleClearHistory = () => {
    Alert.alert(
      "Clear History",
      "This will remove all your search history. Favorites won't be affected.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Clear", style: "destructive", onPress: clearHistory },
      ]
    );
  };

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <View style={s.container}>
        <Text style={s.title}>Settings</Text>

        {/* Show a spinner until Zustand has loaded persisted data from MMKV. */}
        {!hasHydrated ? (
          <View style={s.loadingContainer}>
            <ActivityIndicator color="#14F195" />
          </View>
        ) : (
          <>
            {/* ── Network ─────────────────────────────── */}
            <Text style={s.sectionLabel}>Network</Text>

            <View style={s.row}>
              <View style={s.rowLeft}>
                <Text style={s.rowLabel}>Use Devnet</Text>
                <Text style={s.rowSublabel}>
                  {isDevnet ? "Testing network (free SOL)" : "Real network"}
                </Text>
              </View>
              <Switch
                value={isDevnet}
                onValueChange={toggleNetwork}
                trackColor={{ true: "#14F195", false: "#333" }}
                thumbColor="#FFFFFF"
              />
            </View>

            {/* ── Stats ───────────────────────────────── */}
            <Text style={s.sectionLabel}>Stats</Text>

            <View style={s.row}>
              <Text style={s.rowLabel}>Saved Wallets</Text>
              <View style={s.badge}>
                <Text style={s.badgeText}>{favorites.length}</Text>
              </View>
            </View>

            <View style={s.row}>
              <Text style={s.rowLabel}>Search History</Text>
              <View style={s.badge}>
                <Text style={s.badgeText}>{searchHistory.length}</Text>
              </View>
            </View>

            {/* ── Danger zone ─────────────────────────── */}
            <Text style={s.sectionLabel}>Data</Text>

            <TouchableOpacity style={s.dangerRow} onPress={handleClearHistory}>
              <Ionicons name="trash-outline" size={18} color="#EF4444" style={{ marginRight: 10 }} />
              <Text style={s.dangerText}>Clear Search History</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

// ============================================
// Styles
// ============================================

const s = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#0D0D12",
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "700",
    marginBottom: 28,
  },
  sectionLabel: {
    color: "#6B7280",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 10,
    marginTop: 24,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#16161D",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#2A2A35",
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginBottom: 8,
  },
  rowLeft: {
    flex: 1,
  },
  rowLabel: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "500",
  },
  rowSublabel: {
    color: "#6B7280",
    fontSize: 13,
    marginTop: 2,
  },
  badge: {
    backgroundColor: "#1E1E28",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    color: "#14F195",
    fontSize: 14,
    fontWeight: "600",
  },
  dangerRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1A0E0E",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#3D1515",
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginBottom: 8,
  },
  dangerText: {
    color: "#EF4444",
    fontSize: 15,
    fontWeight: "500",
  },
});
