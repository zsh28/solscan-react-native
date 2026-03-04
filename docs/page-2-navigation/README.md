# Navigation (Expo Router)

Reference: https://docs.expo.dev/router/introduction/

## Why file-based navigation

As apps grow, manual screen switching becomes fragile. File-based routing gives a predictable contract:

- route = file path
- nested navigation = folder layout + `_layout.tsx`
- deep link path = same route path

This improves team velocity and reduces routing bugs.

## Core concepts

- `index.tsx`: default route in a folder
- `_layout.tsx`: navigator wrapper for sibling routes
- `[id].tsx`: dynamic route segment
- `(group)`: organization-only route group (not in URL)

## Example route tree

```text
app/
|- _layout.tsx
|- (tabs)/
|  |- _layout.tsx
|  |- index.tsx
|  `- settings.tsx
`- product/
   `- [id].tsx
```

## Example: stack + tabs layout

```tsx
// app/_layout.tsx
import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="product/[id]" />
    </Stack>
  );
}
```

```tsx
// app/(tabs)/_layout.tsx
import { Tabs } from "expo-router";

export default function TabLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="settings" options={{ title: "Settings" }} />
    </Tabs>
  );
}
```

## Navigation API behavior

- `router.push(path)`: add history entry
- `router.replace(path)`: replace current entry
- `router.back()`: pop one entry

## Example: dynamic route usage

```tsx
import { router, useLocalSearchParams } from "expo-router";

router.push("/product/42");

function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Text>Product: {id}</Text>;
}
```

## Deep linking

With scheme configured in `app.json`, paths can open from outside the app:

- `myapp://settings`
- `myapp://product/42`

Use cases:

- marketing links
- password reset flows
- referral/share links

## Common use-case patterns

- tabs for top-level domains
- stack for drill-down detail screens
- modal routes for focused temporary tasks
- replace for auth/onboarding handoff

## Pitfalls to avoid

- inconsistent route naming conventions
- mixing navigation concerns with business logic
- over-nesting navigators without clear product reason
- using `replace` where users expect `back` history
