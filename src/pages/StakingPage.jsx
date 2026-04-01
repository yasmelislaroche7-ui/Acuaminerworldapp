import { useState } from "react";
import { useWallet } from "../context/WalletContext.jsx";
import StakingPanel from "../components/StakingPanel.jsx";
import { ACUA_STAKING_ADDRESS } from "../config/staking.js";
import { USDC_TOKEN_ADDRESS,  USDC_STAKING_ADDRESS  } from "../config/usdc.js";
import { WLD_TOKEN_ADDRESS,   WLD_STAKING_ADDRESS   } from "../config/wld.js";
import { WARS_TOKEN_ADDRESS,  WARS_STAKING_ADDRESS  } from "../config/wars.js";
import { WCOP_TOKEN_ADDRESS,  WCOP_STAKING_ADDRESS  } from "../config/wcop.js";
import { AIR_TOKEN_ADDRESS,   AIR_STAKING_ADDRESS   } from "../config/air.js";
import { BTCH2O_TOKEN_ADDRESS, BTCH2O_STAKING_ADDRESS } from "../config/btch2o.js";
import { FIRE_TOKEN_ADDRESS,   FIRE_STAKING_ADDRESS   } from "../config/fire.js";
import { SUSHI_TOKEN_ADDRESS, SUSHI_STAKING_ADDRESS } from "../config/sushi.js";
import { TIME_TOKEN_ADDRESS,  TIME_STAKING_ADDRESS  } from "../config/time.js";
import "../styles/StakingPage.css";

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      onClick={handleCopy}
      style={{
        background: copied ? "rgba(16,185,129,0.2)" : "rgba(255,255,255,0.08)",
        border: "1px solid rgba(255,255,255,0.12)",
        color: copied ? "#10b981" : "var(--text-secondary)",
        borderRadius: 6,
        padding: "3px 10px",
        fontSize: 12,
        cursor: "pointer",
        whiteSpace: "nowrap",
        transition: "all 0.2s",
      }}
    >
      {copied ? "✅ Copiado" : "📋 Copiar"}
    </button>
  );
}

const TOKEN_ADDRESSES = [
  { name: "H2O (ACUA)",  token: null,                    staking: ACUA_STAKING_ADDRESS    },
  { name: "TIME",        token: TIME_TOKEN_ADDRESS,       staking: TIME_STAKING_ADDRESS    },
  { name: "SUSHI",       token: SUSHI_TOKEN_ADDRESS,      staking: SUSHI_STAKING_ADDRESS   },
  { name: "USDC",        token: USDC_TOKEN_ADDRESS,       staking: USDC_STAKING_ADDRESS    },
  { name: "WLD",         token: WLD_TOKEN_ADDRESS,        staking: WLD_STAKING_ADDRESS     },
  { name: "wARS",        token: WARS_TOKEN_ADDRESS,       staking: WARS_STAKING_ADDRESS    },
  { name: "wCOP",        token: WCOP_TOKEN_ADDRESS,       staking: WCOP_STAKING_ADDRESS    },
  { name: "AIR",         token: AIR_TOKEN_ADDRESS,        staking: AIR_STAKING_ADDRESS     },
  { name: "BTCH2O",      token: BTCH2O_TOKEN_ADDRESS,     staking: BTCH2O_STAKING_ADDRESS  },
  { name: "🔥 FIRE",     token: FIRE_TOKEN_ADDRESS,       staking: FIRE_STAKING_ADDRESS    },
];

function TokenAddressesSection() {
  return (
    <div className="staking-addresses-section">
      <h2>📋 Direcciones de Tokens y Contratos</h2>
      <p style={{ color: "var(--text-secondary)", fontSize: 14, marginBottom: 16 }}>
        Copia las direcciones para importar tokens en tu wallet o verificar contratos en Worldscan.
      </p>
      <div className="addresses-grid">
        {TOKEN_ADDRESSES.map(({ name, token, staking }) => (
          <div key={name} className="address-card">
            <div className="address-card-title">{name}</div>
            {token && (
              <div className="address-row">
                <span className="address-label">Token</span>
                <code className="address-code">{token.slice(0, 10)}...{token.slice(-8)}</code>
                <CopyButton text={token} />
                <a href={`https://worldscan.org/token/${token}`} target="_blank" rel="noreferrer" className="address-link">↗</a>
              </div>
            )}
            <div className="address-row">
              <span className="address-label">Staking</span>
              <code className="address-code">{staking.slice(0, 10)}...{staking.slice(-8)}</code>
              <CopyButton text={staking} />
              <a href={`https://worldscan.org/address/${staking}`} target="_blank" rel="noreferrer" className="address-link">↗</a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function StakingPage() {
  const { isConnected, isConnecting, error, connect } = useWallet();

  if (!isConnected) {
    return (
      <div className="staking-page-connect">
        <div className="connect-card">
          <div className="connect-icon">🔒</div>
          <h1>Acua Company Staking</h1>
          <h2>Gana recompensas por hacer stake</h2>
          <p>Conecta tu wallet para ver tus posiciones de staking, depositar, retirar y reclamar recompensas.</p>
          {error && (
            <div style={{ color: "#f87171", fontSize: 13, margin: "12px 0", padding: "8px 12px", background: "rgba(248,113,113,0.1)", borderRadius: 8, border: "1px solid rgba(248,113,113,0.3)" }}>
              {error}
            </div>
          )}
          <button className="connect-world-app-btn" onClick={connect} disabled={isConnecting}>
            <svg viewBox="0 0 40 40" width="20" height="20">
              <circle cx="20" cy="20" r="19" fill="#000" stroke="#fff" strokeWidth="2"/>
              <circle cx="20" cy="20" r="11" fill="none" stroke="#fff" strokeWidth="2.5"/>
              <circle cx="20" cy="20" r="4" fill="#fff"/>
            </svg>
            {isConnecting ? "Conectando..." : "Conectar con World App"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="staking-page">
      <div className="staking-page-header">
        <div>
          <h1>🔒 Staking Hub</h1>
          <p className="staking-page-sub">Gestiona tus posiciones de staking y recompensas</p>
        </div>
        <span className="chain-badge">🌍 World Chain</span>
      </div>

      <div className="staking-panels-grid">
        <StakingPanel />
      </div>

      <TokenAddressesSection />
    </div>
  );
}
