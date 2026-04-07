import { connectorsForWallets, getDefaultConfig } from "@rainbow-me/rainbowkit";
import { defineChain, http } from "viem";
import { createConfig } from "wagmi";
import {
  metaMaskWallet,
  injectedWallet,
  walletConnectWallet,
} from "@rainbow-me/rainbowkit/wallets";

export const confluxESpaceTestnet = defineChain({
  id: 71,
  name: "Conflux eSpace Testnet",
  nativeCurrency: {
    name: "CFX",
    symbol: "CFX",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://evmtestnet.confluxrpc.com"],
    },
  },
  blockExplorers: {
    default: {
      name: "ConfluxScan",
      url: "https://evmtestnet.confluxscan.org",
    },
  },
  testnet: true,
});

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "YOUR_PROJECT_ID";

const connectors = connectorsForWallets(
  [
    {
      groupName: "Recommended",
      wallets: [
        injectedWallet,
        metaMaskWallet,
        walletConnectWallet,
      ],
    },
  ],
  {
    appName: "ConfluxMind",
    projectId,
  }
);

export const wagmiConfig = createConfig({
  connectors,
  chains: [confluxESpaceTestnet],
  transports: {
    [confluxESpaceTestnet.id]: http("https://evmtestnet.confluxrpc.com"),
  },
  ssr: true,
});
