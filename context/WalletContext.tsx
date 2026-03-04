// context/WalletContext.tsx
// Single source of truth for MWA wallet state.
// Wrap the app in <WalletProvider> once; consume with useWallet() anywhere.

import {
  createContext,
  useCallback,
  useContext,
  useRef,
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

function parseWalletAccountAddress(rawAddress: string): PublicKey {
  // Some wallets return base58, others return base64 bytes.
  try {
    return new PublicKey(rawAddress);
  } catch {
    const base64Bytes = Buffer.from(rawAddress, "base64");
    if (base64Bytes.length === 32) {
      return new PublicKey(base64Bytes);
    }
    return new PublicKey(toUint8Array(rawAddress));
  }
}

const WALLET_IDENTITY = {
  name: "SolScan",
  uri: "https://solscan.io",
  icon: "favicon.ico",
} as const;

const WALLET_CHAIN = "solana:mainnet" as const;

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out`)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

// ============================================
// Types
// ============================================

interface WalletState {
  connected: boolean;
  publicKey: PublicKey | null;
  address: string | null;
  authToken: string | null;
  connecting: boolean;
  error: string | null;
}

interface WalletContextValue extends WalletState {
  connect: () => Promise<string | null>;
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
  const authTokenRef = useRef<string | null>(null);

  const [state, setState] = useState<WalletState>({
    connected: false,
    publicKey: null,
    address: null,
    authToken: null,
    connecting: false,
    error: null,
  });

  const connect = useCallback(async () => {
    console.log("[WalletContext] connect() called");
    setState((s) => ({ ...s, connecting: true, error: null }));
    let connectedAddress: string | null = null;
    try {
      await transact(async (wallet) => {
        console.log("[WalletContext] transact() session opened");
        const result = await wallet.authorize({
          cluster: "mainnet-beta",
          identity: WALLET_IDENTITY,
        });
        console.log("[WalletContext] authorize() result:", JSON.stringify(result));
        const { accounts } = result;
        console.log("[WalletContext] accounts:", accounts.length, accounts[0]?.address);
        const pubkey = parseWalletAccountAddress(accounts[0].address);
        console.log("[WalletContext] pubkey:", pubkey.toBase58());
        setState({
          connected: true,
          publicKey: pubkey,
          address: pubkey.toBase58(),
          authToken: result.auth_token,
          connecting: false,
          error: null,
        });
        authTokenRef.current = result.auth_token;
        console.log("[WalletContext] state set to connected");
        connectedAddress = pubkey.toBase58();
      });
      console.log("[WalletContext] transact() resolved");
      return connectedAddress;
    } catch (e: any) {
      console.log("[WalletContext] connect() error:", e?.message, e?.code, JSON.stringify(e));
      if (connectedAddress) {
        const recoveredPubkey = new PublicKey(connectedAddress);
        setState((s) => ({
          ...s,
          connected: true,
          publicKey: recoveredPubkey,
          address: recoveredPubkey.toBase58(),
          connecting: false,
          error: null,
        }));
        console.log("[WalletContext] connect() recovered with existing address");
        return connectedAddress;
      }
      setState((s) => ({
        ...s,
        connecting: false,
        error: e.message ?? "Connection failed",
      }));
      return null;
    }
  }, []);

  const disconnect = useCallback(() => {
      setState({
        connected: false,
        publicKey: null,
        address: null,
        authToken: null,
        connecting: false,
        error: null,
      });
      authTokenRef.current = null;
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
      try {
        await transact(async (wallet) => {
          const sessionToken = authTokenRef.current ?? state.authToken;
          if (sessionToken) {
            try {
              console.log("[WalletContext] sendSol authorizing with auth token");
              const authResult = await wallet.authorize({
                auth_token: sessionToken,
                identity: WALLET_IDENTITY,
                chain: WALLET_CHAIN,
              });
              authTokenRef.current = authResult.auth_token;
              setState((s) => ({ ...s, authToken: authResult.auth_token }));
            } catch {
              console.log("[WalletContext] sendSol token auth failed, authorizing legacy");
              const authResult = await wallet.authorize({
                cluster: "mainnet-beta",
                identity: WALLET_IDENTITY,
              });
              authTokenRef.current = authResult.auth_token;
              setState((s) => ({ ...s, authToken: authResult.auth_token }));
            }
          } else {
            console.log("[WalletContext] sendSol no token, authorizing");
            const authResult = await wallet.authorize({
              cluster: "mainnet-beta",
              identity: WALLET_IDENTITY,
            });
            authTokenRef.current = authResult.auth_token;
            setState((s) => ({ ...s, authToken: authResult.auth_token }));
          }

          console.log("[WalletContext] sendSol requesting signature");
          let signedTx: Transaction;
          try {
            [signedTx] = await withTimeout(
              wallet.signTransactions({ transactions: [tx] }),
              30000,
              "Wallet signature"
            );
            console.log("[WalletContext] sendSol signature received");
          } catch (signErr) {
            console.log("[WalletContext] sendSol signTransactions failed", signErr);
            const [sentSig] = await withTimeout(
              wallet.signAndSendTransactions({ transactions: [tx] }),
              30000,
              "Wallet sign+send"
            );
            sig = sentSig;
            console.log("[WalletContext] sendSol signAndSend signature", sig);
            return;
          }

          try {
            sig = await connection.sendRawTransaction(signedTx.serialize(), {
              skipPreflight: false,
              maxRetries: 3,
            });
            console.log("[WalletContext] sendSol rpc submit", sig);
            await connection.confirmTransaction(sig, "confirmed");
            console.log("[WalletContext] sendSol confirmed", sig);
          } catch (rpcErr) {
            console.log("[WalletContext] sendSol rpc submit failed", rpcErr);
            throw rpcErr;
          }
        });
      } catch (e: any) {
        if (sig) return sig;
        throw e;
      }

      return sig;
    },
    [state.publicKey, state.authToken]
  );

  const signAndSendVersioned = useCallback(
    async (base64Tx: string): Promise<string> => {
      // Decode the base64 transaction Jupiter returned.
      const txBytes = Buffer.from(base64Tx, "base64");
      const versionedTx = VersionedTransaction.deserialize(txBytes);
      const connection = new Connection(clusterApiUrl("mainnet-beta"), "confirmed");

      let sig = "";
      try {
        await transact(async (wallet) => {
          const sessionToken = authTokenRef.current ?? state.authToken;
          if (sessionToken) {
            try {
              console.log("[WalletContext] swap authorizing with auth token");
              const authResult = await wallet.authorize({
                auth_token: sessionToken,
                identity: WALLET_IDENTITY,
                chain: WALLET_CHAIN,
              });
              authTokenRef.current = authResult.auth_token;
              setState((s) => ({ ...s, authToken: authResult.auth_token }));
            } catch {
              console.log("[WalletContext] swap token auth failed, authorizing legacy");
              const authResult = await wallet.authorize({
                cluster: "mainnet-beta",
                identity: WALLET_IDENTITY,
              });
              authTokenRef.current = authResult.auth_token;
              setState((s) => ({ ...s, authToken: authResult.auth_token }));
            }
          } else {
            console.log("[WalletContext] swap no token, authorizing");
            const authResult = await wallet.authorize({
              cluster: "mainnet-beta",
              identity: WALLET_IDENTITY,
            });
            authTokenRef.current = authResult.auth_token;
            setState((s) => ({ ...s, authToken: authResult.auth_token }));
          }
          console.log("[WalletContext] swap sending transaction");
          console.log("[WalletContext] swap requesting signature");
          const [signedTx] = await withTimeout(
            wallet.signTransactions({ transactions: [versionedTx] }),
            30000,
            "Wallet signature"
          );
          console.log("[WalletContext] swap signature received");
          sig = await connection.sendRawTransaction(signedTx.serialize(), {
            skipPreflight: false,
            maxRetries: 3,
          });
          console.log("[WalletContext] swap rpc submit", sig);
          await connection.confirmTransaction(sig, "confirmed");
          console.log("[WalletContext] swap confirmed", sig);
        });
      } catch (e: any) {
        if (sig) return sig;
        throw e;
      }

      return sig;
    },
    [state.authToken]
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
