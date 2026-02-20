// app/(tabs)/swap.tsx
// Jupiter v6 swap screen with live quotes and MWA signing.
import { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useWallet } from "../../context/WalletContext";
import {
  TOKEN_INFO,
  TOKEN_LIST,
  getSwapQuote,
  getSwapTransaction,
  toSmallestUnit,
  fromSmallestUnit,
  type TokenSymbol,
  type SwapQuote,
} from "../../services/jupiter";

// ─── Token picker modal ────────────────────────────────────────────────────────

interface TokenPickerProps {
  visible: boolean;
  selected: TokenSymbol;
  onSelect: (token: TokenSymbol) => void;
  onClose: () => void;
}

function TokenPicker({ visible, selected, onSelect, onClose }: TokenPickerProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={m.overlay} activeOpacity={1} onPress={onClose} />
      <View style={m.sheet}>
        <Text style={m.sheetTitle}>Select Token</Text>
        <FlatList
          data={TOKEN_LIST}
          keyExtractor={(t) => t}
          renderItem={({ item }) => {
            const info = TOKEN_INFO[item];
            const isSelected = item === selected;
            return (
              <TouchableOpacity
                style={[m.tokenRow, isSelected && m.tokenRowSelected]}
                onPress={() => { onSelect(item); onClose(); }}
              >
                <View style={[m.tokenDot, { backgroundColor: info.color }]} />
                <View style={m.tokenRowText}>
                  <Text style={m.tokenRowSymbol}>{info.symbol}</Text>
                  <Text style={m.tokenRowLabel}>{info.label}</Text>
                </View>
                {isSelected && <Ionicons name="checkmark" size={18} color="#14F195" />}
              </TouchableOpacity>
            );
          }}
        />
      </View>
    </Modal>
  );
}

// ─── Swap screen ───────────────────────────────────────────────────────────────

