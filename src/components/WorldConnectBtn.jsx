import { useState } from "react";
import { useConnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { MiniKit } from "@worldcoin/minikit-js";
import WorldAppModal from "./WorldAppModal.jsx";
import "../styles/WorldAppModal.css";

export default function WorldConnectBtn({ label = "Conectar con World App" }) {
  const { connect } = useConnect();
  const [showModal, setShowModal] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const isInMiniKit = (() => { try { return MiniKit.isInstalled(); } catch { return false; } })();

  const handleClick = async () => {
    if (connecting) return;
    if (isInMiniKit) {
      setConnecting(true);
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
      } finally {
        setConnecting(false);
      }
    } else {
      setShowModal(true);
    }
  };

  return (
    <>
      <button className="connect-world-app-btn" onClick={handleClick} disabled={connecting}>
        <svg viewBox="0 0 40 40" width="20" height="20">
          <circle cx="20" cy="20" r="19" fill="#000" stroke="#fff" strokeWidth="2" />
          <circle cx="20" cy="20" r="11" fill="none" stroke="#fff" strokeWidth="2.5" />
          <circle cx="20" cy="20" r="4" fill="#fff" />
        </svg>
        {connecting ? "Conectando..." : label}
      </button>
      {showModal && <WorldAppModal onClose={() => setShowModal(false)} />}
    </>
  );
}
