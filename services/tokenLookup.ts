// services/tokenLookup.ts
// Token metadata lookup via Jupiter Tokens API v2 schema.
//
// The canonical v2 endpoint (api.jup.ag/tokens/v2/search) requires an API key.
// The lite mirror (lite-api.jup.ag/ultra/v1/search) is identical and keyless.
//
// Spec: https://dev.jup.ag/api-reference/tokens/v2/search
//   GET /search?query=<symbol|name|mint>
//   Comma-separate up to 100 mint addresses for a multi-mint lookup.

import { type CustomToken } from "../stores/wallet-store";

// ─── v2 schema types ─────────────────────────────────────────────────────────

interface SwapStats {
  priceChange: number | null;
  liquidityChange: number | null;
  volumeChange: number | null;
  buyVolume: number | null;
  sellVolume: number | null;
  numBuys: number | null;
  numSells: number | null;
  numTraders: number | null;
}

export interface MintInformation {
  id: string;
  name: string;
  symbol: string;
  icon: string | null;
  decimals: number;
  holderCount: number | null;
  fdv: number | null;
  mcap: number | null;
  usdPrice: number | null;
  liquidity: number | null;
  stats5m: SwapStats | null;
  stats1h: SwapStats | null;
  stats6h: SwapStats | null;
  stats24h: SwapStats | null;
  audit: {
    isSus: boolean | null;
    mintAuthorityDisabled: boolean | null;
    freezeAuthorityDisabled: boolean | null;
    topHoldersPercentage: number | null;
  } | null;
  organicScore: number;
  organicScoreLabel: "high" | "medium" | "low";
  isVerified: boolean | null;
  tags: string[] | null;
  updatedAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SEARCH_URL = "https://lite-api.jup.ag/ultra/v1/search";

const FALLBACK_COLORS = [
  "#9945FF", "#14F195", "#2775CA", "#F7931A",
  "#E0B354", "#26A17B", "#EF4444", "#60A5FA",
];

function fallbackColor(mint: string): string {
  let hash = 0;
  for (let i = 0; i < mint.length; i++) {
    hash = (hash * 31 + mint.charCodeAt(i)) >>> 0;
  }
  return FALLBACK_COLORS[hash % FALLBACK_COLORS.length];
}

async function jupiterSearch(query: string): Promise<MintInformation[]> {
  const res = await fetch(`${SEARCH_URL}?query=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error(`Jupiter search failed (HTTP ${res.status})`);
  return res.json();
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Look up a single token by its mint address.
 *
 * The v2 API supports comma-separated multi-mint queries; when a single mint
 * is passed the response array is filtered to an exact `id` match.
 *
 * Throws a human-readable string on validation failure, API error, or when
 * the mint is not listed on Jupiter.
 */
export async function lookupToken(mint: string): Promise<CustomToken> {
  const trimmed = mint.trim();

  // Solana base58 addresses are 32–44 characters, no whitespace.
  if (trimmed.length < 32 || trimmed.length > 44 || /\s/.test(trimmed)) {
    throw new Error("Not a valid Solana mint address");
  }

  let results: MintInformation[];
  try {
    results = await jupiterSearch(trimmed);
  } catch (e: any) {
    throw new Error(e?.message ?? "Network error — check your connection");
  }

  // v2 does fuzzy search on symbol/name too; pin to exact mint match.
  const match = results.find(
    (r) => r.id.toLowerCase() === trimmed.toLowerCase()
  );

  if (!match) {
    throw new Error("Token not found — not listed on Jupiter");
  }

  return mintInformationToCustomToken(match);
}

/**
 * Look up up to 100 mints in one round-trip (v2 comma-separated batch).
 * Returns only the mints that matched; silently skips unrecognised addresses.
 */
export async function lookupTokenBatch(mints: string[]): Promise<CustomToken[]> {
  if (mints.length === 0) return [];
  const query = mints.slice(0, 100).join(",");
  try {
    const results = await jupiterSearch(query);
    const mintSet = new Set(mints.map((m) => m.toLowerCase()));
    return results
      .filter((r) => mintSet.has(r.id.toLowerCase()))
      .map(mintInformationToCustomToken);
  } catch {
    return [];
  }
}

function mintInformationToCustomToken(m: MintInformation): CustomToken {
  return {
    mint: m.id,
    symbol: m.symbol,
    name: m.name,
    decimals: m.decimals,
    logoUri: m.icon ?? null,
    color: fallbackColor(m.id),
  };
}
