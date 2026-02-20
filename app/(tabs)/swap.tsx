// app/(tabs)/swap.tsx
// Jupiter v6 swap screen — supports any token by CA in addition to presets.
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
  Pressable,
} from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useWallet } from "../../context/WalletContext";
import { useWalletStore } from "../../stores/wallet-store";
import { lookupToken } from "../../services/tokenLookup";
import {
  TOKEN_INFO,
  TOKEN_LIST,
  resolveTokenInfo,
  getSwapQuote,
  getSwapTransaction,
  toSmallestUnit,
  fromSmallestUnit,
  type TokenInfo,
  type SwapQuote,
} from "../../services/jupiter";

// ─── Shared helpers ───────────────────────────────────────────────────────────

/** Returns true when `s` looks like a Solana mint address (base58, 32–44 chars). */
function looksLikeMint(s: string): boolean {
  return s.length >= 32 && s.length <= 44 && !/\s/.test(s);
}

// ─── Token logo ───────────────────────────────────────────────────────────────

interface TokenLogoProps {
  info: TokenInfo;
  size: number;
}

function TokenLogo({ info, size }: TokenLogoProps) {
  if (info.logoUri) {
    return (
      <Image
        source={{ uri: info.logoUri }}
        style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: info.color + "33" }}
        contentFit="cover"
        transition={150}
      />
    );
  }
  // Fallback: colored circle with first letter of symbol.
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: info.color + "33", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: info.color + "66" }}>
      <Text style={{ color: info.color, fontSize: size * 0.38, fontWeight: "700" }}>
        {info.symbol.charAt(0)}
      </Text>
    </View>
  );
}

// ─── Token selector button ────────────────────────────────────────────────────

function TokenSelector({ info, onPress }: { info: TokenInfo; onPress: () => void }) {
  return (
    <TouchableOpacity style={s.tokenSelector} onPress={onPress} activeOpacity={0.7}>
      <TokenLogo info={info} size={28} />
      <Text style={s.tokenName}>{info.symbol}</Text>
      <Ionicons name="chevron-down" size={14} color="#888" />
    </TouchableOpacity>
  );
}

// ─── Token picker modal ───────────────────────────────────────────────────────

interface TokenPickerProps {
  visible: boolean;
  selectedMint: string;
  onSelect: (info: TokenInfo) => void;
  onClose: () => void;
}

