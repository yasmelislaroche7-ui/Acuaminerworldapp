import { createContext, useContext, useState, useCallback } from "react";
import { MiniKit } from "@worldcoin/minikit-js";
import { toast } from "./ToastContext.jsx";

const WalletContext = createContext(null);
const SESSION_KEY = "minikit_wallet_address";

function randomNonce() {
  return (Math.random().toString(36).slice(2) + Date.now().toString(36)).padEnd(8, "0").slice(0, 16);
}

export function WalletProvider({ children }) {
  const [address, setAddress] = useState(() => {
    try { return sessionStorage.getItem(SESSION_KEY) || null; } catch { return null; }
  });
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);

  const isConnected = !!address;

  const connect = useCallback(async () => {
    const isMiniKit = (() => { try { return MiniKit.isInstalled(); } catch { return false; } })();
    if (!isMiniKit) {
      const msg = "Abre esta app dentro de World App para conectar tu wallet.";
      setError(msg);
      toast(msg, "warning", 5000);
      return;
    }

    setIsConnecting(true);
    setError(null);
    toast("Conectando con World App...", "info", 8000);

    try {
      const response = await MiniKit.walletAuth({
        nonce: randomNonce(),
        statement: "Conecta tu wallet a Acua Company en World Chain",
        expirationTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      const addr = response?.result?.address;

      if (addr) {
        setAddress(addr);
        setError(null);
        try { sessionStorage.setItem(SESSION_KEY, addr); } catch {}
        toast(`Wallet conectada: ${addr.slice(0, 6)}…${addr.slice(-4)}`, "success", 4000);
      } else {
        const msg = "Conexión cancelada. Intenta de nuevo.";
        setError(msg);
        toast(msg, "warning", 4000);
      }
    } catch (err) {
      console.error("walletAuth error:", err);
      const msg = err?.message?.includes("User rejected")
        ? "Conexión cancelada por el usuario."
        : "Error al conectar. Intenta de nuevo.";
      setError(msg);
      toast(msg, "error", 5000);
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
    setError(null);
    try { sessionStorage.removeItem(SESSION_KEY); } catch {}
    toast("Wallet desconectada.", "info", 3000);
  }, []);

  return (
    <WalletContext.Provider value={{ address, isConnected, isConnecting, error, connect, disconnect }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}
