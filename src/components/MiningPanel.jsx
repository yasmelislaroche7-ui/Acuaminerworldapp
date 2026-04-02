import { useState, useEffect, useRef } from "react";
import { useReadContract, useWaitForTransactionReceipt } from "wagmi";
import { formatUnits, parseGwei } from "viem";
import {
  MINING_ADDRESS, MINING_ABI, ERC20_MINIMAL_ABI,
  WLD_TOKEN_ADDRESS, H2O_TOKEN_ADDRESS, BTCH2O_TOKEN_ADDRESS
} from "../config/mining.js";
import { useWallet } from "../context/WalletContext.jsx";
import { useMiniKitWrite } from "../hooks/useMiniKitWrite.js";
import "../styles/MiningPanel.css";

const MAXUINT256 = BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
const ZERO = "0x0000000000000000000000000000000000000000";
const BLOCK_INTERVAL_MS = 5 * 1000;

function fmt(val, decimals = 18, dp = 4) {
  if (val === undefined || val === null) return "—";
  try { return parseFloat(formatUnits(BigInt(val.toString()), decimals)).toFixed(dp); } catch { return "—"; }
}

function generateBlockHash() {
  const chars = "0123456789abcdef";
  let hash = "0x";
  for (let i = 0; i < 64; i++) hash += chars[Math.floor(Math.random() * 16)];
  return hash;
}

function makeBlock(offsetMs, userPower, h2oRate, btch2oRate) {
  const h2oPerYear  = h2oRate    ? parseFloat(formatUnits(h2oRate,    18)) : 1000;
  const btch2oPerYear = btch2oRate ? parseFloat(formatUnits(btch2oRate, 18)) : 500;
  const blocksPerYear = 365 * 24 * 12;
  const h2oPerBlock   = (h2oPerYear  / blocksPerYear) * (userPower || 1);
  const btch2oPerBlock = (btch2oPerYear / blocksPerYear) * (userPower || 1);
  return {
    id: Math.random().toString(36).slice(2),
    number: 1_000_000 + Math.floor(Math.random() * 99_999),
    hash: generateBlockHash(),
    timestamp: Date.now() - offsetMs,
    h2oReward: h2oPerBlock,
    btch2oReward: btch2oPerBlock,
  };
}

