// app/token/[mint].tsx
// Token detail screen — fetches rich metadata from Jupiter token search API
// and shows price, stats, market data, and a "Swap this token" shortcut.
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState, useCallback } from "react";
import {
  ActivityIndicator,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useWalletStore } from "../../stores/wallet-store";
import type { MintInformation } from "../../services/tokenLookup";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const short = (s: string, n = 6) => `${s.slice(0, n)}…${s.slice(-n)}`;

function fmtUsd(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(2)}K`;
  if (n >= 1)   return `$${n.toFixed(4)}`;
  // Show significant digits for micro-cap prices.
  return `$${n.toPrecision(4)}`;
}

function fmtPct(n: number | null | undefined): string {
  if (n == null) return "—";
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

function pctColor(n: number | null | undefined): string {
  if (n == null) return "#6B7280";
  return n >= 0 ? "#14F195" : "#EF4444";
}

function fmtCount(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toLocaleString();
}

// Extract the pct_change_5m / 1h / 24h from the stats sub-object.
function changePct(stats: MintInformation["stats5m"] | undefined): number | null {
  if (!stats) return null;
  return stats.priceChange ?? null;
}

// ─── API fetch ────────────────────────────────────────────────────────────────

async function fetchTokenDetail(mint: string): Promise<MintInformation | null> {
  const url = `https://lite-api.jup.ag/ultra/v1/search?query=${encodeURIComponent(mint)}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    // Response is either an array or { tokens: [] }.
    const list: MintInformation[] = Array.isArray(data)
      ? data
      : Array.isArray(data?.tokens)
      ? data.tokens
      : [];
    // Exact match on mint address.
    return list.find((t) => t.id === mint) ?? list[0] ?? null;
  } catch {
    return null;
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={s.statRow}>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={[s.statValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
    </View>
  );
}

function Divider() {
  return <View style={s.divider} />;
}

function SectionCard({ children }: { children: React.ReactNode }) {
  return <View style={s.sectionCard}>{children}</View>;
}

function SectionTitle({ title }: { title: string }) {
  return <Text style={s.sectionTitle}>{title}</Text>;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function TokenDetailScreen() {
  const { mint } = useLocalSearchParams<{ mint: string }>();
  const router   = useRouter();
  const customTokens = useWalletStore((st) => st.customTokens);

  const [token,     setToken]     = useState<MintInformation | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!mint) { setLoading(false); return; }
    if (!silent) setLoading(true);
    setError(null);
    const data = await fetchTokenDetail(mint);
    if (!data) {
      // Try to fall back to custom token store for name/symbol.
      setError("Token metadata not found on Jupiter");
    }
    setToken(data);
    setLoading(false);
    setRefreshing(false);
  }, [mint]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(true); };

  // Navigate to swap screen pre-selected on this token.
  // The swap screen will look up the token from customTokens or presets;
  // if it's unknown it will offer the "Look up" CTA automatically.
  const goSwap = () => {
    // Push to the swap tab — Expo Router doesn't support programmatic tab
    // selection with pre-fill yet, so we just navigate to /swap.
    router.push("/(tabs)/swap");
  };

  const openSolscan = () => {
    if (mint) Linking.openURL(`https://solscan.io/token/${mint}`);
  };

  // Fallback info from custom tokens store if Jupiter returned nothing.
  const customFallback = customTokens.find((t) => t.mint === mint);

  const displayName   = token?.name   ?? customFallback?.name   ?? "Unknown Token";
  const displaySymbol = token?.symbol ?? customFallback?.symbol ?? "???";
  const displayLogo   = token?.icon   ?? customFallback?.logoUri ?? null;

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={s.safe} edges={["top"]}>
        <View style={s.loadingCenter}>
          <ActivityIndicator size="large" color="#14F195" />
          <Text style={s.loadingText}>Loading token data…</Text>
        </View>
      </SafeAreaView>
    );
  }

  const price24h    = changePct(token?.stats24h);
  const price1h     = changePct(token?.stats1h);
  const price5m     = changePct(token?.stats5m);
  const price6h     = changePct(token?.stats6h);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#14F195" />
        }
      >
        {/* ── Back button ───────────────────────────────────────────────── */}
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          <Text style={s.backText}>Back</Text>
        </TouchableOpacity>

        {/* ── Header: logo + name + badges ─────────────────────────────── */}
        <View style={s.header}>
          {displayLogo ? (
            <Image
              source={{ uri: displayLogo }}
              style={s.logo}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <View style={[s.logo, s.logoFallback]}>
              <Text style={s.logoFallbackText}>{displaySymbol.charAt(0)}</Text>
            </View>
          )}
          <View style={s.headerText}>
            <Text style={s.tokenName}>{displayName}</Text>
            <View style={s.badgeRow}>
              <View style={s.symbolBadge}>
                <Text style={s.symbolBadgeText}>{displaySymbol}</Text>
              </View>
              {token?.isVerified && (
                <View style={s.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={12} color="#14F195" />
                  <Text style={s.verifiedText}>Verified</Text>
                </View>
              )}
              {token?.organicScoreLabel && (
                <View style={[s.scoreBadge, { backgroundColor: scoreColor(token.organicScoreLabel) + "22", borderColor: scoreColor(token.organicScoreLabel) + "55" }]}>
                  <Text style={[s.scoreText, { color: scoreColor(token.organicScoreLabel) }]}>
                    {token.organicScoreLabel}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* ── Price ─────────────────────────────────────────────────────── */}
        {token?.usdPrice != null && (
          <View style={s.priceBlock}>
            <Text style={s.priceValue}>{fmtUsd(token.usdPrice)}</Text>
            <View style={s.priceChanges}>
              <PriceChangePill label="5m"  pct={price5m}  />
              <PriceChangePill label="1h"  pct={price1h}  />
              <PriceChangePill label="6h"  pct={price6h}  />
              <PriceChangePill label="24h" pct={price24h} />
            </View>
          </View>
        )}

        {/* ── Error banner (partial data shown above price if available) ── */}
        {error && (
          <View style={s.errorBox}>
            <Ionicons name="warning-outline" size={14} color="#F59E0B" />
            <Text style={s.errorText}>{error}</Text>
          </View>
        )}

        {/* ── Market data ───────────────────────────────────────────────── */}
        {token && (
          <SectionCard>
            <SectionTitle title="Market Data" />
            <StatRow label="Market Cap"  value={fmtUsd(token.mcap)} />
            <Divider />
            <StatRow label="FDV"         value={fmtUsd(token.fdv)} />
            <Divider />
            <StatRow label="Liquidity"   value={fmtUsd(token.liquidity)} />
            <Divider />
            <StatRow label="Holders"     value={fmtCount(token.holderCount)} />
          </SectionCard>
        )}

        {/* ── Price changes ─────────────────────────────────────────────── */}
        {token && (price5m != null || price1h != null || price6h != null || price24h != null) && (
          <SectionCard>
            <SectionTitle title="Price Change" />
            {price5m  != null && <><StatRow label="5 min"   value={fmtPct(price5m)}  valueColor={pctColor(price5m)} /><Divider /></>}
            {price1h  != null && <><StatRow label="1 hour"  value={fmtPct(price1h)}  valueColor={pctColor(price1h)} /><Divider /></>}
            {price6h  != null && <><StatRow label="6 hours" value={fmtPct(price6h)}  valueColor={pctColor(price6h)} /><Divider /></>}
            {price24h != null && <StatRow   label="24 hours" value={fmtPct(price24h)} valueColor={pctColor(price24h)} />}
          </SectionCard>
        )}

        {/* ── Token info ────────────────────────────────────────────────── */}
        <SectionCard>
          <SectionTitle title="Token Info" />
          <StatRow label="Decimals" value={String(token?.decimals ?? customFallback?.decimals ?? "—")} />
          <Divider />
          <View style={s.statRow}>
            <Text style={s.statLabel}>Mint Address</Text>
            <Text style={[s.statValue, s.monoValue]} numberOfLines={1} ellipsizeMode="middle">
              {short(mint ?? "", 8)}
            </Text>
          </View>
          {token?.tags && token.tags.length > 0 && (
            <>
              <Divider />
              <View style={s.statRow}>
                <Text style={s.statLabel}>Tags</Text>
                <View style={s.tagRow}>
                  {token.tags.slice(0, 4).map((tag) => (
                    <View key={tag} style={s.tag}>
                      <Text style={s.tagText}>{tag}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </>
          )}
        </SectionCard>

        {/* ── Organic score ─────────────────────────────────────────────── */}
        {token?.organicScore != null && (
          <SectionCard>
            <SectionTitle title="Organic Activity" />
            <View style={s.scoreRow}>
              <View style={s.scoreBar}>
                <View
                  style={[
                    s.scoreBarFill,
                    { width: `${Math.min(100, token.organicScore)}%`, backgroundColor: scoreBarColor(token.organicScore) },
                  ]}
                />
              </View>
              <Text style={[s.scoreNum, { color: scoreBarColor(token.organicScore) }]}>
                {token.organicScore.toFixed(0)}/100
              </Text>
            </View>
            <Text style={s.scoreDesc}>
              Measures how much of the token's trading activity comes from real users vs. bots.
            </Text>
          </SectionCard>
        )}

        {/* ── Action buttons ────────────────────────────────────────────── */}
        <View style={s.actions}>
          <TouchableOpacity style={s.swapBtn} onPress={goSwap} activeOpacity={0.85}>
            <Ionicons name="swap-horizontal" size={18} color="#000" />
            <Text style={s.swapBtnText}>Swap {displaySymbol}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.solscanBtn} onPress={openSolscan} activeOpacity={0.85}>
            <Ionicons name="open-outline" size={16} color="#9945FF" />
            <Text style={s.solscanBtnText}>Solscan</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Tiny sub-component ───────────────────────────────────────────────────────

function PriceChangePill({ label, pct }: { label: string; pct: number | null }) {
  if (pct == null) return null;
  const color = pctColor(pct);
  return (
    <View style={[s.pill, { backgroundColor: color + "22", borderColor: color + "44" }]}>
      <Text style={[s.pillLabel, { color: "#6B7280" }]}>{label}</Text>
      <Text style={[s.pillValue, { color }]}>{fmtPct(pct)}</Text>
    </View>
  );
}

function scoreColor(label: string): string {
  switch (label?.toLowerCase()) {
    case "high":   return "#14F195";
    case "medium": return "#F59E0B";
    case "low":    return "#EF4444";
    default:       return "#6B7280";
  }
}

function scoreBarColor(score: number): string {
  if (score >= 70) return "#14F195";
  if (score >= 40) return "#F59E0B";
  return "#EF4444";
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: "#0D0D12" },
  scroll:  { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 12 },

  loadingCenter: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  loadingText:   { color: "#6B7280", fontSize: 14 },

  backBtn:  { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 20 },
  backText: { color: "#FFFFFF", fontSize: 16, fontWeight: "500" },

  // ── Header ──────────────────────────────────────────────────────────────
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 20,
  },
  logo: { width: 64, height: 64, borderRadius: 32 },
  logoFallback: {
    backgroundColor: "#252530",
    borderWidth: 1,
    borderColor: "#2A2A35",
    alignItems: "center",
    justifyContent: "center",
  },
  logoFallbackText: { color: "#9945FF", fontSize: 28, fontWeight: "700" },
  headerText: { flex: 1, gap: 6 },
  tokenName:  { color: "#FFFFFF", fontSize: 22, fontWeight: "700" },

  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  symbolBadge: {
    backgroundColor: "#9945FF22",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "#9945FF44",
  },
  symbolBadgeText: { color: "#9945FF", fontSize: 12, fontWeight: "600" },

  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#14F19520",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "#14F19540",
  },
  verifiedText: { color: "#14F195", fontSize: 11, fontWeight: "600" },

  scoreBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
  },
  scoreText: { fontSize: 11, fontWeight: "600" },

  // ── Price ───────────────────────────────────────────────────────────────
  priceBlock: { marginBottom: 20 },
  priceValue: { color: "#FFFFFF", fontSize: 38, fontWeight: "700", marginBottom: 12 },
  priceChanges: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  pillLabel: { fontSize: 11 },
  pillValue: { fontSize: 13, fontWeight: "600" },

  // ── Error ───────────────────────────────────────────────────────────────
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F59E0B18",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#F59E0B33",
    padding: 12,
    marginBottom: 16,
  },
  errorText: { color: "#F59E0B", fontSize: 13, flex: 1 },

  // ── Section card ────────────────────────────────────────────────────────
  sectionCard: {
    backgroundColor: "#16161D",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#2A2A35",
    paddingHorizontal: 18,
    paddingVertical: 14,
    marginBottom: 12,
  },
  sectionTitle: {
    color: "#6B7280",
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  divider: { height: 1, backgroundColor: "#2A2A35", marginVertical: 8 },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statLabel: { color: "#6B7280", fontSize: 14 },
  statValue: { color: "#FFFFFF", fontSize: 14, fontWeight: "600", textAlign: "right", flex: 1, marginLeft: 16 },
  monoValue: { fontFamily: "monospace", fontWeight: "400", fontSize: 13 },

  // ── Tags ────────────────────────────────────────────────────────────────
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, justifyContent: "flex-end", flex: 1, marginLeft: 16 },
  tag: {
    backgroundColor: "#1E1E28",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "#2A2A35",
  },
  tagText: { color: "#9CA3AF", fontSize: 11 },

  // ── Organic score ────────────────────────────────────────────────────────
  scoreRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 },
  scoreBar: {
    flex: 1, height: 8, backgroundColor: "#2A2A35",
    borderRadius: 4, overflow: "hidden",
  },
  scoreBarFill: { height: "100%", borderRadius: 4 },
  scoreNum:  { fontSize: 14, fontWeight: "700", minWidth: 56, textAlign: "right" },
  scoreDesc: { color: "#6B7280", fontSize: 12, lineHeight: 18 },

  // ── Actions ─────────────────────────────────────────────────────────────
  actions: { flexDirection: "row", gap: 12, marginTop: 8 },
  swapBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#14F195",
    paddingVertical: 16,
    borderRadius: 16,
  },
  swapBtnText: { color: "#000000", fontSize: 16, fontWeight: "700" },

  solscanBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#1A0E2E",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#9945FF",
  },
  solscanBtnText: { color: "#9945FF", fontSize: 14, fontWeight: "600" },
});
