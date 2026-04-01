import { useState, useEffect, useCallback } from "react";
import { useWallet } from "../context/WalletContext.jsx";
import { MINING_ADDRESS, H2O_TOKEN_ADDRESS, BTCH2O_TOKEN_ADDRESS, WLD_TOKEN_ADDRESS } from "../config/mining.js";
import "../styles/TransactionList.css";

const WORLDSCAN_API = "https://worldscan.org/api";
const UNISWAP_ROUTER = "0x091AD9e2e6e5eD44c1c66dB50e49A601F9f36cF6";
const UNISWAP_FACTORY = "0x7a5028BDa40e7B173C278C5342087826455ea25a";

const TOKEN_MAP = {
  [WLD_TOKEN_ADDRESS.toLowerCase()]:   { symbol: "WLD",    color: "#00d4ff" },
  [H2O_TOKEN_ADDRESS.toLowerCase()]:   { symbol: "H2O",    color: "#38bdf8" },
  [BTCH2O_TOKEN_ADDRESS.toLowerCase()]:{ symbol: "BTCH2O", color: "#a78bfa" },
};

const MINING_METHODS = {
  "0x9a8a0592": { label: "Compra Paquete",   icon: "⛏",  color: "#00d4ff", type: "buy"   },
  "0x6a20de92": { label: "Reclamo Rewards",  icon: "💰", color: "#10b981", type: "claim" },
  "0x4e71d92d": { label: "Reclamo Rewards",  icon: "💰", color: "#10b981", type: "claim" },
};

