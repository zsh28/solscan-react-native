// context/WalletContext.tsx
// Single source of truth for MWA wallet state.
// Wrap the app in <WalletProvider> once; consume with useWallet() anywhere.

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { transact } from "@solana-mobile/mobile-wallet-adapter-protocol-web3js";
import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  VersionedTransaction,
  LAMPORTS_PER_SOL,
  clusterApiUrl,
} from "@solana/web3.js";
import { Buffer } from "buffer";
import { toUint8Array } from "js-base64";

// ============================================
// Types
// ============================================

interface WalletState {
  connected: boolean;
  publicKey: PublicKey | null;
  address: string | null;
  connecting: boolean;
  error: string | null;
}

interface WalletContextValue extends WalletState {
  connect: () => Promise<void>;
  disconnect: () => void;
  sendSol: (toAddress: string, amountSol: number) => Promise<string>;
  /** Sign and send a base64-encoded versioned transaction via MWA. Returns the signature. */
  signAndSendVersioned: (base64Tx: string) => Promise<string>;
}

// ============================================
// Context
// ============================================

const WalletContext = createContext<WalletContextValue | null>(null);

// ============================================
// Provider
// ============================================

export function WalletProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WalletState>({
    connected: false,
    publicKey: null,
    address: null,
    connecting: false,
    error: null,
  });

  const connect = useCallback(async () => {
    console.log("[WalletContext] connect() called");
    setState((s) => ({ ...s, connecting: true, error: null }));
    try {
      await transact(async (wallet) => {
        console.log("[WalletContext] transact() session opened");
        const result = await wallet.authorize({
          cluster: "mainnet-beta",
          identity: {
            name: "SolScan",
            uri: "https://solscan.io",
            icon: "favicon.ico",
          },
        });
        console.log("[WalletContext] authorize() result:", JSON.stringify(result));
        const { accounts } = result;
        console.log("[WalletContext] accounts:", accounts.length, accounts[0]?.address);
        // MWA returns the public key as a base64 string, not base58.
        // Decode to Uint8Array before passing to PublicKey.
        const pubkeyBytes = toUint8Array(accounts[0].address);
        const pubkey = new PublicKey(pubkeyBytes);
        console.log("[WalletContext] pubkey:", pubkey.toBase58());
        setState({
          connected: true,
          publicKey: pubkey,
          address: pubkey.toBase58(),
          connecting: false,
          error: null,
        });
        console.log("[WalletContext] state set to connected");
      });
      console.log("[WalletContext] transact() resolved");
    } catch (e: any) {
      console.log("[WalletContext] connect() error:", e?.message, e?.code, JSON.stringify(e));
      setState((s) => ({
        ...s,
        connecting: false,
        error: e.message ?? "Connection failed",
      }));
    }
  }, []);

  const disconnect = useCallback(() => {
    setState({
      connected: false,
      publicKey: null,
      address: null,
      connecting: false,
      error: null,
    });
  }, []);

  const sendSol = useCallback(
    async (toAddress: string, amountSol: number): Promise<string> => {
      if (!state.publicKey) throw new Error("Wallet not connected");

      const connection = new Connection(clusterApiUrl("mainnet-beta"), "confirmed");
      const toPubkey = new PublicKey(toAddress);

      const { blockhash } = await connection.getLatestBlockhash();
      const tx = new Transaction({
        recentBlockhash: blockhash,
        feePayer: state.publicKey,
      }).add(
        SystemProgram.transfer({
          fromPubkey: state.publicKey,
          toPubkey,
          lamports: Math.round(amountSol * LAMPORTS_PER_SOL),
        })
      );

      let sig = "";
      await transact(async (wallet) => {
        await wallet.authorize({
          cluster: "mainnet-beta",
          identity: {
            name: "SolScan",
            uri: "https://solscan.io",
            icon: "favicon.ico",
          },
        });
        const [signedTx] = await wallet.signAndSendTransactions({
          transactions: [tx],
        });
        sig = signedTx;
      });

      return sig;
    },
    [state.publicKey]
  );

  const signAndSendVersioned = useCallback(
    async (base64Tx: string): Promise<string> => {
      if (!state.publicKey) throw new Error("Wallet not connected");

      // Decode the base64 transaction Jupiter returned.
      const txBytes = Buffer.from(base64Tx, "base64");
      const versionedTx = VersionedTransaction.deserialize(txBytes);

      let sig = "";
      await transact(async (wallet) => {
        await wallet.authorize({
          cluster: "mainnet-beta",
          identity: {
            name: "SolScan",
            uri: "https://solscan.io",
            icon: "favicon.ico",
          },
        });
        // signAndSendTransactions from mobile-wallet-adapter-protocol-web3js
        // accepts VersionedTransaction instances directly.
        const [signature] = await wallet.signAndSendTransactions({
          transactions: [versionedTx],
        });
        sig = signature;
      });

      return sig;
    },
    [state.publicKey]
  );

  return (
    <WalletContext.Provider value={{ ...state, connect, disconnect, sendSol, signAndSendVersioned }}>
      {children}
    </WalletContext.Provider>
  );
}

// ============================================
// Consumer hook
// ============================================

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used inside <WalletProvider>");
  return ctx;
}
