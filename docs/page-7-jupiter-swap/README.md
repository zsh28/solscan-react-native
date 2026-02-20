# Page 7 — Jupiter Swap

## What we built

A live token swap screen backed by the Jupiter Aggregator v6 API. Users pick input/output tokens, type an amount, and see a real-time quote update with debouncing. If a wallet is connected via MWA, tapping **Swap** builds the transaction on Jupiter's server, decodes it, and sends it to Phantom for signing.

---

## Files changed

| File | What changed |
|---|---|
| `services/jupiter.ts` | New — token registry, unit helpers, `getSwapQuote`, `getSwapTransaction` |
| `app/(tabs)/swap.tsx` | Full rewrite — live Jupiter quotes, token picker modal, MWA signing |
| `context/WalletContext.tsx` | Added `signAndSendVersioned(base64Tx)` |
| `app/(tabs)/watchlist.tsx` | Moved from `app/watchlist.tsx` — now a real tab |
| `app/(tabs)/_layout.tsx` | Added Watchlist tab (heart icon) |
| `app/_layout.tsx` | Removed `<Stack.Screen name="watchlist" />` |
| `app/(tabs)/settings.tsx` | Removed "View Watchlist" row + unused imports |

---

## Token registry (`services/jupiter.ts`)

```ts
export const TOKENS = {
  SOL:  "So11111111111111111111111111111111111111112",
  USDC: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  USDT: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
  BONK: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
  JUP:  "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
  WIF:  "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm",
};
```

Each token has a `TokenInfo` entry with `decimals`, `color`, and human `label`.

### Unit helpers

```ts
toSmallestUnit("1.5", 9)   // → 1_500_000_000  (SOL lamports)
fromSmallestUnit(1500000, 6) // → "1.5"          (USDC)
```

---

## Jupiter API flow

### 1. Get a quote

```
GET https://quote-api.jup.ag/v6/quote
  ?inputMint=So11...112
  &outputMint=EPjF...1v
  &amount=1000000000   ← lamports
  &slippageBps=50      ← 0.5%
```

Response includes `outAmount` (smallest unit), `priceImpactPct`, and `routePlan`.

```ts
const quote = await getSwapQuote({
  inputMint:  TOKENS.SOL,
  outputMint: TOKENS.USDC,
  amount:     1_000_000_000,  // 1 SOL in lamports
});
// quote.outAmount → e.g. "142301234" micro-USDC
```

### 2. Build the transaction

```
POST https://quote-api.jup.ag/v6/swap
Body: {
  quoteResponse: <quote object>,
  userPublicKey: "<base58>",
  wrapAndUnwrapSol: true,
  dynamicComputeUnitLimit: true,
  prioritizationFeeLamports: "auto"
}
```

Response: `{ swapTransaction: "<base64 versioned tx>" }`

No API key required.

### 3. Sign and send via MWA

```ts
// In WalletContext.tsx — signAndSendVersioned()
const txBytes  = Buffer.from(base64Tx, "base64");
const versionedTx = VersionedTransaction.deserialize(txBytes);

await transact(async (wallet) => {
  await wallet.authorize({ cluster: "mainnet-beta", identity: { ... } });
  const [sig] = await wallet.signAndSendTransactions({
    transactions: [versionedTx],
  });
});
```

`VersionedTransaction` is from `@solana/web3.js` v1. MWA's `signAndSendTransactions` accepts both legacy `Transaction` and `VersionedTransaction` objects.

---

## Debounced quoting

The swap screen debounces quote fetches by 600 ms to avoid hammering the API on every keystroke:

```ts
useEffect(() => {
  if (debounceRef.current) clearTimeout(debounceRef.current);
  debounceRef.current = setTimeout(() => {
    fetchQuote(fromAmount, fromToken, toToken);
  }, 600);
  return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
}, [fromAmount, fromToken, toToken, fetchQuote]);
```

---

## Price impact colour coding

| Impact | Colour |
|---|---|
| < 1% | White |
| 1–5% | Amber `#F59E0B` |
| > 5% | Red `#EF4444` |

---

## Watchlist as a tab

Previously the watchlist was a stack screen pushed from Settings. It is now a proper bottom tab:

```tsx
// app/(tabs)/_layout.tsx
<Tabs.Screen
  name="watchlist"
  options={{
    title: "Watchlist",
    tabBarIcon: ({ color, size }) => (
      <Ionicons name="heart-outline" size={size} color={color} />
    ),
  }}
/>
```

The back button and `router.push("/watchlist")` call in Settings were removed.

---

## Key points

- No API key is needed for Jupiter v6.
- Always convert amounts to smallest unit before the API call; convert back to display.
- Jupiter returns versioned (v0) transactions — use `VersionedTransaction.deserialize`, not `Transaction.from`.
- MWA `signAndSendTransactions` works with both legacy and versioned transactions when using `@solana-mobile/mobile-wallet-adapter-protocol-web3js`.
- Swap only works on **real Android device with Phantom installed** (MWA requirement).
