import React from "react";
import ReactDOM from "react-dom/client";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { wagmiConfig } from "./config/wagmi.js";
import { ToastProvider } from "./context/ToastContext.jsx";
import { WalletProvider } from "./context/WalletContext.jsx";
import { TxConfirmProvider } from "./context/TxConfirmContext.jsx";
import App from "./App.jsx";
import "./styles/index.css";
import "./styles/TxConfirmPopup.css";
import { MiniKit } from "@worldcoin/minikit-js";

MiniKit.install("app_d3ea733327ecd8ed8368a0c408815c13");

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <WalletProvider>
            <TxConfirmProvider>
              <App />
            </TxConfirmProvider>
          </WalletProvider>
        </ToastProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>
);
