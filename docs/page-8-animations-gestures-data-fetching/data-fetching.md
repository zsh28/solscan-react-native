# Data Fetching - Detailed Technical Notes (TanStack Query)

## The core problem TanStack Query solves

Most apps start with `useEffect + fetch + useState`. This works at first, but quickly creates repeated boilerplate and subtle bugs:

- duplicate requests from multiple components
- inconsistent loading/error handling
- stale data after navigation
- manual cache logic scattered across files

TanStack Query treats server data as a first-class cache with lifecycle rules.

## Server state vs client state

Important distinction:

- Client state: local UI state (toggles, modals, form drafts)
- Server state: remote data that can change outside your app

TanStack Query is for server state.

## Core architecture concepts

## Example: provider setup

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

export default function AppRoot() {
  return (
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  );
}
```

Use when:

- you want consistent data policy across all screens
- you need shared caching for repeated navigation paths

## Query client

Global manager for cache, retries, garbage collection, and defaults.

Typical defaults to tune:

- `staleTime` (freshness window)
- `gcTime` (cache retention)
- `retry` (failure resilience)
- refetch behavior on focus/reconnect

## Query key

A stable identifier for cached data.

Good key design should include all inputs that change the response, for example:

- entity id
- active environment/network
- filter/sort params
- pagination cursor/page

Poor keys cause cache collisions and incorrect UI.

## Query function

Pure async function that fetches data for the key.

Best practices:

- throw on API errors
- keep transformation predictable
- avoid side effects

## Core query lifecycle states

- `isLoading`: first load, no cached data yet
- `isFetching`: network request in flight (including background refresh)
- `isError`: request failed
- `data`: successful response payload

Use this model to simplify UI decisions.

## Caching strategy in real products

## Freshness (`staleTime`)

How long data is treated as fresh.

Examples:

- live market quote: 2 to 10 seconds
- wallet balance: 10 to 60 seconds
- profile metadata: minutes to hours

## Garbage collection (`gcTime`)

How long inactive cache remains in memory.

Examples:

- high-navigation apps: 5 to 15 minutes often works well
- memory-constrained contexts: shorter windows

## Deduplication

If two components ask for same key at same time, TanStack Query reuses one request.

Benefit: less network traffic and fewer race conditions.

## Query patterns and use cases

## Example: custom query hook

```tsx
import { useQuery } from "@tanstack/react-query";

async function fetchUserProfile(userId: string) {
  const res = await fetch(`https://api.example.com/users/${userId}`);
  if (!res.ok) throw new Error("Failed to fetch user profile");
  return res.json();
}

export function useUserProfile(userId: string) {
  return useQuery({
    queryKey: ["user-profile", userId],
    queryFn: () => fetchUserProfile(userId),
    enabled: !!userId,
    staleTime: 60_000,
  });
}
```

Use when:

- multiple components need same entity data
- you want fetch logic reusable and testable

## Example: query usage in component

```tsx
function ProfileScreen({ userId }: { userId: string }) {
  const { data, isLoading, isError, error, refetch, isFetching } = useUserProfile(userId);

  if (isLoading) return <ProfileSkeleton />;
  if (isError) return <ErrorState message={(error as Error).message} onRetry={refetch} />;

  return (
    <View>
      <Text>{data.name}</Text>
      {isFetching ? <Text>Refreshing...</Text> : null}
    </View>
  );
}
```

Use when:

- you need clear UI for first load vs background refresh
- retry action should be explicit and user-controlled

## Standard query (`useQuery`)

Use for:

- profile
- account balances
- settings
- summary cards

## Conditional query (`enabled`)

Use when query depends on user input or auth state.

Examples:

- fetch wallet only after address exists
- fetch private data only after token is ready

## Polling/refetch interval

Use for near-real-time data where websocket is not needed.

Examples:

- price ticker
- status monitor

Apply carefully to avoid excessive battery/data usage.

## Infinite query (`useInfiniteQuery`)

Use for cursor-based feeds:

- transactions
- notifications
- social timelines

## Mutations for write operations

## Example: mutation with invalidation

```tsx
import { useMutation, useQueryClient } from "@tanstack/react-query";

async function updateDisplayName(userId: string, name: string) {
  const res = await fetch(`https://api.example.com/users/${userId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error("Failed to update profile");
  return res.json();
}

export function useUpdateDisplayName(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) => updateDisplayName(userId, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-profile", userId] });
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
    },
  });
}
```

Use when:

- write action changes multiple read models
- you want reliable consistency after submit

## Example: infinite query for cursor pagination

```tsx
import { useInfiniteQuery } from "@tanstack/react-query";

async function fetchFeed(cursor?: string) {
  const res = await fetch(`https://api.example.com/feed?cursor=${cursor ?? ""}`);
  if (!res.ok) throw new Error("Failed to fetch feed");
  return res.json() as Promise<{ items: Array<{ id: string; title: string }>; nextCursor?: string }>;
}

export function useFeed() {
  return useInfiniteQuery({
    queryKey: ["feed"],
    queryFn: ({ pageParam }) => fetchFeed(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}
```

Use when:

- datasets are large and loaded progressively
- scroll-based consumption is primary UX

Use `useMutation` for actions that change remote state:

- send transaction
- create/update/delete resources
- submit forms

Important mutation practices:

- optimistic update only when rollback is clear
- invalidate related queries on success
- surface user-friendly error state

## Invalidation strategy

After a successful write, invalidate keys impacted by that write.

Examples:

- sending funds -> invalidate account balance + recent activity
- adding item -> invalidate item list + aggregate counters

Avoid invalidating broad keys unnecessarily.

## Error handling model

Recommended layers:

1. Query function throws typed errors
2. Query handles retries for transient failures
3. UI presents actionable messages
4. Logging/monitoring captures failure context

Differentiate:

- network timeout
- auth/session issue
- validation error
- server/internal error

## UX guidance for loading states

- Show skeletons for first load where possible
- Keep previous data during background refetch when useful
- Avoid full-screen spinners for minor refreshes
- Provide manual retry affordance for hard failures

## Performance best practices

- Keep query keys stable and serializable.
- Avoid creating dynamic object literals inline for keys if they can vary by reference.
- Normalize API payload shape in query layer.
- Keep expensive transformations memoized or server-side.

## Testing strategy

- Unit-test query functions (success/failure transformations).
- Integration-test loading/error/success UI states.
- Test invalidation flow after mutations.
- Test stale/fresh behavior around navigation cycles.

## Common anti-patterns

- Using TanStack Query for purely local UI state
- Unstable query keys that change each render
- Disabling retries globally without reason
- Over-invalidating entire cache after small mutation
- Ignoring `enabled` and firing queries with incomplete params

## Production checklist

1. Query key conventions documented.
2. Default stale/cache values chosen by data type.
3. Retry policy aligned with API reliability.
4. Mutation invalidation map defined.
5. Loading and error UX consistent across screens.
