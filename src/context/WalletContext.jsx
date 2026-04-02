import { createContext, useContext, useState, useCallback } from "react";
import { MiniKit } from "@worldcoin/minikit-js";
import { useConnect, useDisconnect, useAccount } from "wagmi";
import { injected } from "wagmi/connectors";
import { toast } from "./ToastContext.jsx";

const WalletContext = createContext(null);
const SESSION_KEY = "minikit_wallet_address";

function randomNonce() {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length: 16 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export function WalletProvider({ children }) {
  const [minikitAddress, setMinikitAddress] = useState(() => {
    try { return sessionStorage.getItem(SESSION_KEY) || null; } catch { return null; }
  });
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);

  const { address: wagmiAddress, isConnected: wagmiConnected } = useAccount();
  const { connectAsync } = useConnect();
  const { disconnectAsync } = useDisconnect();

  const address = minikitAddress || wagmiAddress || null;
  const isConnected = !!address;

  const connect = useCallback(async () => {
    const isMiniKit = (() => {
      try { return MiniKit.isInstalled(); } catch { return false; }
    })();

    if (isMiniKit) {
      setIsConnecting(true);
      setError(null);
      toast("Conectando con World App...", "info", 10000);
      try {
        const response = await MiniKit.walletAuth({
          nonce: randomNonce(),
          statement: "Conecta tu wallet a Acua Company en World Chain",
          expirationTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        });
        const addr = response?.data?.address;
        if (addr) {
          setMinikitAddress(addr);
          setError(null);
          try { sessionStorage.setItem(SESSION_KEY, addr); } catch {}
          toast(`Conectado: ${addr.slice(0, 6)}…${addr.slice(-4)}`, "success", 4000);
        } else {
          const msg = "Conexión cancelada. Intenta de nuevo.";
          setError(msg);
          toast(msg, "warning", 4000);
        }
      } catch (err) {
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
    } else {
      setIsConnecting(true);
      setError(null);
      toast("Conectando wallet...", "info", 5000);
      try {
        await connectAsync({ connector: injected() });
        toast("Wallet conectada correctamente.", "success", 3000);
        setError(null);
      } catch (err) {
        const isCancel = err?.message?.toLowerCase().includes("user rejected") ||
                         err?.message?.toLowerCase().includes("user denied");
        const msg = isCancel
          ? "Conexión cancelada por el usuario."
          : err?.message || "Error al conectar la wallet.";
        setError(msg);
        toast(msg, isCancel ? "warning" : "error", 5000);
      } finally {
        setIsConnecting(false);
      }
    }
  }, [connectAsync]);

  const disconnect = useCallback(async () => {
    setMinikitAddress(null);
    setError(null);
    try { sessionStorage.removeItem(SESSION_KEY); } catch {}
    if (wagmiConnected) {
      try { await disconnectAsync(); } catch {}
    }
    toast("Wallet desconectada.", "info", 3000);
  }, [wagmiConnected, disconnectAsync]);

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
