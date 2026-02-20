# Page 6 — Wallet Connection & Sending SOL

## What we built

- Polyfill layer so `@solana/web3.js` works in Hermes (React Native's JS engine)
- `useWallet` hook wrapping **Mobile Wallet Adapter (MWA)** — connect, disconnect, send SOL
- `ConnectButton` component — three visual states: disconnected, connecting, connected
- `app/send.tsx` — Send SOL screen
- Fixed a structural bug: moved `components/`, `lib/`, `stores/` out of `app/` to the project root

---

## The structural bug

Expo Router treats **every file inside `app/`** as a route. Having non-screen files there caused:

```
WARN Route "./components/FavoriteButton.tsx" is missing the required default export
```

**Fix:** move all shared code to the project root.

```
Before                   After
─────────────────────    ──────────────────────────
app/
  components/            components/        ← root
    FavoriteButton.tsx     FavoriteButton.tsx
  lib/                   lib/               ← root
    storage.ts             storage.ts
  stores/                stores/            ← root
    wallet-store.ts        wallet-store.ts
```

Import paths update accordingly:

| File | Old | New |
|------|-----|-----|
| `app/(tabs)/index.tsx` | `../stores/wallet-store` | `../../stores/wallet-store` |
| `app/(tabs)/settings.tsx` | `../stores/wallet-store` | `../../stores/wallet-store` |
| `app/watchlist.tsx` | `./stores/wallet-store` | `../stores/wallet-store` |

---

## Polyfills

`@solana/web3.js` uses `Buffer` and `crypto.getRandomValues`, which Hermes doesn't ship.

**`polyfills.ts`** (root):

```ts
import { Buffer } from "buffer";
import * as ExpoCrypto from "expo-crypto";

if (typeof global.Buffer === "undefined") {
  global.Buffer = Buffer;
}

if (typeof (global.crypto as any).getRandomValues === "undefined") {
  (global.crypto as any).getRandomValues = (array: Uint8Array) => {
    array.set(ExpoCrypto.getRandomBytes(array.length));
    return array;
  };
}
```

Import it **first** in `app/_layout.tsx`:

```ts
import "../polyfills"; // must be before any Solana import
```

---

## Mobile Wallet Adapter

MWA is an Android-only protocol. A wallet app (Phantom, Solflare) runs a local server; your app connects via `transact()`.

**Platform support:**

| Environment | Works? |
|-------------|--------|
| Android device + Phantom | Yes |
| Android emulator + [fakewallet APK](https://github.com/solana-mobile/mobile-wallet-adapter/releases) | Yes |
| Expo Go | No (requires native build) |
| iOS | No (MWA is Android-only) |

Install dependencies:

```bash
npx expo install @solana/web3.js \
  @solana-mobile/mobile-wallet-adapter-protocol \
  @solana-mobile/mobile-wallet-adapter-protocol-web3js \
  bs58 buffer expo-crypto
```

---

## `useWallet` hook

Lives at `hooks/useWallet.ts`. Encapsulates all MWA calls so screens never import `transact` directly.

```ts
export function useWallet() {
  const [state, setState] = useState<WalletState>({ ... });

  const connect = useCallback(async () => {
    await transact(async (wallet) => {
      const { accounts } = await wallet.authorize({
        cluster: "mainnet-beta",
        identity: { name: "SolScan", uri: "https://solscan.io", icon: "favicon.ico" },
      });
      const pubkey = new PublicKey(accounts[0].address);
      setState({ connected: true, publicKey: pubkey, address: pubkey.toBase58(), ... });
    });
  }, []);

  const sendSol = useCallback(async (toAddress: string, amountSol: number) => {
    const connection = new Connection(clusterApiUrl("mainnet-beta"), "confirmed");
    const { blockhash } = await connection.getLatestBlockhash();
    const tx = new Transaction({ recentBlockhash: blockhash, feePayer: state.publicKey })
      .add(SystemProgram.transfer({
        fromPubkey: state.publicKey!,
        toPubkey: new PublicKey(toAddress),
        lamports: Math.round(amountSol * LAMPORTS_PER_SOL),
      }));

    let sig = "";
    await transact(async (wallet) => {
      await wallet.authorize({ ... }); // re-authorize per session
      const [signedTx] = await wallet.signAndSendTransactions({ transactions: [tx] });
      sig = signedTx;
    });
    return sig;
  }, [state.publicKey]);

  return { ...state, connect, disconnect, sendSol };
}
```

Key points:
- `authorize` must be called once per `transact` session — even inside `sendSol`
- `signAndSendTransactions` returns an array of signatures (one per tx)
- The wallet broadcasts the transaction; you don't need to call `connection.sendRawTransaction`

---

## `ConnectButton` component

Pure presentational — receives wallet state as props, emits callbacks.

```ts
export function ConnectButton({ connected, connecting, address, onConnect, onDisconnect }: Props) {
  if (connecting) return <Pill><Spinner /> Connecting…</Pill>;
  if (connected)  return <Pill onPress={onDisconnect}>{short(address)} ✕</Pill>;
  return <Button onPress={onConnect}>Connect Wallet</Button>;
}
```

Used in `app/(tabs)/index.tsx`:

```tsx
const wallet = useWallet();

<View style={s.walletRow}>
  <ConnectButton
    connected={wallet.connected}
    connecting={wallet.connecting}
    address={wallet.address}
    onConnect={wallet.connect}
    onDisconnect={wallet.disconnect}
  />
  {wallet.connected && (
    <TouchableOpacity onPress={() => router.push("/send")}>
      <Text>Send</Text>
    </TouchableOpacity>
  )}
</View>
```

---

## Send SOL screen

`app/send.tsx` — registered in `app/_layout.tsx` as `<Stack.Screen name="send" />`.

Flow:
1. Screen checks `wallet.connected`; shows a warning if not
2. User fills recipient address + amount
3. Confirm alert before signing
4. Calls `wallet.sendSol(toAddress, sol)` — opens Phantom for signing
5. Shows success alert with signature, then navigates back

```tsx
const { connected, address, sendSol } = useWallet();

const handleSend = async () => {
  const sig = await sendSol(toAddress, parseFloat(amount));
  Alert.alert("Sent!", sig.slice(0, 16) + "...");
};
```

---

## File map after this session

```
solscan-react-native/
├── polyfills.ts                       ← NEW: Buffer + crypto polyfills
├── hooks/
│   └── useWallet.ts                   ← NEW: MWA connect / sendSol
├── components/
│   ├── FavoriteButton.tsx             ← MOVED from app/components/
│   └── ConnectButton.tsx              ← NEW
├── stores/
│   └── wallet-store.ts                ← MOVED from app/stores/
├── lib/
│   └── storage.ts                     ← MOVED from app/lib/
└── app/
    ├── _layout.tsx                    ← UPDATED: polyfill import, send screen
    ├── send.tsx                       ← NEW
    └── (tabs)/
        └── index.tsx                  ← UPDATED: ConnectButton + Send button
```
