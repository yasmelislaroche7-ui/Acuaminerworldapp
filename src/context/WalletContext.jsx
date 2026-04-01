import { createContext, useContext, useState, useCallback } from "react";
import { MiniKit } from "@worldcoin/minikit-js";

const WalletContext = createContext(null);
const SESSION_KEY = "minikit_wallet_address";

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
      setError("Abre esta app dentro de World App para conectar tu wallet.");
      return;
    }
    setIsConnecting(true);
    setError(null);
    try {
      const nonce = Math.random().toString(36).slice(2) + Date.now().toString(36);
      const { finalPayload } = await MiniKit.commandsAsync.walletAuth({
        nonce,
        statement: "Conecta tu wallet a Acua Company en World Chain",
        expirationTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });
      if (finalPayload?.status === "success" && finalPayload?.address) {
        const addr = finalPayload.address;
        setAddress(addr);
        try { sessionStorage.setItem(SESSION_KEY, addr); } catch {}
      } else {
        setError("Conexión cancelada. Intenta de nuevo.");
      }
    } catch (err) {
      console.error("walletAuth error:", err);
      setError("Error al conectar. Intenta de nuevo.");
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
    try { sessionStorage.removeItem(SESSION_KEY); } catch {}
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
