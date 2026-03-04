type SolanaNetwork = "devnet" | "mainnet-beta";

function parseNetwork(value: string | undefined): SolanaNetwork {
  return value === "mainnet-beta" ? "mainnet-beta" : "devnet";
}

const config = {
  solana: {
    devnetRpcUrl:
      process.env.EXPO_PUBLIC_SOLANA_DEVNET_RPC_URL ??
      "https://api.devnet.solana.com",
    mainnetRpcUrl:
      process.env.EXPO_PUBLIC_SOLANA_MAINNET_RPC_URL ??
      "https://api.mainnet-beta.solana.com",
    network: parseNetwork(process.env.EXPO_PUBLIC_SOLANA_NETWORK),
  },
  jupiter: {
    apiUrl:
      process.env.EXPO_PUBLIC_JUPITER_API_URL ??
      "https://lite-api.jup.ag/swap/v1",
    tokenSearchUrl:
      process.env.EXPO_PUBLIC_JUPITER_TOKEN_SEARCH_URL ??
      "https://lite-api.jup.ag/ultra/v1/search",
  },
  app: {
    enableNotifications:
      process.env.EXPO_PUBLIC_ENABLE_NOTIFICATIONS !== "false",
  },
} as const;

export function getRpcEndpoint(isDevnet: boolean): string {
  return isDevnet ? config.solana.devnetRpcUrl : config.solana.mainnetRpcUrl;
}

export default config;
