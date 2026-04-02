import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { MiniKit } from '@worldcoin/minikit-js';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { injected } from 'wagmi/connectors';

const WalletContext = createContext(null);

function isMK() {
  try { return MiniKit.isInstalled(); } catch { return false; }
}

export function WalletProvider({ children }) {
  const mkInstalled = isMK();

  const { address: wagmiAddress, isConnected: wagmiConnected } = useAccount();
  const { connect: wagmiConnect, isPending: wagmiConnecting } = useConnect();
  const { disconnect: wagmiDisconnect } = useDisconnect();

  const [mkAddress, setMkAddress]     = useState(() => {
    if (isMK()) return MiniKit.user?.walletAddress ?? null;
    return null;
  });
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError]               = useState(null);

  useEffect(() => {
    if (mkInstalled) {
      const addr = MiniKit.user?.walletAddress;
      if (addr) setMkAddress(addr);
    }
  }, [mkInstalled]);

  const address    = mkInstalled ? mkAddress      : (wagmiConnected ? wagmiAddress : null);
  const isConnected = mkInstalled ? !!mkAddress   : wagmiConnected;

  const connect = useCallback(async () => {
    setError(null);
    if (mkInstalled) {
      setIsConnecting(true);
      try {
        const { finalPayload } = await MiniKit.commandsAsync.walletAuth({
          nonce:          Math.random().toString(36).slice(2, 18),
          statement:      'Conectar wallet con Acua Company',
          expirationTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        });
        if (finalPayload?.status === 'success') {
          setMkAddress(finalPayload.address);
        } else {
          const msg = finalPayload?.error_code === 'user_rejected'
            ? 'Conexión cancelada por el usuario.'
            : finalPayload?.details || 'Error al conectar con World App.';
          setError(typeof msg === 'string' ? msg : 'Error al conectar con World App.');
        }
      } catch (e) {
        setError(e?.message || 'Error inesperado al conectar.');
      } finally {
        setIsConnecting(false);
      }
    } else {
      try {
        wagmiConnect({ connector: injected() });
      } catch (e) {
        setError(e?.message || 'Error al conectar wallet.');
      }
    }
  }, [mkInstalled, wagmiConnect]);

  const disconnect = useCallback(() => {
    setError(null);
    if (mkInstalled) {
      setMkAddress(null);
    } else {
      wagmiDisconnect();
    }
  }, [mkInstalled, wagmiDisconnect]);

  return (
    <WalletContext.Provider value={{
      address,
      isConnected,
      isConnecting: isConnecting || wagmiConnecting,
      error,
      connect,
      disconnect,
    }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) return {
    address: null,
    isConnected: false,
    isConnecting: false,
    error: null,
    connect: () => {},
    disconnect: () => {},
  };
  return ctx;
}