function TokenPicker({ visible, selectedMint, onSelect, onClose }: TokenPickerProps) {
  const customTokens     = useWalletStore((s) => s.customTokens);
  const addCustomToken   = useWalletStore((s) => s.addCustomToken);
  const removeCustomToken = useWalletStore((s) => s.removeCustomToken);

  const [query,     setQuery]     = useState("");
  const [looking,   setLooking]   = useState(false);
  const [lookupErr, setLookupErr] = useState<string | null>(null);

  // Reset on open.
  useEffect(() => {
    if (visible) { setQuery(""); setLookupErr(null); }
  }, [visible]);

  // Build the full list: custom tokens first, then presets.
  const presetList: TokenInfo[] = TOKEN_LIST.map((sym) => TOKEN_INFO[sym]);
  const customList: TokenInfo[] = customTokens.map((ct) => ({
    symbol:  ct.symbol,
    mint:    ct.mint,
    decimals: ct.decimals,
    color:   ct.color,
    label:   ct.name,
    logoUri: ct.logoUri,
  }));

  // Filter by query (symbol, name, or partial mint).
  const q = query.trim().toLowerCase();
  const filterFn = (info: TokenInfo) =>
    !q ||
    info.symbol.toLowerCase().includes(q) ||
    info.label.toLowerCase().includes(q) ||
    info.mint.toLowerCase().includes(q);

  const filteredCustom = customList.filter(filterFn);
  const filteredPreset = presetList.filter(filterFn);

  const allRows: Array<TokenInfo | "custom-header" | "preset-header"> = [];
  if (filteredCustom.length > 0) {
    allRows.push("custom-header");
    allRows.push(...filteredCustom);
  }
  if (filteredPreset.length > 0) {
    allRows.push("preset-header");
    allRows.push(...filteredPreset);
  }

  // When query looks like a mint and isn't already in any list, offer lookup.
  const isNewMint =
    looksLikeMint(query.trim()) &&
    !customList.some((t) => t.mint.toLowerCase() === query.trim().toLowerCase()) &&
    !presetList.some((t) => t.mint.toLowerCase() === query.trim().toLowerCase());

  const handleLookup = async () => {
    setLooking(true);
    setLookupErr(null);
    try {
      const ct = await lookupToken(query.trim());
      addCustomToken(ct);
      const info: TokenInfo = {
        symbol: ct.symbol, mint: ct.mint, decimals: ct.decimals,
        color: ct.color, label: ct.name, logoUri: ct.logoUri,
      };
      onSelect(info);
      onClose();
    } catch (e: any) {
      setLookupErr(e?.message ?? "Lookup failed");
    } finally {
      setLooking(false);
    }
  };

  const renderRow = ({ item }: { item: typeof allRows[number] }) => {
    if (item === "custom-header") {
      return <Text style={m.sectionLabel}>Saved tokens</Text>;
    }
    if (item === "preset-header") {
      return <Text style={m.sectionLabel}>Popular tokens</Text>;
    }
    const info = item as TokenInfo;
    const isSelected = info.mint === selectedMint;
    const isCustom   = customTokens.some((t) => t.mint === info.mint);
    return (
      <TouchableOpacity
        style={[m.tokenRow, isSelected && m.tokenRowSelected]}
        onPress={() => { onSelect(info); onClose(); }}
        onLongPress={() => {
          if (!isCustom) return;
          Alert.alert(
            `Remove ${info.symbol}?`,
            "This will remove it from your saved tokens.",
            [
              { text: "Cancel", style: "cancel" },
              { text: "Remove", style: "destructive", onPress: () => removeCustomToken(info.mint) },
            ]
          );
        }}
        activeOpacity={0.7}
      >
        <TokenLogo info={info} size={44} />
        <View style={m.tokenRowText}>
          <View style={m.tokenRowTop}>
            <Text style={m.tokenRowSymbol}>{info.symbol}</Text>
            {isCustom && <View style={m.customBadge}><Text style={m.customBadgeText}>custom</Text></View>}
          </View>
          <Text style={m.tokenRowLabel} numberOfLines={1}>{info.label}</Text>
        </View>
        {isSelected && <Ionicons name="checkmark-circle" size={22} color="#14F195" />}
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={m.overlay} onPress={onClose} />
      <SafeAreaView style={m.safeSheet} edges={["bottom"]}>
        <View style={m.sheet}>
          <View style={m.sheetHandle} />
          <Text style={m.sheetTitle}>Select Token</Text>

          {/* Search / CA input */}
          <View style={m.searchRow}>
            <Ionicons name="search" size={16} color="#6B7280" style={{ marginRight: 8 }} />
            <TextInput
              style={m.searchInput}
              value={query}
              onChangeText={(t) => { setQuery(t); setLookupErr(null); }}
              placeholder="Search name, symbol or paste CA…"
              placeholderTextColor="#3A3A4A"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery("")}>
                <Ionicons name="close-circle" size={16} color="#6B7280" />
              </TouchableOpacity>
            )}
          </View>

          {/* CA lookup CTA */}
          {isNewMint && (
            <TouchableOpacity
              style={m.lookupBtn}
              onPress={handleLookup}
              disabled={looking}
              activeOpacity={0.8}
            >
              {looking ? (
                <ActivityIndicator size="small" color="#14F195" />
              ) : (
                <>
                  <Ionicons name="add-circle-outline" size={16} color="#14F195" />
                  <Text style={m.lookupBtnText}>Look up token on Jupiter</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {lookupErr && (
            <View style={m.lookupErr}>
              <Ionicons name="warning-outline" size={14} color="#EF4444" />
              <Text style={m.lookupErrText}>{lookupErr}</Text>
            </View>
          )}

          {/* Token list */}
          {allRows.length > 0 ? (
            <FlatList
              data={allRows}
              keyExtractor={(item, i) =>
                typeof item === "string" ? item : (item as TokenInfo).mint + i
              }
              renderItem={renderRow}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            />
          ) : (
            <View style={m.emptyState}>
              <Text style={m.emptyText}>
                {looksLikeMint(query.trim())
                  ? "Tap \"Look up\" above to fetch token info"
                  : "No tokens match your search"}
              </Text>
            </View>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

// ─── Swap screen ──────────────────────────────────────────────────────────────

export default function SwapScreen() {
  const { connected, address, connect, signAndSendVersioned } = useWallet();
  const customTokens = useWalletStore((s) => s.customTokens);

  const [fromInfo, setFromInfo] = useState<TokenInfo>(TOKEN_INFO.SOL);
  const [toInfo,   setToInfo]   = useState<TokenInfo>(TOKEN_INFO.USDC);
  const [fromAmount, setFromAmount] = useState("");

  const [quote,      setQuote]      = useState<SwapQuote | null>(null);
  const [quoting,    setQuoting]    = useState(false);
  const [swapping,   setSwapping]   = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  const [pickerFor, setPickerFor] = useState<"from" | "to" | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Re-resolve token infos when custom tokens change ──────────────────────
  // (e.g. user deleted a custom token from the picker)
  useEffect(() => {
    const resolved = resolveTokenInfo(fromInfo.mint, customTokens);
    if (resolved) setFromInfo(resolved);
  }, [customTokens]);

  useEffect(() => {
    const resolved = resolveTokenInfo(toInfo.mint, customTokens);
    if (resolved) setToInfo(resolved);
  }, [customTokens]);

  // ── Quote fetch ────────────────────────────────────────────────────────────

  const fetchQuote = useCallback(
    async (amount: string, from: TokenInfo, to: TokenInfo) => {
      const units = toSmallestUnit(amount, from.decimals);
      if (units <= 0) { setQuote(null); setQuoteError(null); return; }
      setQuoting(true);
      setQuoteError(null);
      const result = await getSwapQuote({
        inputMint:  from.mint,
        outputMint: to.mint,
        amount:     units,
      });
      setQuoting(false);
      if (result) {
        setQuote(result);
      } else {
        setQuote(null);
        setQuoteError("No route found for this pair");
      }
    },
    []
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchQuote(fromAmount, fromInfo, toInfo), 600);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [fromAmount, fromInfo, toInfo, fetchQuote]);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const outAmount = quote
    ? parseFloat(fromSmallestUnit(quote.outAmount, toInfo.decimals)).toFixed(6)
    : "";

  const priceImpact = quote ? parseFloat(quote.priceImpactPct) * 100 : null;

  const impactColor =
    priceImpact === null ? "#FFFFFF"
    : priceImpact > 5    ? "#EF4444"
    : priceImpact > 1    ? "#F59E0B"
    :                      "#14F195";

  const swapTokens = () => {
    const prevFrom = fromInfo;
    setFromInfo(toInfo);
    setToInfo(prevFrom);
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
        `Signature: ${sig.slice(0, 8)}...${sig.slice(-8)}`,
        [{ text: "OK" }]
      );
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
      <ScrollView style={s.scroll} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <Text style={s.title}>Swap</Text>

        {/* ── From card ────────────────────────────────────────────────── */}
        <View style={s.card}>
          <Text style={s.cardLabel}>You pay</Text>
          <View style={s.cardRow}>
            <TokenSelector info={fromInfo} onPress={() => setPickerFor("from")} />
            <TextInput
              style={s.amountInput}
              value={fromAmount}
              onChangeText={setFromAmount}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor="#3A3A4A"
              returnKeyType="done"
            />
          </View>
          <Text style={s.tokenSubName}>{fromInfo.label}</Text>
        </View>

        {/* ── Direction toggle ─────────────────────────────────────────── */}
        <View style={s.arrowRow}>
          <View style={s.arrowLine} />
          <TouchableOpacity style={s.swapArrow} onPress={swapTokens} activeOpacity={0.8}>
            <Ionicons name="swap-vertical" size={18} color="#FFF" />
          </TouchableOpacity>
          <View style={s.arrowLine} />
        </View>

        {/* ── To card ──────────────────────────────────────────────────── */}
        <View style={s.card}>
          <Text style={s.cardLabel}>You receive</Text>
          <View style={s.cardRow}>
            <TokenSelector info={toInfo} onPress={() => setPickerFor("to")} />
            <View style={s.outputArea}>
              {quoting
                ? <ActivityIndicator size="small" color="#14F195" />
                : <Text style={[s.amountOutput, !outAmount && s.amountOutputPlaceholder]}>{outAmount || "0"}</Text>
              }
            </View>
          </View>
          <Text style={s.tokenSubName}>{toInfo.label}</Text>
        </View>

        {/* ── Quote error ───────────────────────────────────────────────── */}
        {quoteError && (
          <View style={s.errorBox}>
            <Ionicons name="warning-outline" size={14} color="#EF4444" />
            <Text style={s.errorText}>{quoteError}</Text>
          </View>
        )}

        {/* ── Quote details ─────────────────────────────────────────────── */}
        {quote && (
          <View style={s.quoteBox}>
            <View style={s.quoteRow}>
              <Text style={s.quoteLabel}>Rate</Text>
              <Text style={s.quoteValue}>
                1 {fromInfo.symbol} ≈{" "}
                {(
                  parseFloat(fromSmallestUnit(quote.outAmount, toInfo.decimals)) /
                  parseFloat(fromSmallestUnit(quote.inAmount, fromInfo.decimals))
                ).toFixed(6)}{" "}
                {toInfo.symbol}
              </Text>
            </View>
            <View style={s.quoteRow}>
              <Text style={s.quoteLabel}>Price Impact</Text>
              <Text style={[s.quoteValue, { color: impactColor }]}>
                {priceImpact !== null ? `${priceImpact.toFixed(3)}%` : "—"}
              </Text>
            </View>
            <View style={s.quoteRow}>
              <Text style={s.quoteLabel}>Max Slippage</Text>
              <Text style={s.quoteValue}>0.5%</Text>
            </View>
          </View>
        )}

        {/* ── Route ─────────────────────────────────────────────────────── */}
        {quote && (
          <View style={s.routeRow}>
            <Ionicons name="git-branch-outline" size={13} color="#6B7280" />
            <Text style={s.routeText}>
              Route via Jupiter · {quote.routePlan.length} hop{quote.routePlan.length !== 1 ? "s" : ""}
            </Text>
          </View>
        )}

        {/* ── Action button ─────────────────────────────────────────────── */}
        {!connected ? (
          <TouchableOpacity style={s.connectBtn} onPress={connect} activeOpacity={0.85}>
            <Ionicons name="wallet-outline" size={18} color="#FFF" style={{ marginRight: 8 }} />
            <Text style={s.connectBtnText}>Connect Wallet to Swap</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[s.swapBtn, (!quote || swapping) && s.swapBtnDisabled]}
            onPress={handleSwap}
            disabled={!quote || swapping}
            activeOpacity={0.85}
          >
            {swapping ? (
              <ActivityIndicator color="#000" />
            ) : (
              <View style={s.swapBtnInner}>
                <TokenLogo info={fromInfo} size={22} />
                <Text style={s.swapBtnText}>
                  {quote ? `Swap ${fromInfo.symbol} → ${toInfo.symbol}` : "Enter an amount"}
                </Text>
                <TokenLogo info={toInfo} size={22} />
              </View>
            )}
          </TouchableOpacity>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* ── Token pickers ───────────────────────────────────────────────── */}
      <TokenPicker
        visible={pickerFor === "from"}
        selectedMint={fromInfo.mint}
        onSelect={(info) => {
          if (info.mint === toInfo.mint) setToInfo(fromInfo);
          setFromInfo(info);
          setQuote(null);
        }}
        onClose={() => setPickerFor(null)}
      />
      <TokenPicker
        visible={pickerFor === "to"}
        selectedMint={toInfo.mint}
        onSelect={(info) => {
          if (info.mint === fromInfo.mint) setFromInfo(toInfo);
          setToInfo(info);
          setQuote(null);
        }}
        onClose={() => setPickerFor(null)}
      />
    </SafeAreaView>
  );
}

// ─── Swap screen styles ───────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: "#0D0D12" },
  scroll:  { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 16 },
  title:   { color: "#FFFFFF", fontSize: 32, fontWeight: "700", marginBottom: 24 },

  card: {
    backgroundColor: "#16161D",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#2A2A35",
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  cardLabel: {
    color: "#6B7280",
    fontSize: 12,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  tokenSubName: { color: "#6B7280", fontSize: 12, marginTop: 10, marginLeft: 2 },

  tokenSelector: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E1E28",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    gap: 8,
    borderWidth: 1,
    borderColor: "#2A2A35",
  },
  tokenName: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },

  amountInput: {
    fontSize: 36,
    fontWeight: "300",
    color: "#FFFFFF",
    textAlign: "right",
    flex: 1,
    marginLeft: 12,
  },
  outputArea:              { flex: 1, alignItems: "flex-end", marginLeft: 12 },
  amountOutput:            { fontSize: 36, fontWeight: "300", color: "#14F195", textAlign: "right" },
  amountOutputPlaceholder: { color: "#3A3A4A" },

  arrowRow:  { flexDirection: "row", alignItems: "center", marginVertical: 10 },
  arrowLine: { flex: 1, height: 1, backgroundColor: "#2A2A35" },
  swapArrow: {
    backgroundColor: "#252530",
    width: 40, height: 40, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
    marginHorizontal: 12, borderWidth: 1, borderColor: "#2A2A35",
  },

  quoteBox: {
    backgroundColor: "#16161D",
    borderRadius: 16, borderWidth: 1, borderColor: "#2A2A35",
    paddingHorizontal: 16, paddingVertical: 12,
    marginTop: 12, gap: 10,
  },
  quoteRow:  { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  quoteLabel: { color: "#6B7280", fontSize: 13 },
  quoteValue: { color: "#FFFFFF", fontSize: 13, fontWeight: "500" },

  routeRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 8, paddingHorizontal: 4 },
  routeText: { color: "#6B7280", fontSize: 12 },

  errorBox: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10, paddingHorizontal: 4 },
  errorText: { color: "#EF4444", fontSize: 13 },

  connectBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: "#9945FF", paddingVertical: 18, borderRadius: 16, marginTop: 20,
  },
  connectBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },

  swapBtn:         { backgroundColor: "#14F195", paddingVertical: 18, borderRadius: 16, alignItems: "center", marginTop: 20 },
  swapBtnDisabled: { opacity: 0.35 },
  swapBtnInner:    { flexDirection: "row", alignItems: "center", gap: 10 },
  swapBtnText:     { color: "#000000", fontSize: 16, fontWeight: "700" },
});

