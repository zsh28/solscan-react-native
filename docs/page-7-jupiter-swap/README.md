# Token Swap Integration Notes (Aggregator-Based)

## What this topic covers

This page explains a general token swap integration pattern using quote + swap transaction APIs (such as Jupiter-like aggregators).

Focus areas:

- quote flow
- unit conversions
- route quality and slippage
- transaction construction and signing

## High-level swap architecture

A robust swap UI usually follows this sequence:

1. user picks input/output tokens
2. user enters amount
3. app requests quote
4. app shows output estimate + price impact + route info
5. app requests executable swap transaction
6. wallet signs and sends
7. app confirms and reports result

## Why aggregators are useful

Aggregators search multiple liquidity sources to find better execution.

Benefits:

- best route discovery
- less manual DEX integration complexity
- route-level metadata (hops, impact, fees)

## Example: quote request pattern

```ts
type QuoteParams = {
  inputMint: string;
  outputMint: string;
  amount: string; // smallest unit (integer string)
  slippageBps: number;
};

async function fetchQuote(params: QuoteParams) {
  const qs = new URLSearchParams({
    inputMint: params.inputMint,
    outputMint: params.outputMint,
    amount: params.amount,
    slippageBps: String(params.slippageBps),
  });

  const res = await fetch(`https://example-aggregator/quote?${qs.toString()}`);
  if (!res.ok) throw new Error("Quote failed");
  return res.json();
}
```

## Unit conversion is mandatory

Most swap APIs expect smallest units, not display decimals.

Example:

- token with 6 decimals
- user inputs `1.25`
- API amount must be `1250000`

## Example conversion helpers

```ts
function toSmallestUnit(amount: string, decimals: number): string {
  const [whole = "0", frac = ""] = amount.split(".");
  const fracPadded = (frac + "0".repeat(decimals)).slice(0, decimals);
  return `${whole}${fracPadded}`.replace(/^0+(?=\d)/, "");
}

function fromSmallestUnit(raw: string, decimals: number): string {
  const s = raw.padStart(decimals + 1, "0");
  const whole = s.slice(0, -decimals);
  const frac = s.slice(-decimals).replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : whole;
}
```

## Debouncing quote requests

Without debounce, every keystroke triggers network calls.

Recommended:

- debounce 300ms to 700ms
- cancel previous pending timer/request on new input

## Example debounce usage

```ts
useEffect(() => {
  if (!amount) return;
  const t = setTimeout(() => {
    requestQuote(amount, inputMint, outputMint);
  }, 500);
  return () => clearTimeout(t);
}, [amount, inputMint, outputMint]);
```

## Swap transaction request

After quote selection, request an executable transaction payload from aggregator backend.

Typical payload includes:

- chosen quote response
- user public key
- optional SOL wrap/unwrap flag
- optional priority fee / compute settings

## UX use cases

- quick swap from wallet page
- advanced mode with token search
- route details modal for power users

## Risk controls and safety

- enforce slippage limits per trade type
- display price impact clearly with color coding
- block swap when quote is stale
- confirm token symbols and mint addresses before submit

## Common failure cases

- no route found
- insufficient token balance
- quote expired before signing
- wallet rejected signature
- RPC congestion/timeout

## Practical UI states

- idle: no amount entered
- quoting: loading indicator in output panel
- quoted: output + route shown
- submitting: swap button disabled/spinner
- success/failure: explicit final state with explorer link

## Production checklist

1. Amount conversion tested for all supported decimals.
2. Debounce and stale-quote handling implemented.
3. Error messages map to actionable user guidance.
4. Price impact and slippage are visible before approval.