export default function SwapScreen() {
  const { connected, address, connect, signAndSendVersioned } = useWallet();

  const [fromToken, setFromToken] = useState<TokenSymbol>("SOL");
  const [toToken,   setToToken]   = useState<TokenSymbol>("USDC");
  const [fromAmount, setFromAmount] = useState("");

  const [quote,      setQuote]      = useState<SwapQuote | null>(null);
  const [quoting,    setQuoting]    = useState(false);
  const [swapping,   setSwapping]   = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  const [pickerFor, setPickerFor] = useState<"from" | "to" | null>(null);

  // Debounce timer ref.
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fromInfo = TOKEN_INFO[fromToken];
  const toInfo   = TOKEN_INFO[toToken];

  // ── Quote fetch ────────────────────────────────────────────────────────────

  const fetchQuote = useCallback(async (amount: string, from: TokenSymbol, to: TokenSymbol) => {
    const lamports = toSmallestUnit(amount, TOKEN_INFO[from].decimals);
    if (lamports <= 0) {
      setQuote(null);
      setQuoteError(null);
      return;
    }
    setQuoting(true);
    setQuoteError(null);
    const result = await getSwapQuote({
      inputMint:  TOKEN_INFO[from].mint,
      outputMint: TOKEN_INFO[to].mint,
      amount:     lamports,
    });
    setQuoting(false);
    if (result) {
      setQuote(result);
    } else {
      setQuote(null);
      setQuoteError("No route found");
    }
  }, []);

  // Re-fetch with 600 ms debounce whenever inputs change.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchQuote(fromAmount, fromToken, toToken);
    }, 600);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [fromAmount, fromToken, toToken, fetchQuote]);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const outAmount = quote
    ? parseFloat(fromSmallestUnit(quote.outAmount, toInfo.decimals)).toFixed(6)
    : "";

  const priceImpact = quote
    ? parseFloat(quote.priceImpactPct) * 100
    : null;

  const swapTokens = () => {
    setFromToken(toToken);
    setToToken(fromToken);
    setFromAmount(outAmount);
    setQuote(null);
  };

  // ── Swap ───────────────────────────────────────────────────────────────────

  const handleSwap = async () => {
    if (!connected || !address) {
      Alert.alert("Connect Wallet", "Connect your Phantom wallet first.");
      return;
    }
    if (!quote) {
      Alert.alert("No Quote", "Wait for a quote before swapping.");
      return;
    }
    setSwapping(true);
    try {
      const txResult = await getSwapTransaction({ quote, userPublicKey: address });
      if (!txResult) throw new Error("Failed to build swap transaction");

      const sig = await signAndSendVersioned(txResult.swapTransaction);
      Alert.alert(
        "Swap Submitted",
        `Transaction: ${sig.slice(0, 8)}...${sig.slice(-8)}`,
        [{ text: "OK" }]
      );
      // Reset form.
      setFromAmount("");
      setQuote(null);
    } catch (e: any) {
      Alert.alert("Swap Failed", e?.message ?? "Unknown error");
    } finally {
      setSwapping(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={s.title}>Swap</Text>

        {/* ── From card ──────────────────────────────────────────────────── */}
        <View style={[s.card, { marginBottom: 10 }]}>
          <View style={s.cardHeader}>
            <TouchableOpacity
              style={s.tokenSelector}
              onPress={() => setPickerFor("from")}
            >
              <View style={[s.tokenDot, { backgroundColor: fromInfo.color }]} />
              <Text style={s.tokenName}>{fromToken}</Text>
              <Ionicons name="chevron-down" size={16} color="#888" />
            </TouchableOpacity>
            <TextInput
              style={s.amountInput}
              value={fromAmount}
              onChangeText={setFromAmount}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor="#444"
              returnKeyType="done"
            />
          </View>
          <Text style={s.cardSub}>You pay</Text>
        </View>

        {/* ── Swap arrow ─────────────────────────────────────────────────── */}
        <View style={s.arrowContainer}>
          <TouchableOpacity style={s.swapArrow} onPress={swapTokens}>
            <Ionicons name="swap-vertical" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* ── To card ────────────────────────────────────────────────────── */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <TouchableOpacity
              style={s.tokenSelector}
              onPress={() => setPickerFor("to")}
            >
              <View style={[s.tokenDot, { backgroundColor: toInfo.color }]} />
              <Text style={s.tokenName}>{toToken}</Text>
              <Ionicons name="chevron-down" size={16} color="#888" />
            </TouchableOpacity>
            <View style={s.outputArea}>
              {quoting ? (
                <ActivityIndicator size="small" color="#14F195" />
              ) : (
                <Text style={[s.amountOutput, !outAmount && s.amountOutputEmpty]}>
                  {outAmount || "0"}
                </Text>
              )}
            </View>
          </View>
          <Text style={s.cardSub}>You receive</Text>
        </View>

        {/* ── Quote details ──────────────────────────────────────────────── */}
        {quoteError && (
          <Text style={s.quoteError}>{quoteError}</Text>
        )}
        {quote && priceImpact !== null && (
          <View style={s.quoteBox}>
            <View style={s.quoteRow}>
              <Text style={s.quoteLabel}>Price Impact</Text>
              <Text style={[
                s.quoteValue,
                priceImpact > 1 && { color: "#F59E0B" },
                priceImpact > 5 && { color: "#EF4444" },
              ]}>
                {priceImpact.toFixed(3)}%
              </Text>
            </View>
            <View style={s.quoteRow}>
              <Text style={s.quoteLabel}>Slippage</Text>
              <Text style={s.quoteValue}>0.5%</Text>
            </View>
          </View>
        )}

        {/* ── Action button ─────────────────────────────────────────────── */}
        {!connected ? (
          <TouchableOpacity style={s.connectBtn} onPress={connect}>
            <Text style={s.connectBtnText}>Connect Wallet to Swap</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[s.swapBtn, (!quote || swapping) && s.swapBtnDisabled]}
            onPress={handleSwap}
            disabled={!quote || swapping}
          >
            {swapping ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={s.swapBtnText}>
                {quote ? `Swap ${fromToken} → ${toToken}` : "Enter an amount"}
              </Text>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* ── Token picker modals ─────────────────────────────────────────── */}
      <TokenPicker
        visible={pickerFor === "from"}
        selected={fromToken}
        onSelect={(t) => {
          if (t === toToken) setToToken(fromToken);
          setFromToken(t);
          setQuote(null);
        }}
        onClose={() => setPickerFor(null)}
      />
      <TokenPicker
        visible={pickerFor === "to"}
        selected={toToken}
        onSelect={(t) => {
          if (t === fromToken) setFromToken(toToken);
          setToToken(t);
          setQuote(null);
        }}
        onClose={() => setPickerFor(null)}
      />
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#0D0D12",
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "700",
    marginBottom: 24,
  },
  card: {
    backgroundColor: "#16161D",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#2A2A35",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardSub: {
    color: "#6B7280",
    fontSize: 12,
    marginTop: 10,
  },
  tokenSelector: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#252530",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 24,
    gap: 6,
  },
  tokenDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  tokenName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  amountInput: {
    fontSize: 36,
    fontWeight: "400",
    color: "#FFFFFF",
    textAlign: "right",
    flex: 1,
    marginLeft: 10,
  },
  outputArea: {
    flex: 1,
    alignItems: "flex-end",
    marginLeft: 10,
  },
  amountOutput: {
    fontSize: 36,
    fontWeight: "400",
    color: "#14F195",
    textAlign: "right",
  },
  amountOutputEmpty: {
    color: "#444",
  },
  arrowContainer: {
    alignItems: "center",
    marginVertical: -20,
    zIndex: 10,
  },
  swapArrow: {
    backgroundColor: "#0D0D12",
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#0D0D12",
  },
  quoteError: {
    color: "#EF4444",
    fontSize: 13,
    textAlign: "center",
    marginTop: 12,
  },
  quoteBox: {
    backgroundColor: "#16161D",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#2A2A35",
    padding: 14,
    marginTop: 12,
    gap: 8,
  },
  quoteRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  quoteLabel: {
    color: "#6B7280",
    fontSize: 13,
  },
  quoteValue: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "500",
  },
  connectBtn: {
    backgroundColor: "#9945FF",
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 24,
  },
  connectBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  swapBtn: {
    backgroundColor: "#14F195",
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 24,
  },
  swapBtnDisabled: {
    opacity: 0.4,
  },
  swapBtnText: {
    color: "#000000",
    fontSize: 16,
    fontWeight: "700",
  },
});

// ─── Modal styles ──────────────────────────────────────────────────────────────

const m = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  sheet: {
    backgroundColor: "#16161D",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderColor: "#2A2A35",
    maxHeight: "55%",
  },
  sheetTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
  },
  tokenRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1E1E28",
  },
  tokenRowSelected: {
    backgroundColor: "#1E1E28",
    borderRadius: 10,
    paddingHorizontal: 8,
  },
  tokenDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  tokenRowText: {
    flex: 1,
  },
  tokenRowSymbol: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  tokenRowLabel: {
    color: "#6B7280",
    fontSize: 13,
  },
});
