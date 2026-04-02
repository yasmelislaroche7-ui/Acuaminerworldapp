import { createContext, useContext, useState, useCallback } from "react";
import { MiniKit } from "@worldcoin/minikit-js";
import { toast } from "./ToastContext.jsx";

const WalletContext = createContext(null);
const SESSION_KEY = "minikit_wallet_address";

const WORLD_CHAIN_ID = 480;

function randomNonce() {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length: 16 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export function WalletProvider({ children }) {
  const [address, setAddress] = useState(() => {
    try { return sessionStorage.getItem(SESSION_KEY) || null; } catch { return null; }
  });
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);

  const isConnected = !!address;

  const connect = useCallback(async () => {
    const isMiniKit = (() => {
      try { return MiniKit.isInstalled(); } catch { return false; }
    })();

    if (!isMiniKit) {
      const msg = "Abre esta app dentro de World App para conectar tu wallet.";
      setError(msg);
      toast(msg, "warning", 6000);
      return;
    }

    setIsConnecting(true);
    setError(null);
    toast("Conectando con World App...", "info", 10000);

    try {
      const response = await MiniKit.walletAuth({
        nonce: randomNonce(),
        statement: "Conecta tu wallet a Acua Company en World Chain",
        expirationTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      // v2 API: response = { data: { address, message, signature }, executedWith }
      const addr = response?.data?.address;

      if (addr) {
        setAddress(addr);
        setError(null);
        try { sessionStorage.setItem(SESSION_KEY, addr); } catch {}
        toast(`Conectado: ${addr.slice(0, 6)}…${addr.slice(-4)}`, "success", 4000);
      } else {
        const msg = "Conexión cancelada. Intenta de nuevo.";
        setError(msg);
        toast(msg, "warning", 4000);
      }
    } catch (err) {
      console.error("walletAuth error:", err);
      const isCancel = err?.message?.toLowerCase().includes("user") ||
                       err?.error_code === "user_rejected";
      const msg = isCancel
        ? "Conexión cancelada por el usuario."
        : "Error al conectar. Asegúrate de tener World App actualizado.";
      setError(msg);
      toast(msg, isCancel ? "warning" : "error", 5000);
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
