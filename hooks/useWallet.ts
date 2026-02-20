// hooks/useWallet.ts
// Wraps Mobile Wallet Adapter so the rest of the app never imports MWA directly.
// Works on: real Android device with a wallet app (Phantom, Solflare, etc.)
//           Android emulator with the Solana fakewallet APK installed.
// Does NOT work on: iOS (MWA is Android-only), Expo Go (requires native build).

import { useState, useCallback } from "react";
import { transact } from "@solana-mobile/mobile-wallet-adapter-protocol-web3js";
import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
  clusterApiUrl,
} from "@solana/web3.js";

// ============================================
// Types
// ============================================

export interface WalletState {
  connected: boolean;
  publicKey: PublicKey | null;
  /** Human-readable address (base58) */
  address: string | null;
  connecting: boolean;
  error: string | null;
}

// ============================================
// Hook
// ============================================

export function useWallet() {
  const [state, setState] = useState<WalletState>({
    connected: false,
    publicKey: null,
    address: null,
    connecting: false,
    error: null,
  });

  // ── Connect ───────────────────────────────────────────────────────────────

  const connect = useCallback(async () => {
    setState((s) => ({ ...s, connecting: true, error: null }));
    try {
      await transact(async (wallet) => {
        // MWA: authorize prompts the user to approve the connection.
        const { accounts } = await wallet.authorize({
          cluster: "mainnet-beta",
          identity: {
            name: "SolScan",
            uri: "https://solscan.io",
            icon: "favicon.ico",
          },
        });

        // accounts[0] is the primary account the user selected.
        const pubkey = new PublicKey(accounts[0].address);
        setState({
          connected: true,
          publicKey: pubkey,
          address: pubkey.toBase58(),
          connecting: false,
          error: null,
        });
      });
    } catch (e: any) {
      setState((s) => ({
        ...s,
        connecting: false,
        error: e.message ?? "Connection failed",
      }));
    }
  }, []);

  // ── Disconnect ────────────────────────────────────────────────────────────

  const disconnect = useCallback(() => {
    setState({
      connected: false,
      publicKey: null,
      address: null,
      connecting: false,
      error: null,
    });
  }, []);

  // ── Send SOL ──────────────────────────────────────────────────────────────

  /**
   * Sends `amountSol` SOL from the connected wallet to `toAddress`.
   * Returns the transaction signature on success.
   */
  const sendSol = useCallback(
    async (toAddress: string, amountSol: number): Promise<string> => {
      if (!state.publicKey) throw new Error("Wallet not connected");

      const connection = new Connection(clusterApiUrl("mainnet-beta"), "confirmed");
      const toPubkey = new PublicKey(toAddress);

      // Build the transaction offline — MWA only signs, it doesn't submit.
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

      // MWA: sign_and_send_transactions — wallet signs and submits via its RPC.
      let sig = "";
      await transact(async (wallet) => {
        // Re-authorize on each transaction session (MWA requirement).
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

  return { ...state, connect, disconnect, sendSol };
}
