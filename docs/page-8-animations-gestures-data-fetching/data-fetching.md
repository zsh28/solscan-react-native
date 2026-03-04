# Data Fetching - Technical Notes (TanStack Query)

## Why TanStack Query in this app

The wallet screen originally used imperative fetching logic (`useState` + direct RPC calls + manual loading/error handling). That pattern works for simple flows, but scales poorly for repeated fetches, cache reuse, and stale data updates.

TanStack Query provides:

- request deduplication
- normalized query lifecycle state
- stale/fresh caching windows
- easy manual refetch for user-triggered refresh

This is especially useful for wallet lookups where users may revisit addresses frequently.

## Setup implemented

### Dependency

Installed:

```bash
npx expo install @tanstack/react-query
```

### App provider and defaults

Configured in `app/_layout.tsx`:

```tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      gcTime: 5 * 60 * 1000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});
```

Provider placement:

```tsx
<QueryClientProvider client={queryClient}>
  {/* app tree */}
</QueryClientProvider>
```

Rationale for these defaults:

- `staleTime: 30s`: balance/transactions are fresh enough for exploration UI.
- `gcTime: 5m`: recent wallets remain cached when navigating between tabs.
- `retry: 2`: transient RPC errors get automatic retry without infinite loops.
- `refetchOnWindowFocus: false`: prevents noisy mobile refetch behavior on app focus transitions.

## Hook design in `hooks/useSolanaQueries.ts`

This file centralizes read-only Solana RPC queries and keeps screen components declarative.

## Shared RPC helper

All hooks use:

```ts
rpc(endpoint, method, params)
```

Behavior:

- Sends JSON-RPC payload
- Throws on `json.error`
- Returns `json.result`

This gives consistent error semantics across hooks.

## Query hooks

### `useWalletBalance(address, endpoint)`

- Key: `['wallet-balance', endpoint, address]`
- Method: `getBalance`
- Converts lamports -> SOL
- Enabled only when address exists

### `useTokenAccounts(address, endpoint)`

- Key: `['token-accounts', endpoint, address]`
- Method: `getTokenAccountsByOwner`
- Filters to positive balances
- Per-hook `staleTime: 60s` because token set changes less frequently than tx feed

### `useRecentTransactions(address, endpoint)`

- Key: `['recent-transactions', endpoint, address]`
- Method: `getSignaturesForAddress` (limit 10)
- Normalizes output to `{ sig, time, ok }`
- Per-hook `staleTime: 15s` for faster freshness

## Query key strategy

Including both `endpoint` and `address` in keys prevents cache collisions:

- same wallet on devnet vs mainnet should not share cache
- different wallets on same network should not share cache

This is critical because the app supports network toggling.

## Screen migration in `app/(tabs)/index.tsx`

The screen now has two states:

1. `address` (input field draft)
2. `searchedAddress` (active query target)

Flow:

1. User types address
2. Presses Search
3. `searchedAddress` updates
4. Query hooks run automatically (`enabled` condition passes)
5. UI renders from query state (`isLoading`, `data`, `error`)

If user searches the same address again, code explicitly calls:

```ts
await Promise.all([
  balanceQuery.refetch(),
  tokensQuery.refetch(),
  txnsQuery.refetch(),
]);
```

This preserves expected manual refresh behavior.

## Feature-level benefits realized

- Less screen-local boilerplate for fetch lifecycle
- Better resilience against duplicate requests
- Network-aware cache segmentation
- Cleaner rendering logic based on query-derived state

## Current scope and future extension

Current implementation focuses on read operations (queries). For write operations (send/swap mutations), next step would be `useMutation` plus targeted cache invalidation.

Examples of follow-up invalidation patterns:

- invalidate `['wallet-balance', endpoint, address]` after successful send
- invalidate `['recent-transactions', endpoint, address]` after transaction submission

## Troubleshooting

If data appears stale/unexpected:

1. Verify query key includes both address and endpoint.
2. Check `enabled` conditions for empty address edge cases.
3. Adjust per-hook `staleTime` if refresh cadence should be faster.
4. Use explicit `refetch()` for user-initiated hard refresh actions.
