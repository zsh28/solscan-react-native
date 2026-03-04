import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Linking,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";

function shortSignature(signature: string): string {
  if (signature.length <= 20) return signature;
  return `${signature.slice(0, 10)}...${signature.slice(-10)}`;
}

export default function TransactionDetailsScreen() {
  const router = useRouter();
  const { signature } = useLocalSearchParams<{ signature: string }>();

  const openExplorer = async () => {
    if (!signature) return;
    await Linking.openURL(`https://solscan.io/tx/${signature}`);
  };

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.container}>
        <Text style={s.title}>Transaction Update</Text>
        <Text style={s.subtitle}>Your notification opened this transaction.</Text>

        <View style={s.card}>
          <Text style={s.label}>Signature</Text>
          <Text style={s.signature}>{signature ? shortSignature(signature) : "Unknown"}</Text>
        </View>

        <Pressable style={s.primaryButton} onPress={openExplorer}>
          <Text style={s.primaryButtonText}>Open on Solscan</Text>
        </Pressable>

        <Pressable style={s.secondaryButton} onPress={() => router.back()}>
          <Text style={s.secondaryButtonText}>Back</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#0D0D12",
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 30,
    fontWeight: "700",
  },
  subtitle: {
    color: "#9CA3AF",
    fontSize: 14,
    marginTop: 8,
    marginBottom: 20,
  },
  card: {
    backgroundColor: "#16161D",
    borderWidth: 1,
    borderColor: "#2A2A35",
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  label: {
    color: "#6B7280",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  signature: {
    color: "#14F195",
    fontFamily: "monospace",
    fontSize: 14,
  },
  primaryButton: {
    backgroundColor: "#14F195",
    borderRadius: 12,
    alignItems: "center",
    paddingVertical: 14,
  },
  primaryButtonText: {
    color: "#0D0D12",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryButton: {
    marginTop: 10,
    backgroundColor: "#1E1E28",
    borderRadius: 12,
    alignItems: "center",
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#2A2A35",
  },
  secondaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
});
