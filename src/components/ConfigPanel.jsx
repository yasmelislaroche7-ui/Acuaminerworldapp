import { useState } from "react";
import { useContractRead, useContractWrite } from "../hooks/useContract.js";
import "../styles/ConfigPanel.css";

// V6 getConfig() returns:
// [0]=reinvestIntervalSecs [1]=reserveFeeBps [2]=slippageBps [3]=defaultSwapFeeTier [4]=paused [5]=lastReinvestAt

const FEE_TIERS = [
  { label: "0.01%", value: 100 },
  { label: "0.05%", value: 500 },
  { label: "0.3%",  value: 3000 },
  { label: "1%",    value: 10000 },
];

export default function ConfigPanel() {
  const { data: config, refetch } = useContractRead("getConfig", [], true);
  const { write, isPending } = useContractWrite();

  const [interval, setInterval_]   = useState("");
  const [reserve,  setReserve]     = useState("");
  const [slippage, setSlippage]    = useState("");
  const [feeTier,  setFeeTier]     = useState("");
  const [msg, setMsg]              = useState("");

  const apply = async (fn, args, label) => {
    try {
      setMsg(`Enviando ${label}...`);
      await write(fn, args);
      setMsg(`✅ ${label} actualizado`);
      refetch();
    } catch (e) {
      setMsg(`❌ Error: ${e.shortMessage || e.message}`);
    }
  };

  if (!config) return <div className="config-panel loading">Cargando configuración...</div>;

  const isPaused          = config[4];
  const lastReinvestAt    = Number(config[5]);
  const currentFeeTier    = Number(config[3]);
  const currentFeeTierLbl = FEE_TIERS.find(f => f.value === currentFeeTier)?.label ?? `${currentFeeTier}`;

  return (
    <div className="config-panel">
      <h3>Configuración del Contrato V6</h3>
      {msg && <div className="config-msg">{msg}</div>}

      <div className="config-status">
        <div className={`status-badge ${isPaused ? "paused" : "active"}`}>
          Contrato: {isPaused ? "⏸ PAUSADO" : "▶ ACTIVO"}
        </div>
        <button
          className={`btn-sm ${isPaused ? "btn-success" : "btn-warning"}`}
          onClick={() => apply("setPaused", [!isPaused], isPaused ? "Reanudar" : "Pausar")}
          disabled={isPending}
        >
          {isPaused ? "▶ Reanudar" : "⏸ Pausar"}
        </button>
        <span className="config-last">
          Último reinvest:{" "}
          {lastReinvestAt > 0 ? new Date(lastReinvestAt * 1000).toLocaleString() : "Nunca"}
        </span>
      </div>

      <div className="config-grid">
        <div className="config-item">
          <label>Intervalo de reinversión</label>
          <div className="config-current">
            Actual: {Number(config[0])}s ({(Number(config[0]) / 60).toFixed(1)} min)
          </div>
          <div className="config-input-row">
            <input
              type="number" min="60" placeholder="segundos"
              value={interval} onChange={e => setInterval_(e.target.value)}
            />
            <button
              className="btn-primary btn-sm"
              onClick={() => apply("setReinvestInterval", [BigInt(interval)], "Intervalo")}
              disabled={!interval || isPending}
            >Aplicar</button>
          </div>
        </div>

        <div className="config-item">
          <label>Fee de reserva</label>
          <div className="config-current">
            Actual: {Number(config[1])} bps ({(Number(config[1]) / 100).toFixed(2)}%)
          </div>
          <div className="config-input-row">
            <input
              type="number" min="0" max="2000" placeholder="bps (ej: 200 = 2%)"
              value={reserve} onChange={e => setReserve(e.target.value)}
            />
            <button
              className="btn-primary btn-sm"
              onClick={() => apply("setReserveFeeBps", [BigInt(reserve)], "Reserva")}
              disabled={!reserve || isPending}
            >Aplicar</button>
          </div>
        </div>

        <div className="config-item">
          <label>Slippage máximo</label>
          <div className="config-current">
            Actual: {Number(config[2])} bps ({(Number(config[2]) / 100).toFixed(2)}%)
          </div>
          <div className="config-input-row">
            <input
              type="number" min="1" max="1000" placeholder="bps (ej: 50 = 0.5%)"
              value={slippage} onChange={e => setSlippage(e.target.value)}
            />
            <button
              className="btn-primary btn-sm"
              onClick={() => apply("setSlippageBps", [BigInt(slippage)], "Slippage")}
              disabled={!slippage || isPending}
            >Aplicar</button>
          </div>
        </div>

        <div className="config-item">
          <label>Fee tier por defecto para swaps</label>
          <div className="config-current">
            Actual: {currentFeeTierLbl} ({currentFeeTier})
          </div>
          <div className="config-input-row">
            <select value={feeTier} onChange={e => setFeeTier(e.target.value)}>
              <option value="">-- Seleccionar --</option>
              {FEE_TIERS.map(f => (
                <option key={f.value} value={f.value}>{f.label} ({f.value})</option>
              ))}
            </select>
            <button
              className="btn-primary btn-sm"
              onClick={() => apply("setDefaultSwapFeeTier", [Number(feeTier)], "Fee Tier")}
              disabled={!feeTier || isPending}
            >Aplicar</button>
          </div>
        </div>
      </div>
    </div>
  );
}