function shortAddr(addr) {
  if (!addr) return "—";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function fmtDate(ts) {
  const d = new Date(Number(ts) * 1000);
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" }) +
    " " + d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

function fmtAgo(ts) {
  const secs = Math.floor(Date.now() / 1000) - Number(ts);
  if (secs < 60)  return `${secs}s`;
  if (secs < 3600)return `${Math.floor(secs/60)}m`;
  if (secs < 86400)return `${Math.floor(secs/3600)}h`;
  return `${Math.floor(secs/86400)}d`;
}

function fmtValue(val, decimals = 18, dp = 4) {
  if (!val || val === "0") return "0";
  try {
    const n = parseFloat(val) / Math.pow(10, decimals);
    if (n === 0) return "0";
    if (n < 0.0001) return n.toExponential(2);
    if (n >= 1000000) return (n / 1000000).toFixed(2) + "M";
    if (n >= 1000)    return (n / 1000).toFixed(2) + "K";
    return n.toFixed(dp);
  } catch { return "—"; }
}

function classifyTx(tx, address) {
  const to   = tx.to?.toLowerCase();
  const from = tx.from?.toLowerCase();
  const me   = address?.toLowerCase();
  const input = tx.input || "";
  const method = input.slice(0, 10).toLowerCase();

  if (to === MINING_ADDRESS.toLowerCase()) {
    if (method === "0x9a8a0592" || input.includes("buyPackage".slice(0,4))) {
      return { label: "Compra Paquete Minería", icon: "⛏", color: "#00d4ff", badge: "buy" };
    }
    if (method === "0x4e71d92d" || method === "0x6a20de92") {
      return { label: "Reclamo de Recompensas", icon: "💰", color: "#10b981", badge: "claim" };
    }
    return { label: "Interacción Minería", icon: "⛏", color: "#00d4ff", badge: "mining" };
  }

  if (to === UNISWAP_ROUTER.toLowerCase() || to === UNISWAP_FACTORY.toLowerCase()) {
    const isExactInput = method === "0x414bf389" || method === "0xc04b8d59";
    if (isExactInput || input.length > 10) {
      return { label: "Swap Uniswap V3", icon: "🔄", color: "#f97316", badge: "swap" };
    }
    return { label: "Uniswap", icon: "🔄", color: "#f97316", badge: "swap" };
  }

  if (from === me && to !== me) {
    return { label: "Envío",   icon: "↑", color: "#ef4444", badge: "send" };
  }
  if (to === me && from !== me) {
    return { label: "Recibo",  icon: "↓", color: "#10b981", badge: "receive" };
  }

  return { label: "Transacción", icon: "📋", color: "#94a3b8", badge: "other" };
}

function classifyTokenTx(tx, address) {
  const me = address?.toLowerCase();
  const tokenInfo = TOKEN_MAP[tx.contractAddress?.toLowerCase()];
  const symbol = tokenInfo?.symbol || tx.tokenSymbol || "TOKEN";
  const color  = tokenInfo?.color  || "#94a3b8";
  const val    = fmtValue(tx.value, parseInt(tx.tokenDecimal) || 18, 4);

  if (tx.from?.toLowerCase() === me) {
    return { label: `Envío ${symbol}`, icon: "↑", color: "#ef4444", badge: "send", amount: `-${val} ${symbol}` };
  }
  return { label: `Recibo ${symbol}`, icon: "↓", color, badge: "receive", amount: `+${val} ${symbol}` };
}

async function fetchTxs(address) {
  const params = (action, extra = "") =>
    `${WORLDSCAN_API}?module=account&action=${action}&address=${address}&sort=desc&page=1&offset=40${extra}`;

  const [txRes, tokenRes] = await Promise.allSettled([
    fetch(params("txlist")).then(r => r.json()),
    fetch(params("tokentx", `&contractaddress=`)).then(r => r.json()),
  ]);

  const txList    = txRes.status    === "fulfilled" && txRes.value.status    === "1" ? txRes.value.result    : [];
  const tokenList = tokenRes.status === "fulfilled" && tokenRes.value.status === "1" ? tokenRes.value.result : [];

  return { txList, tokenList };
}

export default function TransactionList() {
  const { address, isConnected } = useWallet();
  const [txs,      setTxs]      = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);
  const [lastFetch, setLastFetch] = useState(null);

  const load = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    setError(null);
    try {
      const { txList, tokenList } = await fetchTxs(address);

      const normal = txList
        .filter(tx => tx.isError !== "1")
        .map(tx => ({
          ...classifyTx(tx, address),
          hash: tx.hash,
          ts:   tx.timeStamp,
          from: tx.from,
          to:   tx.to,
          value: tx.value && tx.value !== "0" ? `${fmtValue(tx.value, 18, 4)} ETH` : null,
          gas: tx.gasUsed,
          _type: "normal",
        }));

      const tokens = tokenList
        .map(tx => {
          const c = classifyTokenTx(tx, address);
          return {
            ...c,
            hash: tx.hash,
            ts:   tx.timeStamp,
            from: tx.from,
            to:   tx.to,
            _type: "token",
          };
        });

      const seenHashes = new Set();
      const merged = [...normal, ...tokens]
        .filter(tx => {
          if (seenHashes.has(tx.hash + tx._type)) return false;
          seenHashes.add(tx.hash + tx._type);
          return true;
        })
        .sort((a, b) => Number(b.ts) - Number(a.ts))
        .slice(0, 50);

      setTxs(merged);
      setLastFetch(new Date());
    } catch (e) {
      setError("No se pudo cargar el historial. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    if (isConnected && address) {
      load();
      const t = setInterval(load, 30_000);
      return () => clearInterval(t);
    }
  }, [address, isConnected, load]);

  if (!isConnected) return null;

  return (
    <div className="txlist-wrapper">
      <div className="txlist-header">
        <div className="txlist-title-row">
          <h3>📋 Últimas 50 Transacciones</h3>
          <div className="txlist-meta">
            {lastFetch && <span className="txlist-updated">Actualizado {lastFetch.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>}
            <button className="txlist-refresh" onClick={load} disabled={loading}>
              {loading ? "⟳" : "↻"} Actualizar
            </button>
          </div>
        </div>
        <p className="txlist-subtitle">
          Compras de paquetes · Reclamos · Swaps Uniswap · Transferencias de tokens
        </p>
      </div>

      {error && (
        <div className="txlist-error">{error}</div>
      )}

      {loading && txs.length === 0 ? (
        <div className="txlist-loading">
          <div className="txlist-spinner" />
          <span>Cargando historial desde World Chain…</span>
        </div>
      ) : txs.length === 0 && !loading ? (
        <div className="txlist-empty">
          <div className="txlist-empty-icon">📭</div>
          <p>No se encontraron transacciones para esta wallet.</p>
          <p style={{ fontSize: 12, opacity: 0.5 }}>Las primeras transacciones aparecerán aquí.</p>
        </div>
      ) : (
        <div className="txlist-table">
          <div className="txlist-row txlist-head">
            <span>Tipo</span>
            <span>Hash</span>
            <span>De / Para</span>
            <span>Monto</span>
            <span>Hace</span>
            <span>Fecha</span>
          </div>

          {txs.map((tx, i) => (
            <div key={tx.hash + i} className="txlist-row txlist-item">
              <div className="txlist-type">
                <span className="txlist-icon" style={{ background: `${tx.color}18`, color: tx.color }}>
                  {tx.icon}
                </span>
                <div className="txlist-label-group">
                  <span className="txlist-label">{tx.label}</span>
                  <span className={`txlist-badge txlist-badge-${tx.badge}`}>{tx.badge}</span>
                </div>
              </div>

              <a
                href={`https://worldscan.org/tx/${tx.hash}`}
                target="_blank"
                rel="noreferrer"
                className="txlist-hash"
              >
                {tx.hash.slice(0, 8)}…{tx.hash.slice(-4)}
                <span className="txlist-ext">↗</span>
              </a>

              <div className="txlist-addrs">
                <span className="txlist-addr">
                  {tx.from?.toLowerCase() === address?.toLowerCase()
                    ? <span style={{ color: "#ef4444", fontWeight: 600 }}>Yo</span>
                    : shortAddr(tx.from)}
                </span>
                <span className="txlist-arrow">→</span>
                <span className="txlist-addr">
                  {tx.to?.toLowerCase() === MINING_ADDRESS.toLowerCase()
                    ? <span style={{ color: "#00d4ff", fontWeight: 600 }}>Mining</span>
                    : tx.to?.toLowerCase() === address?.toLowerCase()
                    ? <span style={{ color: "#10b981", fontWeight: 600 }}>Yo</span>
                    : shortAddr(tx.to)}
                </span>
              </div>

              <span className="txlist-amount" style={{ color: tx.amount?.startsWith("+") ? "#10b981" : tx.amount?.startsWith("-") ? "#ef4444" : "#94a3b8" }}>
                {tx.amount || tx.value || "—"}
              </span>

              <span className="txlist-ago">{fmtAgo(tx.ts)}</span>
              <span className="txlist-date">{fmtDate(tx.ts)}</span>
            </div>
          ))}
        </div>
      )}

      {txs.length > 0 && (
        <div className="txlist-footer">
          <span>{txs.length} transacciones • </span>
          <a
            href={`https://worldscan.org/address/${address}`}
            target="_blank"
            rel="noreferrer"
            className="txlist-footer-link"
          >
            Ver todas en WorldScan ↗
          </a>
        </div>
      )}
    </div>
  );
}
