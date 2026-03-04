# Wallet Connection and Sending Transactions

## What this topic covers

This page explains the general architecture for wallet connection flows in mobile dApps:

- connect/disconnect UX
- session state
- transaction signing and sending
- error handling and user safety

## Connection lifecycle

A robust wallet flow usually has these states:

1. disconnected
2. connecting
3. connected
4. error/recovering

Design goal: every state should be visible and actionable in UI.

## Recommended hook shape

```tsx
type WalletState = {
  connected: boolean;
  address: string | null;
  connecting: boolean;
  error: string | null;
};

type WalletApi = WalletState & {
  connect: () => Promise<string | null>;
  disconnect: () => void;
  sendTransaction: (params: { to: string; amount: number }) => Promise<string>;
};
```

Why this pattern:

- keeps screen components simple
- centralizes wallet SDK complexity
- improves testability

## Example: connect button states

```tsx
function ConnectButton({ connected, connecting, address, onConnect, onDisconnect }: {
  connected: boolean;
  connecting: boolean;
  address: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
}) {
  if (connecting) return <Text>Connecting...</Text>;
  if (connected && address) return <Pressable onPress={onDisconnect}><Text>{address.slice(0, 4)}... Disconnect</Text></Pressable>;
  return <Pressable onPress={onConnect}><Text>Connect Wallet</Text></Pressable>;
}
```

## Sending transaction flow

Typical sequence:

1. validate input (recipient/amount)
2. build unsigned transaction
3. request user signature in wallet
4. broadcast
5. confirm and show result

## Example: action wrapper

```tsx
async function handleSend() {
  try {
    setSubmitting(true);
    const signature = await wallet.sendTransaction({ to: recipient, amount: 0.1 });
    Alert.alert("Sent", `Signature: ${signature}`);
  } catch (e: any) {
    Alert.alert("Transaction failed", e?.message ?? "Unknown error");
  } finally {
    setSubmitting(false);
  }
}
```

## Core use cases

- connect wallet to view account data
- approve token transfers/swaps
- sign messages for login/auth proof
- reconnect seamlessly on next app launch

## Security and UX guidance

- never auto-sign anything
- always show clear transaction summary before approval
- warn users about network/cluster mismatches
- display shortened signature with link to explorer

## Failure handling

Handle and distinguish:

- user rejected transaction
- wallet app unavailable
- insufficient balance
- network timeout
- invalid address

## Platform considerations

Mobile wallet adapters and deep link flows vary by platform. Always test:

- real physical device
- foreground/background transitions
- return path to your app after signature

## Production checklist

1. Connection state survives screen navigation.
2. Send action is disabled while pending.
3. Errors are user-readable and recoverable.
4. Success state includes verifiable signature details.
