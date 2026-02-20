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

export interface TokenInfo {
  symbol: TokenSymbol;
  mint: string;
  decimals: number;
  color: string;
  label: string;
}

export const TOKEN_INFO: Record<TokenSymbol, TokenInfo> = {
  SOL:  { symbol: "SOL",  mint: TOKENS.SOL,  decimals: 9, color: "#9945FF", label: "Solana"   },
  USDC: { symbol: "USDC", mint: TOKENS.USDC, decimals: 6, color: "#2775CA", label: "USD Coin"  },
  USDT: { symbol: "USDT", mint: TOKENS.USDT, decimals: 6, color: "#26A17B", label: "Tether"    },
  BONK: { symbol: "BONK", mint: TOKENS.BONK, decimals: 5, color: "#F7931A", label: "Bonk"      },
  JUP:  { symbol: "JUP",  mint: TOKENS.JUP,  decimals: 6, color: "#14F195", label: "Jupiter"   },
  WIF:  { symbol: "WIF",  mint: TOKENS.WIF,  decimals: 6, color: "#E0B354", label: "dogwifhat" },
};

export const TOKEN_LIST: TokenSymbol[] = ["SOL", "USDC", "USDT", "BONK", "JUP", "WIF"];

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
