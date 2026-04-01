import { createConfig, http } from "wagmi";
import { defineChain } from "viem";
import { injected } from "wagmi/connectors";

export const worldchain = defineChain({
  id: 480,
  name: "World Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://worldchain-mainnet.g.alchemy.com/v2/bVo646pb8L7_W_nahCoqW"] },
  },
  blockExplorers: {
    default: { name: "Worldscan", url: "https://worldscan.org" },
  },
});

export const wagmiConfig = createConfig({
  chains: [worldchain],
  transports: {
    [worldchain.id]: http("https://worldchain-mainnet.g.alchemy.com/v2/bVo646pb8L7_W_nahCoqW", {
      batch: true,
      retryCount: 3,
    }),
  },
  connectors: [injected({ shimDisconnect: true })],
  pollingInterval: 4000,
  syncConnectedChain: true,
});
