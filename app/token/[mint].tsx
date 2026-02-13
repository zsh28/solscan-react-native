import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type TokenInfo = {
  mint: string;
  supply: number;
  decimals: number;
};

export default function TokenDetailScreen() {
  // Reads dynamic URL segment from /token/:mint.
  const { mint } = useLocalSearchParams<{ mint: string }>();
  const router = useRouter();

  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Skip the request if mint is missing for any reason.
    if (!mint) {
      setLoading(false);
      return;
    }

    const fetchTokenInfo = async () => {
      try {
        // Minimal RPC call for initial token detail data.
        const res = await fetch("https://api.mainnet-beta.solana.com", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "getTokenSupply",
            params: [mint],
          }),
        });
        const json = await res.json();

        setTokenInfo({
          mint,
          supply: json.result?.value?.uiAmount || 0,
          decimals: json.result?.value?.decimals || 0,
        });
      } catch (error) {
        console.error("Failed to fetch token info:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTokenInfo();
  }, [mint]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#14F195" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color="#fff" />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      <View style={styles.header}>
        <Text style={styles.title}>Token Details</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Mint Address</Text>
        <Text style={styles.mintAddress}>{mint || "Unknown"}</Text>
      </View>

      {tokenInfo && (
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Total Supply</Text>
            <Text style={styles.infoValue}>
              {tokenInfo.supply?.toLocaleString() || "Unknown"}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Decimals</Text>
            <Text style={styles.infoValue}>{tokenInfo.decimals}</Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0a1a",
    paddingTop: 60,
    paddingHorizontal: 16,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0a0a1a",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  backText: {
    color: "#fff",
    fontSize: 16,
    marginLeft: 8,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
  },
  card: {
    backgroundColor: "#1a1a2e",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardLabel: {
    color: "#888",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  mintAddress: {
    color: "#9945FF",
    fontSize: 13,
    fontFamily: "monospace",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  infoLabel: {
    color: "#888",
    fontSize: 14,
  },
  infoValue: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  divider: {
    height: 1,
    backgroundColor: "#2a2a3e",
  },
});