function BlockLog({ blocks, nextBlockIn }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick(n => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const pct = Math.min(100, ((BLOCK_INTERVAL_MS - nextBlockIn) / BLOCK_INTERVAL_MS) * 100);
  const ss  = Math.floor(nextBlockIn / 1000);

  return (
    <div className="block-log-wrapper">
      <div className="block-log-header">
        <span className="block-log-title">⛓ Últimos Bloques Minados</span>
        <div className="block-log-next">
          <span>Próximo bloque en</span>
          <span className="block-log-countdown">{ss}s</span>
          <div className="block-progress-bar">
            <div className="block-progress-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>

      <div className="block-cards-grid">
        {blocks.map((b, i) => {
          const secsAgo = Math.floor((Date.now() - b.timestamp) / 1000);
          const timeStr = secsAgo < 60
            ? `${secsAgo}s`
            : secsAgo < 3600
            ? `${Math.floor(secsAgo / 60)}m ${secsAgo % 60}s`
            : `${Math.floor(secsAgo / 3600)}h ${Math.floor((secsAgo % 3600) / 60)}m`;
          return (
            <div key={b.id} className={`block-card ${i === 0 ? "block-card-latest" : ""}`}>
              <div className="block-card-header">
                <span className="block-card-num">#{b.number.toLocaleString()}</span>
                {i === 0 && <span className="block-card-new-badge">NUEVO</span>}
              </div>
              <div className="block-card-hash">{b.hash.slice(0, 14)}…</div>
              <div className="block-card-rewards">
                <span className="block-card-h2o">💧 +{b.h2oReward.toFixed(6)}</span>
                <span className="block-card-btch2o">₿ +{b.btch2oReward.toFixed(6)}</span>
              </div>
              <div className="block-card-time">⏱ {timeStr}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function MiningPanel() {
  const { address: userAddr, isConnected } = useWallet();
  const { writeContractAsync, isPending }  = useMiniKitWrite();
  const [txHash, setTxHash]  = useState(null);
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash: txHash });
  const [msg, setMsg] = useState("");
  const busy = isPending || isConfirming;

  const { data: pending, refetch: refetchPending } = useReadContract({
    address: MINING_ADDRESS, abi: MINING_ABI,
    functionName: "pendingRewards",
    args: [userAddr ?? ZERO],
    query: { refetchInterval: 10_000, enabled: !!userAddr }
  });

  const { data: userInfo, refetch: refetchUser } = useReadContract({
    address: MINING_ADDRESS, abi: MINING_ABI,
    functionName: "users",
    args: [userAddr ?? ZERO],
    query: { refetchInterval: 30_000, enabled: !!userAddr }
  });

  const { data: priceWLD }     = useReadContract({ address: MINING_ADDRESS, abi: MINING_ABI, functionName: "packagePriceWLD",    query: { refetchInterval: 60_000 } });
  const { data: h2oRate }      = useReadContract({ address: MINING_ADDRESS, abi: MINING_ABI, functionName: "h2oRatePerYear",     query: { refetchInterval: 60_000 } });
  const { data: btch2oRate }   = useReadContract({ address: MINING_ADDRESS, abi: MINING_ABI, functionName: "btch2oRatePerYear",  query: { refetchInterval: 60_000 } });
  const { data: totalPowerAll }= useReadContract({ address: MINING_ADDRESS, abi: MINING_ABI, functionName: "totalPower",         query: { refetchInterval: 60_000 } });

  const { data: wldAllowance, refetch: refetchWldAllowance } = useReadContract({
    address: WLD_TOKEN_ADDRESS, abi: ERC20_MINIMAL_ABI,
    functionName: "allowance",
    args: [userAddr ?? ZERO, MINING_ADDRESS],
    query: { refetchInterval: 15_000, enabled: !!userAddr }
  });

  const userPower     = userInfo ? Number(userInfo[0]) : 0;
  const pendingH2O    = pending?.[0] ?? 0n;
  const pendingBTCH2O = pending?.[1] ?? 0n;
  const hasPending    = pendingH2O > 0n || pendingBTCH2O > 0n;
  const hasMining     = userPower > 0;
  const priceBig      = priceWLD ?? 0n;
  const needsApprove  = wldAllowance !== undefined && priceBig > 0n && wldAllowance < priceBig;
  const priceDisplay  = priceWLD ? `${fmt(priceWLD, 18, 2)} WLD` : "1 WLD";

  const h2oPerYear    = h2oRate    ? parseFloat(formatUnits(h2oRate,    18)) : 1000;
  const btch2oPerYear = btch2oRate ? parseFloat(formatUnits(btch2oRate, 18)) : 500;
  const h2oPerDay     = (h2oPerYear  * Math.max(userPower, 1)) / 365;
  const btch2oPerDay  = (btch2oPerYear * Math.max(userPower, 1)) / 365;
  const h2oPerSec     = h2oPerDay / 86400;
  const btch2oPerSec  = btch2oPerDay / 86400;

  const [blocks, setBlocks] = useState([]);
  const [nextBlockIn, setNextBlockIn] = useState(BLOCK_INTERVAL_MS);
  const lastBlockRef = useRef(Date.now());

  useEffect(() => {
    const initial = [];
    for (let i = 9; i >= 0; i--) {
      initial.push(makeBlock((i + 1) * BLOCK_INTERVAL_MS, userPower, h2oRate, btch2oRate));
    }
    setBlocks(initial);
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      const elapsed = Date.now() - lastBlockRef.current;
      const remaining = Math.max(0, BLOCK_INTERVAL_MS - elapsed);
      setNextBlockIn(remaining);
      if (elapsed >= BLOCK_INTERVAL_MS) {
        lastBlockRef.current = Date.now();
        const nb = makeBlock(0, userPower, h2oRate, btch2oRate);
        setBlocks(prev => [nb, ...prev.slice(0, 9)]);
      }
    }, 1000);
    return () => clearInterval(t);
  }, [userPower, h2oRate, btch2oRate]);

  const [liveH2O, setLiveH2O]       = useState(0);
  const [liveBTCH2O, setLiveBTCH2O] = useState(0);
  const liveRef = useRef({ start: Date.now(), baseH2O: 0, baseBTCH2O: 0, h2oPerSec: 0, btch2oPerSec: 0 });

  useEffect(() => {
    const baseH2O    = pendingH2O    ? parseFloat(formatUnits(pendingH2O,    18)) : 0;
    const baseBTCH2O = pendingBTCH2O ? parseFloat(formatUnits(pendingBTCH2O, 18)) : 0;
    liveRef.current = { start: Date.now(), baseH2O, baseBTCH2O, h2oPerSec, btch2oPerSec };
    setLiveH2O(baseH2O);
    setLiveBTCH2O(baseBTCH2O);
  }, [pendingH2O, pendingBTCH2O, h2oPerSec, btch2oPerSec]);

  useEffect(() => {
    if (!hasMining) return;
    const t = setInterval(() => {
      const { start, baseH2O, baseBTCH2O, h2oPerSec: hps, btch2oPerSec: bps } = liveRef.current;
      const elapsed = (Date.now() - start) / 1000;
      setLiveH2O(baseH2O + elapsed * hps);
      setLiveBTCH2O(baseBTCH2O + elapsed * bps);
    }, 100);
    return () => clearInterval(t);
  }, [hasMining]);

  const refetchAll = () => { refetchPending(); refetchUser(); refetchWldAllowance(); };

  const exec = async (fn) => {
    setMsg("⏳ Enviando transacción...");
    try {
      const tx = await fn();
      setTxHash(tx);
      setMsg("✅ Transacción enviada — confirmando...");
      setTimeout(() => { refetchAll(); setMsg(""); }, 8000);
    } catch (e) {
      setMsg(`❌ ${e.shortMessage || e.message?.slice(0, 140) || "Error desconocido"}`);
    }
  };

  const handleApproveWLD = () => exec(() => writeContractAsync({
    address: WLD_TOKEN_ADDRESS, abi: ERC20_MINIMAL_ABI,
    functionName: "approve", args: [MINING_ADDRESS, MAXUINT256],
    txMeta: {
      label:  "Aprobar WLD para minería",
      amount: "Ilimitado",
      token:  "WLD",
    },
  }));

  const handleBuyPackage = () => exec(() => writeContractAsync({
    address: MINING_ADDRESS, abi: MINING_ABI,
    functionName: "buyPackage", args: [1n],
    txMeta: {
      label:  "Comprar paquete de minería permanente",
      amount: priceDisplay,
      token:  "",
    },
  }));

  const handleClaim = () => exec(() => writeContractAsync({
    address: MINING_ADDRESS, abi: MINING_ABI,
    functionName: "claimRewards", args: [],
    txMeta: {
      label:  "Reclamar recompensas de minería",
      amount: `${liveH2O.toFixed(4)} H2O + ${liveBTCH2O.toFixed(4)} BTCH2O`,
    },
  }));

  if (!isConnected) return null;

  return (
    <div className="mining-wrapper">
      <div className="mining-header">
        <h2>⛏ Minería de Tokens</h2>
        <span className="mining-badge">ACTIVO</span>
        <a
          href="https://t.me/+DFj-rZvWDgw0YjNh"
          target="_blank"
          rel="noreferrer"
          className="tg-round-btn"
          title="Únete a nuestro Telegram"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248-1.97 9.289c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.116 14.6l-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.7.986z"/>
          </svg>
        </a>
      </div>

      <div className="mining-card">
        {msg && (
          <div className={`mining-msg ${msg.startsWith("✅") ? "success" : msg.startsWith("❌") ? "error" : "info"}`}>
            {msg}
          </div>
        )}

        {!hasMining ? (
          <div className="mining-empty">
            <div className="mining-empty-icon">⛏</div>
            <h3>Empieza a Minar</h3>
            <p>
              Compra tu paquete de minería permanente y empieza a acumular
              recompensas en <strong>H2O</strong> y <strong>BTCH2O</strong> de forma continua.
              Puedes reclamar tus ganancias en cualquier momento.
            </p>
            <div className="mining-price-highlight">
              ⚡ Precio del paquete: {priceDisplay}
            </div>

            <div className="mining-actions" style={{ justifyContent: "center" }}>
              {needsApprove ? (
                <button className="btn-mine" onClick={handleApproveWLD} disabled={busy}>
                  {busy ? "⏳ Procesando..." : "🔓 Aprobar WLD"}
                </button>
              ) : (
                <button className="btn-mine" onClick={handleBuyPackage} disabled={busy}>
                  {busy ? "⏳ Procesando..." : `⛏ Comprar Paquete — ${priceDisplay}`}
                </button>
              )}
            </div>

            {needsApprove && (
              <p className="approve-notice">
                Primero debes aprobar el gasto de WLD, luego podrás comprar el paquete.
              </p>
            )}

            <div className="mining-pool-bar" style={{ justifyContent: "center", marginTop: 24 }}>
              <div className="pool-chip">⚡ Mineros activos: <strong>{totalPowerAll?.toString() ?? "—"}</strong></div>
            </div>

            <BlockLog blocks={blocks} nextBlockIn={nextBlockIn} />
          </div>
        ) : (
          <>
            <div className="mining-rig-visual">
              <div className="rig-frame">
                <div className="rig-icon">⛏</div>
                <div className="rig-lights">
                  <div className="rig-light" />
                  <div className="rig-light" />
                  <div className="rig-light" />
                  <div className="rig-light" />
                </div>
                <div className="rig-info">
                  <span className="rig-label">Poder de Minería</span>
                  <span className="rig-value">×{userPower}</span>
                  <span className="rig-sublabel">paquete{userPower !== 1 ? "s" : ""} activo{userPower !== 1 ? "s" : ""}</span>
                </div>
              </div>
            </div>

            <div className="mining-stats-row">
              <div className="mining-stat">
                <span className="mining-stat-label">Ganancia H2O / día</span>
                <span className="mining-stat-value cyan">{h2oPerDay.toFixed(4)} H2O</span>
                <span className="mining-stat-sub">+{h2oPerSec.toFixed(8)} H2O/seg</span>
              </div>
              <div className="mining-stat">
                <span className="mining-stat-label">Ganancia BTCH2O / día</span>
                <span className="mining-stat-value purple">{btch2oPerDay.toFixed(4)} BTCH2O</span>
                <span className="mining-stat-sub">+{btch2oPerSec.toFixed(8)} BTCH2O/seg</span>
              </div>
              <div className="mining-stat">
                <span className="mining-stat-label">Poder total red</span>
                <span className="mining-stat-value green">×{totalPowerAll?.toString() ?? "—"}</span>
                <span className="mining-stat-sub">mineros activos</span>
              </div>
            </div>

            <div className="mining-pending-box">
              <div className="pending-title">Recompensas Acumulando en Tiempo Real</div>
              <div className="pending-tokens">
                <div className="pending-token">
                  <span className="pending-token-name">💧 H2O</span>
                  <span className="pending-token-amount live-counter">{liveH2O.toFixed(8)}</span>
                  <span className="pending-token-unit">tokens acumulados</span>
                </div>
                <div className="pending-token">
                  <span className="pending-token-name">₿ BTCH2O</span>
                  <span className="pending-token-amount live-counter">{liveBTCH2O.toFixed(8)}</span>
                  <span className="pending-token-unit">tokens acumulados</span>
                </div>
              </div>
            </div>

            <div className="mining-actions" style={{ marginBottom: 24 }}>
              <button className="btn-claim-mining" onClick={handleClaim} disabled={busy || !hasPending}>
                {busy ? "⏳ Procesando..." : "💰 Reclamar Recompensas"}
              </button>

              {needsApprove ? (
                <button className="btn-boost" onClick={handleApproveWLD} disabled={busy}>
                  {busy ? "⏳..." : "🔓 Aprobar WLD para aumentar poder"}
                </button>
              ) : (
                <button className="btn-boost" onClick={handleBuyPackage} disabled={busy}>
                  {busy ? "⏳ Procesando..." : `⚡ Aumentar Poder (+1 paquete — ${priceDisplay})`}
                </button>
              )}
            </div>

            <BlockLog blocks={blocks} nextBlockIn={nextBlockIn} />

            <div className="mining-pool-bar" style={{ marginTop: 16 }}>
              <div className="pool-chip">⚡ Poder total red: <strong>{totalPowerAll?.toString() ?? "—"}</strong></div>
              <div className="pool-chip">📋 Contrato: <a href={`https://worldscan.org/address/${MINING_ADDRESS}`} target="_blank" rel="noreferrer" style={{ color: "#00d4ff", textDecoration: "none" }}>{MINING_ADDRESS.slice(0, 10)}...↗</a></div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
