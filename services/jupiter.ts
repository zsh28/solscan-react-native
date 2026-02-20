// services/jupiter.ts
// Jupiter Aggregator v6 API helpers.
// Docs: https://station.jup.ag/docs/apis/swap-api

// ─── Token registry ───────────────────────────────────────────────────────────

export const TOKENS = {
  SOL:  "So11111111111111111111111111111111111111112",
  USDC: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  USDT: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
  BONK: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
  JUP:  "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
  WIF:  "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm",
} as const;

export type TokenSymbol = keyof typeof TOKENS;

/** Unified token descriptor — works for both preset and custom tokens. */
export interface TokenInfo {
  /** Display symbol, e.g. "SOL", "USDC", or custom token's symbol. */
  symbol: string;
  /** Solana mint address (base58). */
  mint: string;
  decimals: number;
  /** Brand color used as a placeholder / tint while the logo loads. */
  color: string;
  /** Human-readable name, e.g. "Solana", "USD Coin". */
  label: string;
  /** Remote logo URI — null means show a colored placeholder circle. */
  logoUri: string | null;
}

const TOKEN_LIST_CDN = "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet";

export const TOKEN_INFO: Record<TokenSymbol, TokenInfo> = {
  SOL: {
    symbol: "SOL", mint: TOKENS.SOL, decimals: 9, color: "#9945FF", label: "Solana",
    logoUri: `${TOKEN_LIST_CDN}/So11111111111111111111111111111111111111112/logo.png`,
  },
  USDC: {
    symbol: "USDC", mint: TOKENS.USDC, decimals: 6, color: "#2775CA", label: "USD Coin",
    logoUri: `${TOKEN_LIST_CDN}/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png`,
  },
  USDT: {
    symbol: "USDT", mint: TOKENS.USDT, decimals: 6, color: "#26A17B", label: "Tether",
    logoUri: `${TOKEN_LIST_CDN}/Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB/logo.svg`,
  },
  BONK: {
    symbol: "BONK", mint: TOKENS.BONK, decimals: 5, color: "#F7931A", label: "Bonk",
    logoUri: "https://assets.coingecko.com/coins/images/28600/large/bonk.jpg",
  },
  JUP: {
    symbol: "JUP", mint: TOKENS.JUP, decimals: 6, color: "#14F195", label: "Jupiter",
    logoUri: "https://static.jup.ag/jup/icon.png",
  },
  WIF: {
    symbol: "WIF", mint: TOKENS.WIF, decimals: 6, color: "#E0B354", label: "dogwifhat",
    logoUri: "https://assets.coingecko.com/coins/images/33566/large/dogwifhat.jpg",
  },
};

export const TOKEN_LIST: TokenSymbol[] = ["SOL", "USDC", "USDT", "BONK", "JUP", "WIF"];

// Build a mint → TokenInfo reverse-lookup for the preset tokens.
const PRESET_BY_MINT: Record<string, TokenInfo> = {};
for (const info of Object.values(TOKEN_INFO)) {
  PRESET_BY_MINT[info.mint] = info;
}

/**
 * Return a TokenInfo for any mint address.
 *
 * - Preset tokens (SOL, USDC, …) are returned immediately from TOKEN_INFO.
 * - Custom tokens previously looked up and stored in the Zustand store are
 *   passed in via `customTokens`; the caller is responsible for providing them.
 * - Returns null when the mint is not found in either source (caller should
 *   trigger a lookup via `lookupToken` from services/tokenLookup.ts).
 */
export function resolveTokenInfo(
  mint: string,
  customTokens: Array<{ mint: string; symbol: string; name: string; decimals: number; logoUri: string | null; color: string }>
): TokenInfo | null {
  if (PRESET_BY_MINT[mint]) return PRESET_BY_MINT[mint];
  const custom = customTokens.find((t) => t.mint === mint);
  if (!custom) return null;
  return {
    symbol: custom.symbol,
    mint: custom.mint,
    decimals: custom.decimals,
    color: custom.color,
    label: custom.name,
    logoUri: custom.logoUri,
  };
}

// ─── Unit helpers ─────────────────────────────────────────────────────────────

/** Convert a human-readable amount string to the token's smallest unit (integer). */
export function toSmallestUnit(amount: string, decimals: number): number {
  const n = parseFloat(amount);
  if (isNaN(n) || n <= 0) return 0;
  return Math.round(n * Math.pow(10, decimals));
}

/** Convert from smallest unit back to a human-readable string. */
export function fromSmallestUnit(amount: number | string, decimals: number): string {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  return (n / Math.pow(10, decimals)).toString();
}

// ─── Jupiter API ──────────────────────────────────────────────────────────────

const BASE_URL = "https://quote-api.jup.ag/v6";

export interface SwapQuote {
  inputMint: string;
  inAmount: string;
  outputMint: string;
  outAmount: string;
  priceImpactPct: string;
  routePlan: unknown[];
  slippageBps: number;
  otherAmountThreshold: string;
  swapMode: string;
}

export interface SwapQuoteParams {
  inputMint: string;
  outputMint: string;
  /** Amount in smallest unit (lamports, micro-USDC, etc.) */
  amount: number;
  /** Slippage in basis points. Default 50 = 0.5%. */
  slippageBps?: number;
}

/**
 * Fetch a swap quote from Jupiter.
 * Returns null on network errors so the caller can surface the error gracefully.
 */
export async function getSwapQuote(params: SwapQuoteParams): Promise<SwapQuote | null> {
  const { inputMint, outputMint, amount, slippageBps = 50 } = params;
  if (amount <= 0) return null;

  const url = new URL(`${BASE_URL}/quote`);
  url.searchParams.set("inputMint", inputMint);
  url.searchParams.set("outputMint", outputMint);
  url.searchParams.set("amount", String(amount));
  url.searchParams.set("slippageBps", String(slippageBps));

  try {
    const res = await fetch(url.toString());
    if (!res.ok) {
      console.error("[Jupiter] quote error", res.status, await res.text());
      return null;
    }
    return (await res.json()) as SwapQuote;
  } catch (e) {
    console.error("[Jupiter] quote fetch failed", e);
    return null;
  }
}

export interface SwapTransactionParams {
  quote: SwapQuote;
  /** User's wallet public key (base58). */
  userPublicKey: string;
  /** Wrap/unwrap SOL automatically. Defaults to true. */
  wrapAndUnwrapSol?: boolean;
}

export interface SwapTransactionResult {
  /** Base64-encoded versioned transaction ready to sign. */
  swapTransaction: string;
}

/**
 * Get the serialized swap transaction from Jupiter.
 * Must be decoded with VersionedTransaction.deserialize and signed via MWA.
 */
export async function getSwapTransaction(
  params: SwapTransactionParams
): Promise<SwapTransactionResult | null> {
  const { quote, userPublicKey, wrapAndUnwrapSol = true } = params;

  try {
    const res = await fetch(`${BASE_URL}/swap`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        quoteResponse: quote,
        userPublicKey,
        wrapAndUnwrapSol,
        dynamicComputeUnitLimit: true,
        prioritizationFeeLamports: "auto",
      }),
    });
    if (!res.ok) {
      console.error("[Jupiter] swap error", res.status, await res.text());
      return null;
    }
    return (await res.json()) as SwapTransactionResult;
  } catch (e) {
    console.error("[Jupiter] swap fetch failed", e);
    return null;
  }
}
