import { useWallet } from "../context/WalletContext.jsx";
import MiningPanel from "../components/MiningPanel.jsx";
import TransactionList from "../components/TransactionList.jsx";
import InfoSection from "../components/InfoSection.jsx";
import "../styles/Dashboard.css";

export default function Dashboard() {
  const { isConnected, isConnecting, error, connect } = useWallet();

  if (!isConnected) {
    return (
      <div className="dashboard-connect-page">
        <div className="dashboard-connect">
          <div className="connect-card">
            <div className="connect-icon">💧</div>
            <h1>Acua Company</h1>
            <h2>AutoReinvest Bot · World Chain</h2>
            <p>
              Conecta tu wallet para ver y gestionar tus posiciones de liquidez,
              hacer stake, minar H2O y BTCH2O, y reinvertir recompensas automáticamente.
            </p>

            {error && (
              <div style={{ color: "#f87171", fontSize: 13, marginBottom: 12, padding: "8px 12px", background: "rgba(248,113,113,0.1)", borderRadius: 8, border: "1px solid rgba(248,113,113,0.3)" }}>
                {error}
              </div>
            )}

            <div className="connect-wallet-options">
              <button className="connect-world-app-btn" onClick={connect} disabled={isConnecting}>
                <svg viewBox="0 0 40 40" width="22" height="22">
                  <circle cx="20" cy="20" r="19" fill="#000" stroke="#fff" strokeWidth="2"/>
                  <circle cx="20" cy="20" r="11" fill="none" stroke="#fff" strokeWidth="2.5"/>
                  <circle cx="20" cy="20" r="4" fill="#fff"/>
                </svg>
                {isConnecting ? "Conectando..." : "Conectar con World App"}
              </button>
            </div>

            <div className="connect-features">
              <div className="connect-feature"><span>⛏</span><p>Minería H2O + BTCH2O</p></div>
              <div className="connect-feature"><span>🔒</span><p>Staking con APR/APY</p></div>
              <div className="connect-feature"><span>💎</span><p>9 tokens en staking</p></div>
              <div className="connect-feature"><span>📊</span><p>Monitoreo en tiempo real</p></div>
            </div>
          </div>
        </div>

        <InfoSection />
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-top">
        <div className="dashboard-title">
          <h1>Panel de Control</h1>
          <span className="chain-badge">🌍 World Chain</span>
        </div>
      </div>

      <MiningPanel />

      <TransactionList />

      <InfoSection />
    </div>
  );
}
