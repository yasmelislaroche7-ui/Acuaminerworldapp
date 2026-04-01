import { useState } from "react";
import { useAccount, useConnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { MiniKit } from "@worldcoin/minikit-js";
import MiningPanel from "../components/MiningPanel.jsx";
import TransactionList from "../components/TransactionList.jsx";
import WorldAppModal from "../components/WorldAppModal.jsx";
import InfoSection from "../components/InfoSection.jsx";
import "../styles/Dashboard.css";
import "../styles/WorldAppModal.css";

export default function Dashboard() {
  const { isConnected } = useAccount();
  const { connect } = useConnect();
  const [showWorldModal, setShowWorldModal] = useState(false);

  const isInMiniKit = (() => { try { return MiniKit.isInstalled(); } catch { return false; } })();

  const handleWorldAppConnect = async () => {
    if (isInMiniKit) {
      try {
        const nonce = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
        const { finalPayload } = await MiniKit.commandsAsync.walletAuth({
          nonce,
          statement: "Conecta tu wallet a Acua Company en World Chain",
          expirationTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        });
        if (finalPayload?.status === "success") {
          connect({ connector: injected() });
        }
      } catch (err) {
        console.error("walletAuth error:", err);
      }
    } else {
      setShowWorldModal(true);
    }
  };

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

            <div className="connect-wallet-options">
              <button className="connect-world-app-btn" onClick={handleWorldAppConnect}>
                <svg viewBox="0 0 40 40" width="22" height="22">
                  <circle cx="20" cy="20" r="19" fill="#000" stroke="#fff" strokeWidth="2"/>
                  <circle cx="20" cy="20" r="11" fill="none" stroke="#fff" strokeWidth="2.5"/>
                  <circle cx="20" cy="20" r="4" fill="#fff"/>
                </svg>
                Conectar con World App
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

        {showWorldModal && <WorldAppModal onClose={() => setShowWorldModal(false)} />}
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