// ─── Token picker modal styles ────────────────────────────────────────────────

const m = StyleSheet.create({
  overlay:   { flex: 1, backgroundColor: "rgba(0,0,0,0.55)" },
  safeSheet: { backgroundColor: "#16161D" },
  sheet: {
    backgroundColor: "#16161D",
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingTop: 12, paddingHorizontal: 20, paddingBottom: 8,
    borderTopWidth: 1, borderColor: "#2A2A35",
    maxHeight: "75%",
  },
  sheetHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: "#3A3A4A", alignSelf: "center", marginBottom: 16,
  },
  sheetTitle: { color: "#FFFFFF", fontSize: 18, fontWeight: "700", marginBottom: 14 },

  searchRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#1E1E28", borderRadius: 14,
    borderWidth: 1, borderColor: "#2A2A35",
    paddingHorizontal: 14, paddingVertical: 10,
    marginBottom: 12,
  },
  searchInput: { flex: 1, color: "#FFFFFF", fontSize: 14 },

  lookupBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, backgroundColor: "#14F19515",
    borderRadius: 12, borderWidth: 1, borderColor: "#14F19540",
    paddingVertical: 12, marginBottom: 10,
  },
  lookupBtnText: { color: "#14F195", fontSize: 14, fontWeight: "600" },

  lookupErr: {
    flexDirection: "row", alignItems: "center", gap: 6,
    marginBottom: 10, paddingHorizontal: 4,
  },
  lookupErrText: { color: "#EF4444", fontSize: 13 },

  sectionLabel: {
    color: "#6B7280", fontSize: 11,
    textTransform: "uppercase", letterSpacing: 0.8,
    marginTop: 8, marginBottom: 4, paddingHorizontal: 4,
  },

  tokenRow: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 10, paddingHorizontal: 8,
    gap: 14, borderRadius: 14,
  },
  tokenRowSelected: { backgroundColor: "#1E1E28" },
  tokenRowText:     { flex: 1 },
  tokenRowTop:      { flexDirection: "row", alignItems: "center", gap: 6 },
  tokenRowSymbol:   { color: "#FFFFFF", fontSize: 15, fontWeight: "600" },
  tokenRowLabel:    { color: "#6B7280", fontSize: 13, marginTop: 1 },

  customBadge: {
    backgroundColor: "#14F19520", borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 1,
    borderWidth: 1, borderColor: "#14F19540",
  },
  customBadgeText: { color: "#14F195", fontSize: 10, fontWeight: "600" },

  emptyState: { alignItems: "center", paddingVertical: 32 },
  emptyText:  { color: "#6B7280", fontSize: 14, textAlign: "center" },
});
