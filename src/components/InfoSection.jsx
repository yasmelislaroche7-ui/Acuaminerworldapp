import { useState } from "react";
import "../styles/InfoSection.css";

const TOKENS = [
  {
    symbol: "H2O",
    icon: "💧",
    color: "#00d4ff",
    desc: "Token de recompensa principal. Se obtiene minando o haciendo staking. Representa agua digital del ecosistema Acua Company.",
  },
  {
    symbol: "BTCH2O",
    icon: "₿",
    color: "#f59e0b",
    desc: "Bitcoin del agua. Minado junto al H2O, escaso por diseño. Úsalo para hacer staking y ganar más recompensas.",
  },
  {
    symbol: "FIRE",
    icon: "🔥",
    color: "#ef4444",
    desc: "Token de alta energía. Stakea FIRE para ganar recompensas adicionales en el ecosistema. Acceso a pools exclusivos.",
  },
  {
    symbol: "WLD",
    icon: "🌍",
    color: "#4ade80",
    desc: "Token nativo de Worldcoin. Se usa para comprar paquetes de minería y hacer staking dentro de la plataforma.",
  },
  {
    symbol: "USDC",
    icon: "💵",
    color: "#22c55e",
    desc: "Stablecoin. Haz staking de USDC para generar rendimiento estable sin exposición a volatilidad.",
  },
  {
    symbol: "AIR",
    icon: "💨",
    color: "#a78bfa",
    desc: "Token del aire. Complementa al ecosistema H2O. Staking de AIR genera recompensas pasivas continuas.",
  },
  {
    symbol: "wARS",
    icon: "⚔️",
    color: "#f97316",
    desc: "Wars token. Participa en el pool de staking wARS para obtener rendimientos dentro del ecosistema World Chain.",
  },
  {
    symbol: "wCOP",
    icon: "🪙",
    color: "#eab308",
    desc: "Colombian Peso en World Chain. Staking de wCOP genera recompensas en el ecosistema latinoamericano DeFi.",
  },
];

const STEPS = [
  {
    num: "1",
    title: "Conecta tu Wallet",
    desc: "Abre la app desde World App y tu wallet se conecta automáticamente con tu identidad World ID.",
  },
  {
    num: "2",
    title: "Compra un Paquete de Minería",
    desc: "Con 1 WLD compras un paquete permanente de minería. Empieza a acumular H2O y BTCH2O de forma continua sin vencimiento.",
  },
  {
    num: "3",
    title: "Haz Staking",
    desc: "Ve a la sección Staking. Deposita cualquier token compatible (H2O, FIRE, WLD, USDC y más) y gana APR sobre tu inversión.",
  },
  {
    num: "4",
    title: "Reclama tus Recompensas",
    desc: "Tus recompensas acumulan en tiempo real. Puedes reclamarlas cuando quieras — sin bloqueos, sin esperas mínimas.",
  },
];

export default function InfoSection() {
  const [activeTab, setActiveTab] = useState("tutorial");

  return (
    <div className="info-section">
      <div className="info-tabs">
        <button
          className={`info-tab ${activeTab === "tutorial" ? "active" : ""}`}
          onClick={() => setActiveTab("tutorial")}
        >
          📖 Cómo Usar la App
        </button>
        <button
          className={`info-tab ${activeTab === "tokens" ? "active" : ""}`}
          onClick={() => setActiveTab("tokens")}
        >
          🪙 Utilidad de los Tokens
        </button>
      </div>

      {activeTab === "tutorial" && (
        <div className="info-content">
          <p className="info-intro">
            Acua Company es una plataforma DeFi en World Chain donde puedes minar, stakear y reinvertir tokens de forma automática. Sigue estos pasos:
          </p>
          <div className="info-steps-grid">
            {STEPS.map((s) => (
              <div key={s.num} className="info-step-card">
                <div className="info-step-num">{s.num}</div>
                <div className="info-step-body">
                  <strong>{s.title}</strong>
                  <span>{s.desc}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="info-tip">
            <span>💡</span>
            <span>Tip: El bot de AutoReinvest recoge las comisiones de Uniswap V3 y las redistribuye automáticamente — tú solo conectas y ganas.</span>
          </div>
        </div>
      )}

      {activeTab === "tokens" && (
        <div className="info-content">
          <p className="info-intro">
            El ecosistema Acua Company tiene múltiples tokens, cada uno con su utilidad y pool de staking propio.
          </p>
          <div className="info-tokens-grid">
            {TOKENS.map((t) => (
              <div key={t.symbol} className="info-token-card">
                <div className="info-token-icon" style={{ color: t.color }}>{t.icon}</div>
                <div className="info-token-symbol" style={{ color: t.color }}>{t.symbol}</div>
                <div className="info-token-desc">{t.desc}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
