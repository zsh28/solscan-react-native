// app/send.tsx
// Send SOL screen — pushes on top of the tab navigator.
// Requires a connected wallet (via useWallet / MWA).
// Only functional on a real Android device with Phantom (or fakewallet APK).

import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useWallet } from "../hooks/useWallet";

export default function SendScreen() {
  const router = useRouter();
  const { connected, address, sendSol } = useWallet();

  const [toAddress, setToAddress] = useState("");
  const [amount, setAmount]       = useState("");
  const [sending, setSending]     = useState(false);

  const handleSend = async () => {
    const sol = parseFloat(amount);
    if (!toAddress.trim()) return Alert.alert("Enter a recipient address");
    if (isNaN(sol) || sol <= 0) return Alert.alert("Enter a valid amount");

    Alert.alert(
      "Confirm Transfer",
      `Send ${sol} SOL to\n${toAddress.slice(0, 8)}...${toAddress.slice(-8)}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Send",
          style: "destructive",
          onPress: async () => {
            setSending(true);
            try {
              const sig = await sendSol(toAddress.trim(), sol);
              Alert.alert(
                "Sent!",
                `Transaction confirmed.\n\n${sig.slice(0, 16)}...`,
                [{ text: "OK", onPress: () => router.back() }]
              );
            } catch (e: any) {
              Alert.alert("Failed", e.message);
            } finally {
              setSending(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <View style={s.container}>
            {/* Header */}
            <TouchableOpacity style={s.back} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>

            <Text style={s.title}>Send SOL</Text>
            <Text style={s.subtitle}>
              From:{" "}
              <Text style={s.addr}>
                {address
                  ? `${address.slice(0, 6)}...${address.slice(-4)}`
                  : "—"}
              </Text>
            </Text>

            {/* Not-connected warning */}
            {!connected && (
              <View style={s.warningBox}>
                <Ionicons name="warning-outline" size={18} color="#F59E0B" />
                <Text style={s.warningText}>
                  Connect a wallet first from the Wallet tab.
                </Text>
              </View>
            )}

            {/* Recipient */}
            <Text style={s.label}>Recipient address</Text>
            <View style={s.inputBox}>
              <TextInput
                style={s.input}
                placeholder="Enter Solana address..."
                placeholderTextColor="#6B7280"
                value={toAddress}
                onChangeText={setToAddress}
                autoCapitalize="none"
                autoCorrect={false}
                editable={connected}
              />
            </View>

            {/* Amount */}
            <Text style={s.label}>Amount (SOL)</Text>
            <View style={s.inputBox}>
              <TextInput
                style={s.input}
                placeholder="0.00"
                placeholderTextColor="#6B7280"
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                editable={connected}
              />
              <Text style={s.unit}>SOL</Text>
            </View>

            {/* Send button */}
            <TouchableOpacity
              style={[s.btn, (!connected || sending) && s.btnDisabled]}
              onPress={handleSend}
              disabled={!connected || sending}
            >
              {sending ? (
                <ActivityIndicator color="#000" />
              ) : (
                <>
                  <Ionicons name="paper-plane-outline" size={18} color="#0D0D12" />
                  <Text style={s.btnText}>Send</Text>
                </>
              )}
            </TouchableOpacity>

            <Text style={s.note}>
              Transaction will be signed by your mobile wallet app (e.g. Phantom).
              Network fees apply.
            </Text>
          </View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
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
  back: {
    marginBottom: 20,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "700",
    marginBottom: 6,
  },
  subtitle: {
    color: "#6B7280",
    fontSize: 14,
    marginBottom: 28,
  },
  addr: {
    color: "#9945FF",
    fontFamily: "monospace",
  },
  warningBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#1A160A",
    borderWidth: 1,
    borderColor: "#F59E0B",
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  warningText: {
    color: "#F59E0B",
    fontSize: 13,
    flex: 1,
  },
  label: {
    color: "#6B7280",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#16161D",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#2A2A35",
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  input: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 15,
    paddingVertical: 14,
  },
  unit: {
    color: "#6B7280",
    fontSize: 14,
    fontWeight: "600",
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#14F195",
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 4,
  },
  btnDisabled: {
    opacity: 0.4,
  },
  btnText: {
    color: "#0D0D12",
    fontWeight: "700",
    fontSize: 16,
  },
  note: {
    color: "#6B7280",
    fontSize: 12,
    textAlign: "center",
    marginTop: 20,
    lineHeight: 18,
  },
});
