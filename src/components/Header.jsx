import { useBalance } from "wagmi";
import { Link, useLocation } from "react-router-dom";
import { useWallet } from "../context/WalletContext.jsx";
import { useIsOwner } from "../hooks/useContract.js";
import { formatEther } from "viem";
import "../styles/Header.css";

function EthBalance({ address }) {
  const { data } = useBalance({
    address,
    query: { refetchInterval: 8000, enabled: !!address },
  });
  if (!data) return null;
  const val = parseFloat(formatEther(data.value)).toFixed(4);
  return (
    <div className="eth-balance-badge">
      <span className="eth-dot">●</span>
      <span>{val} {data.symbol}</span>
    </div>
  );
}

export default function Header() {
  const { address, isConnected, isConnecting, error, connect, disconnect } = useWallet();
  const isOwner = useIsOwner();
  const location = useLocation();

  const shortAddr = address
    ? `${address.slice(0, 6)}…${address.slice(-4)}`
    : null;

  return (
    <header className="header">
      <div className="header-left">
        <div className="logo">
          <span className="logo-icon">💧</span>
          <span className="logo-text">Acua Company</span>
          <span className="logo-sub">AutoReinvest</span>
        </div>
        <nav className="nav">
          <Link className={`nav-link ${location.pathname === "/" ? "active" : ""}`} to="/">
            Dashboard
          </Link>
          <Link className={`nav-link ${location.pathname === "/staking" ? "active" : ""}`} to="/staking">
            Staking
          </Link>
          <Link className={`nav-link ${location.pathname === "/mining" ? "active" : ""}`} to="/mining">
            ⛏ Minería UTH₂
          </Link>
          {isConnected && isOwner && (
            <Link className={`nav-link ${location.pathname === "/owner" ? "active" : ""}`} to="/owner">
              Owner
            </Link>
          )}
        </nav>
      </div>

      <div className="header-right">
        {error && <span className="header-error" style={{ color: "#f87171", fontSize: 12, maxWidth: 180 }}>{error}</span>}

        {isConnected && <EthBalance address={address} />}

        {isConnected ? (
          <div className="world-connected-group">
            <div className="world-connected-badge">
              <svg viewBox="0 0 24 24" width="14" height="14">
                <circle cx="12" cy="12" r="11" fill="#fff" />
                <circle cx="12" cy="12" r="7" fill="none" stroke="#000" strokeWidth="2" />
                <circle cx="12" cy="12" r="2.5" fill="#000" />
              </svg>
              <span>{shortAddr}</span>
            </div>
            <button className="btn-disconnect" onClick={disconnect}>
              Salir
            </button>
          </div>
        ) : (
          <button
            className="btn-world-app"
            onClick={connect}
            disabled={isConnecting}
            title="Conectar con World App"
          >
            <svg viewBox="0 0 40 40" width="16" height="16">
              <circle cx="20" cy="20" r="19" fill="#000" stroke="#fff" strokeWidth="2" />
              <circle cx="20" cy="20" r="11" fill="none" stroke="#fff" strokeWidth="2.5" />
              <circle cx="20" cy="20" r="4" fill="#fff" />
            </svg>
            {isConnecting ? "Conectando..." : "World App"}
          </button>
        )}
      </div>
    </header>
  );
}
