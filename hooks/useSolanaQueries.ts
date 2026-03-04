import { useQuery } from "@tanstack/react-query";

const rpc = async (endpoint: string, method: string, params: unknown[]) => {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message);
  return json.result;
};

export interface TokenAccount {
  mint: string;
  amount: number;
}

export interface RecentTxn {
  sig: string;
  time: number | null;
  ok: boolean;
}

export function useWalletBalance(address: string, endpoint: string) {
  return useQuery({
    queryKey: ["wallet-balance", endpoint, address],
    queryFn: async () => {
      const result = await rpc(endpoint, "getBalance", [address]);
      return result.value / 1_000_000_000;
    },
    enabled: address.length > 0,
  });
}

export function useTokenAccounts(address: string, endpoint: string) {
  return useQuery({
    queryKey: ["token-accounts", endpoint, address],
    queryFn: async (): Promise<TokenAccount[]> => {
      const result = await rpc(endpoint, "getTokenAccountsByOwner", [
        address,
        { programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" },
        { encoding: "jsonParsed" },
      ]);
      return (result.value || [])
        .map((a: any) => ({
          mint: a.account.data.parsed.info.mint,
          amount: a.account.data.parsed.info.tokenAmount.uiAmount,
        }))
        .filter((t: TokenAccount) => t.amount > 0);
    },
    enabled: address.length > 0,
    staleTime: 60 * 1000,
  });
}

export function useRecentTransactions(address: string, endpoint: string) {
  return useQuery({
    queryKey: ["recent-transactions", endpoint, address],
    queryFn: async (): Promise<RecentTxn[]> => {
      const sigs = await rpc(endpoint, "getSignaturesForAddress", [address, { limit: 10 }]);
      return sigs.map((s: any) => ({
        sig: s.signature,
        time: s.blockTime,
        ok: !s.err,
      }));
    },
    enabled: address.length > 0,
    staleTime: 15 * 1000,
  });
}
