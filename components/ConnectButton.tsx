// components/ConnectButton.tsx
// Renders a "Connect Wallet" / "Disconnect" button that drives useWallet.
// Stateless — all wallet state lives in the hook, passed down as props so
// this component stays a pure presentational unit.

import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface Props {
  connected: boolean;
  connecting: boolean;
  address: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
}

const short = (s: string) => `${s.slice(0, 4)}...${s.slice(-4)}`;

export function ConnectButton({
  connected,
  connecting,
  address,
  onConnect,
  onDisconnect,
}: Props) {
  if (connecting) {
    return (
      <View style={s.pill}>
        <ActivityIndicator size="small" color="#14F195" />
        <Text style={s.pillText}>Connecting…</Text>
      </View>
    );
  }

  if (connected && address) {
    return (
      <TouchableOpacity style={s.pillConnected} onPress={onDisconnect}>
        <Ionicons name="wallet" size={14} color="#14F195" />
        <Text style={s.pillConnectedText}>{short(address)}</Text>
        <Ionicons name="close-circle" size={14} color="#6B7280" />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={s.btn} onPress={onConnect}>
      <Ionicons name="wallet-outline" size={16} color="#0D0D12" />
      <Text style={s.btnText}>Connect Wallet</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#14F195",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  btnText: {
    color: "#0D0D12",
    fontWeight: "600",
    fontSize: 14,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#16161D",
    borderWidth: 1,
    borderColor: "#2A2A35",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  pillText: {
    color: "#6B7280",
    fontSize: 13,
  },
  pillConnected: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#0F2318",
    borderWidth: 1,
    borderColor: "#14F195",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  pillConnectedText: {
    color: "#14F195",
    fontSize: 13,
    fontFamily: "monospace",
    fontWeight: "600",
  },
});
