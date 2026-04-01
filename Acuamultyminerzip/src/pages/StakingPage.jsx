import { useState } from "react";
import { useAccount } from "wagmi";
import StakingPanel from "../components/StakingPanel.jsx";
import WorldConnectBtn from "../components/WorldConnectBtn.jsx";
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

function PositionsSection() {
  const { data: positions } = useContractRead("getManagedPositions", [], true);
  const [copied, setCopied] = useState(null);

  const handleCopy = (id) => {
    navigator.clipboard.writeText(id.toString()).then(() => {
      setCopied(id.toString());
      setTimeout(() => setCopied(null), 2000);
    });
  };

  if (!positions || positions.length === 0) {
    return (
      <div className="staking-positions-section">
        <h2>📍 Mis Posiciones Activas en el Pool</h2>
        <div className="positions-empty">
          <span>📭</span>
          <p>No hay posiciones gestionadas por el bot actualmente.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="staking-positions-section">
      <h2>📍 Mis Posiciones Activas en el Pool</h2>
      <p style={{ color: "var(--text-secondary)", fontSize: 14, marginBottom: 16 }}>
        Posiciones Uniswap V3 actualmente gestionadas. Copia el ID del NFT para importarlo o verificarlo.
      </p>
      <div className="positions-grid-user">
        {positions.map(id => {
          const idStr = id.toString();
          const isCopied = copied === idStr;
          return (
            <div key={idStr} className="position-card-user">
              <div className="position-nft-badge">NFT</div>
              <div className="position-id">#{idStr}</div>
              <div className="position-actions">
                <button
                  className={`btn-sm ${isCopied ? "btn-success" : "btn-secondary"}`}
                  onClick={() => handleCopy(id)}
                >
                  {isCopied ? "✅ Copiado" : "📋 Copiar ID"}
                </button>
                <a
                  href={`https://app.uniswap.org/positions/${idStr}`}
                  target="_blank" rel="noreferrer"
                  className="btn-sm btn-secondary"
                >
                  Uniswap ↗
                </a>
                <a
                  href={`https://worldscan.org/token/0xec12a9F9a09f50550686363766Cc153D03c27b5e?a=${idStr}`}
                  target="_blank" rel="noreferrer"
                  className="btn-sm btn-secondary"
                >
                  Worldscan ↗
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function StakingPage() {
  const { isConnected } = useAccount();

  if (!isConnected) {
    return (
      <div className="staking-page-connect">
        <div className="connect-card">
          <div className="connect-icon">🔒</div>
          <h1>Acua Company Staking</h1>
          <h2>Gana recompensas por hacer stake</h2>
          <p>Conecta tu wallet para ver tus posiciones de staking, depositar, retirar y reclamar recompensas.</p>
          <WorldConnectBtn />
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
