import { useRouter } from "expo-router";
import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Alert,
  Linking,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
} from "react-native";
import { useWalletStore } from "../stores/wallet-store";
import { FavoriteButton } from "../components/FavoriteButton";

// ============================================
// Solana RPC
// ============================================

// RPC endpoint is driven by the global devnet toggle.
const MAINNET = "https://api.mainnet-beta.solana.com";
const DEVNET  = "https://api.devnet.solana.com";

const rpc = async (endpoint: string, method: string, params: any[]) => {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message);
  return json.result;
};

const getBalance = async (endpoint: string, addr: string) => {
  const result = await rpc(endpoint, "getBalance", [addr]);
  return result.value / 1_000_000_000;
};

const getTokens = async (endpoint: string, addr: string) => {
  const result = await rpc(endpoint, "getTokenAccountsByOwner", [
    addr,
    { programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" },
    { encoding: "jsonParsed" },
  ]);
  return (result.value || [])
    .map((a: any) => ({
      mint: a.account.data.parsed.info.mint,
      amount: a.account.data.parsed.info.tokenAmount.uiAmount,
    }))
    .filter((t: any) => t.amount > 0);
};

const getTxns = async (endpoint: string, addr: string) => {
  const sigs = await rpc(endpoint, "getSignaturesForAddress", [addr, { limit: 10 }]);
  return sigs.map((s: any) => ({
    sig: s.signature,
    time: s.blockTime,
    ok: !s.err,
  }));
};

// ============================================
// Helpers
// ============================================

const short = (s: string, n = 4) => `${s.slice(0, n)}...${s.slice(-n)}`;

const timeAgo = (ts: number) => {
  const sec = Math.floor(Date.now() / 1000 - ts);
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
};

// ============================================
// Wallet Screen (default route for /(tabs))
// ============================================

export default function WalletScreen() {
  const router = useRouter();

  // Global store — only subscribe to the slices this screen needs.
  const addToHistory   = useWalletStore((s) => s.addToHistory);
  const searchHistory  = useWalletStore((s) => s.searchHistory);
  const isDevnet       = useWalletStore((s) => s.isDevnet);

  const RPC = isDevnet ? DEVNET : MAINNET;

  // Local screen state.
  const [address, setAddress] = useState("");
  const [loading, setLoading]  = useState(false);
  const [balance, setBalance]  = useState<number | null>(null);
  const [tokens, setTokens]    = useState<any[]>([]);
  const [txns, setTxns]        = useState<any[]>([]);

  // The wallet address that produced the current results (used for FavoriteButton).
  const [searchedAddress, setSearchedAddress] = useState("");

  const search = async (addr?: string) => {
    const target = (addr ?? address).trim();
    if (!target) return Alert.alert("Enter a wallet address");

    // Sync input field when called from history tap.
    if (addr) setAddress(addr);

    setLoading(true);
    try {
      const [bal, tok, tx] = await Promise.all([
        getBalance(RPC, target),
        getTokens(RPC, target),
        getTxns(RPC, target),
      ]);
      setBalance(bal);
      setTokens(tok);
      setTxns(tx);
      setSearchedAddress(target);
      addToHistory(target); // persist to global store
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
    setLoading(false);
  };

  const tryExample = () => {
    setAddress("86xCnPeV69n6t3DnyGvkKobf9FdN2H9oiVDdaMpo2MMY");
  };

  return (
    // Dismiss keyboard when tapping outside any input.
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      {/* Push content up when the keyboard opens. */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1, backgroundColor: "#0D0D12" }}
      >
        <ScrollView style={s.scroll} keyboardShouldPersistTaps="handled">

          {/* Devnet banner — only visible when the toggle is on. */}
          {isDevnet && (
            <View style={s.devnetBanner}>
              <Text style={s.devnetText}>DEVNET — Testing network</Text>
            </View>
          )}

          <Text style={s.title}>SolScan</Text>
          <Text style={s.subtitle}>Explore any Solana wallet</Text>

          <View style={s.inputContainer}>
            <TextInput
              style={s.input}
              placeholder="Enter wallet address..."
              placeholderTextColor="#6B7280"
              value={address}
              onChangeText={setAddress}
              autoCapitalize="none"
              autoCorrect={false}
              contextMenuHidden={false}
              selectTextOnFocus={true}
              editable={true}
              onSubmitEditing={() => search()}
              returnKeyType="search"
            />
          </View>

          <View style={s.btnRow}>
            <TouchableOpacity
              style={[s.btn, loading && s.btnDisabled]}
              onPress={() => search()}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={s.btnText}>Search</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={s.btnGhost} onPress={tryExample}>
              <Text style={s.btnGhostText}>Demo</Text>
            </TouchableOpacity>
          </View>

          {/* Search history — shown when there are no current results yet. */}
          {searchHistory.length > 0 && balance === null && (
            <View style={s.historySection}>
              <Text style={s.historyTitle}>Recent Searches</Text>
              {searchHistory.slice(0, 5).map((addr) => (
                <TouchableOpacity
                  key={addr}
                  style={s.historyItem}
                  onPress={() => search(addr)}
                >
                  <Text style={s.historyAddress} numberOfLines={1}>
                    {short(addr, 8)}
                  </Text>
                  <Text style={s.historyArrow}>›</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Balance card with favorite button. */}
          {balance !== null && (
            <View style={s.card}>
              <View style={s.cardHeader}>
                <Text style={s.label}>SOL Balance</Text>
                <FavoriteButton address={searchedAddress} />
              </View>
              <View style={s.balanceRow}>
                <Text style={s.balance}>{balance.toFixed(4)}</Text>
                <Text style={s.sol}>SOL</Text>
              </View>
              <Text style={s.addr}>{short(searchedAddress, 6)}</Text>
            </View>
          )}

          {tokens.length > 0 && (
            <>
              <Text style={s.section}>Tokens ({tokens.length})</Text>
              <FlatList
                data={tokens}
                keyExtractor={(t) => t.mint}
                scrollEnabled={false}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={s.row}
                    onPress={() =>
                      router.push({
                        pathname: "/token/[mint]",
                        params: { mint: item.mint },
                      })
                    }
                  >
                    <Text style={s.mint}>{short(item.mint, 6)}</Text>
                    <Text style={s.amount}>{item.amount}</Text>
                  </TouchableOpacity>
                )}
              />
            </>
          )}

          {txns.length > 0 && (
            <>
              <Text style={s.section}>Recent Transactions</Text>
              <FlatList
                data={txns}
                keyExtractor={(t) => t.sig}
                scrollEnabled={false}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={s.row}
                    onPress={() =>
                      Linking.openURL(`https://solscan.io/tx/${item.sig}`)
                    }
                  >
                    <View>
                      <Text style={s.mint}>{short(item.sig, 8)}</Text>
                      <Text style={s.time}>
                        {item.time ? timeAgo(item.time) : "pending"}
                      </Text>
                    </View>
                    <Text style={{ color: item.ok ? "#14F195" : "#EF4444", fontSize: 18 }}>
                      {item.ok ? "+" : "-"}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            </>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

// ============================================
// Styles
// ============================================

const s = StyleSheet.create({
  scroll: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    backgroundColor: "#0D0D12",
  },
  devnetBanner: {
    backgroundColor: "#1E1E28",
    borderWidth: 1,
    borderColor: "#9945FF",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginBottom: 16,
    alignSelf: "flex-start",
  },
  devnetText: {
    color: "#9945FF",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "700",
    marginBottom: 8,
  },
  subtitle: {
    color: "#6B7280",
    fontSize: 15,
    marginBottom: 28,
  },
  inputContainer: {
    backgroundColor: "#16161D",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#2A2A35",
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  input: {
    color: "#FFFFFF",
    fontSize: 15,
    paddingVertical: 14,
  },
  btnRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  btn: {
    flex: 1,
    backgroundColor: "#14F195",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnText: {
    color: "#0D0D12",
    fontWeight: "600",
    fontSize: 16,
  },
  btnGhost: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 14,
    backgroundColor: "#16161D",
    borderWidth: 1,
    borderColor: "#2A2A35",
  },
  btnGhostText: {
    color: "#9CA3AF",
    fontSize: 15,
  },
  historySection: {
    marginTop: 24,
  },
  historyTitle: {
    color: "#6B7280",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 10,
  },
  historyItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#16161D",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2A2A35",
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  historyAddress: {
    color: "#9945FF",
    fontFamily: "monospace",
    fontSize: 13,
    flex: 1,
  },
  historyArrow: {
    color: "#6B7280",
    fontSize: 18,
    marginLeft: 8,
  },
  card: {
    backgroundColor: "#16161D",
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
    marginTop: 28,
    borderWidth: 1,
    borderColor: "#2A2A35",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 4,
  },
  label: {
    color: "#6B7280",
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  balanceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 8,
  },
  balance: {
    color: "#FFFFFF",
    fontSize: 48,
    fontWeight: "700",
  },
  sol: {
    color: "#14F195",
    fontSize: 18,
    fontWeight: "600",
    marginLeft: 8,
  },
  addr: {
    color: "#9945FF",
    fontSize: 13,
    fontFamily: "monospace",
    marginTop: 16,
    backgroundColor: "#1E1E28",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  section: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "600",
    marginTop: 32,
    marginBottom: 16,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#16161D",
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#2A2A35",
  },
  mint: {
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: "monospace",
  },
  amount: {
    color: "#14F195",
    fontSize: 15,
    fontWeight: "600",
  },
  time: {
    color: "#6B7280",
    fontSize: 12,
    marginTop: 4,
  },
});
