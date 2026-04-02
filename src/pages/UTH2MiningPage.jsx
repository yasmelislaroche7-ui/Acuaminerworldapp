import { useState, useEffect, useRef, useCallback } from "react";
import { useReadContract, useWaitForTransactionReceipt } from "wagmi";
import { formatUnits, parseUnits } from "viem";
import {
  UTH2_MINING_ADDRESS, UTH2_TOKEN_ADDRESS, BTCH2O_TOKEN_ADDRESS,
  UTH2_MINING_ABI, ERC20_ABI,
  PACKAGE_NAMES, PACKAGE_ICONS, PACKAGE_COLORS,
} from "../config/uth2mining.js";
import { useWallet } from "../context/WalletContext.jsx";
import { useMiniKitWrite } from "../hooks/useMiniKitWrite.js";
import "../styles/UTH2Mining.css";

const MAXUINT256 = BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
const ZERO = "0x0000000000000000000000000000000000000000";
const YEAR = 365 * 24 * 3600;

function fmt(val, dec = 18, dp = 4) {
  if (val === undefined || val === null) return "—";
  try { return parseFloat(formatUnits(BigInt(val.toString()), dec)).toFixed(dp); } catch { return "—"; }
}

// ── Hash Graph Canvas ────────────────────────────────────────────────────────
function HashGraph({ active }) {
  const canvasRef = useRef(null);
  const dataRef   = useRef([]);
  const rafRef    = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    for (let i = 0; i < 80; i++) dataRef.current.push(40 + Math.random() * 40);

    let frame = 0;
    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      frame++;
      if (frame % 2 !== 0) return;

      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      // Scroll new point
      const last = dataRef.current[dataRef.current.length - 1];
      const spike = active && Math.random() < 0.08;
      const next  = spike
        ? Math.min(H - 10, last + 15 + Math.random() * 20)
        : Math.max(10, last + (Math.random() - 0.5) * (active ? 8 : 3));
      dataRef.current.push(next);
      if (dataRef.current.length > 100) dataRef.current.shift();

      const pts = dataRef.current;
      const step = W / (pts.length - 1);

      // Grid lines
      ctx.strokeStyle = "rgba(0,212,255,0.06)";
      ctx.lineWidth   = 1;
      for (let g = 0; g <= 4; g++) {
        const y = (H / 4) * g;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }

      // Gradient fill
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, active ? "rgba(0,212,255,0.25)" : "rgba(100,100,120,0.15)");
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.beginPath();
      ctx.moveTo(0, H);
      pts.forEach((v, i) => {
        const x = i * step;
        const y = H - (v / 100) * (H - 10);
        i === 0 ? ctx.lineTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.lineTo(W, H);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      // Line
      ctx.beginPath();
      pts.forEach((v, i) => {
        const x = i * step;
        const y = H - (v / 100) * (H - 10);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.strokeStyle = active ? "#00d4ff" : "#4b5563";
      ctx.lineWidth   = 2;
      ctx.shadowColor = active ? "#00d4ff" : "transparent";
      ctx.shadowBlur  = active ? 6 : 0;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Last point dot
      const lx = (pts.length - 1) * step;
      const ly = H - (pts[pts.length - 1] / 100) * (H - 10);
      ctx.beginPath();
      ctx.arc(lx, ly, 4, 0, Math.PI * 2);
      ctx.fillStyle = active ? "#00d4ff" : "#6b7280";
      ctx.fill();
    };

    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [active]);

  return (
    <canvas
      ref={canvasRef}
      width={500}
      height={90}
      className="hash-canvas"
    />
  );
}

// ── Live Reward Counter ──────────────────────────────────────────────────────
function LiveCounter({ base, ratePerSec, label, color }) {
  const [val, setVal] = useState(base);
  const ref = useRef({ start: Date.now(), base, rps: ratePerSec });

  useEffect(() => {
    ref.current = { start: Date.now(), base, rps: ratePerSec };
    setVal(base);
  }, [base, ratePerSec]);

  useEffect(() => {
    if (ratePerSec <= 0) return;
    const t = setInterval(() => {
      const { start, base: b, rps } = ref.current;
      setVal(b + ((Date.now() - start) / 1000) * rps);
    }, 100);
    return () => clearInterval(t);
  }, [ratePerSec]);

  return (
    <div className="live-counter-block">
      <span className="live-counter-label">{label}</span>
      <span className="live-counter-value" style={{ color }}>
        {val.toFixed(8)}
      </span>
      <span className="live-counter-sub">
        +{ratePerSec.toFixed(10)} /seg
      </span>
    </div>
  );
}

// ── Block Log ────────────────────────────────────────────────────────────────
const BLOCK_MS = 4_000;
function genHash() {
  const c = "0123456789abcdef";
  return "0x" + Array.from({ length: 64 }, () => c[Math.floor(Math.random() * 16)]).join("");
}
function makeBlock(ago) {
  return { id: Math.random().toString(36).slice(2), num: 1_000_000 + Math.floor(Math.random() * 99_999), hash: genHash(), ts: Date.now() - ago };
}

function BlockLog({ active }) {
  const [blocks, setBlocks] = useState(() => Array.from({ length: 8 }, (_, i) => makeBlock((i + 1) * BLOCK_MS)));
  const [next, setNext]     = useState(BLOCK_MS);
  const lastRef = useRef(Date.now());
  const [, tick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      tick(n => n + 1);
      const elapsed = Date.now() - lastRef.current;
      setNext(Math.max(0, BLOCK_MS - elapsed));
      if (elapsed >= BLOCK_MS) {
        lastRef.current = Date.now();
        setBlocks(prev => [makeBlock(0), ...prev.slice(0, 9)]);
      }
    }, 500);
    return () => clearInterval(t);
  }, []);

  const pct = Math.min(100, ((BLOCK_MS - next) / BLOCK_MS) * 100);

  return (
    <div className="uth2-block-log">
      <div className="uth2-block-log-header">
        <span className="uth2-block-log-title">⛓ Bloques Minados</span>
        <div className="uth2-block-next">
          <span>Próximo en {Math.ceil(next / 1000)}s</span>
          <div className="uth2-block-prog">
            <div className="uth2-block-prog-fill" style={{ width: `${pct}%`, background: active ? "#00d4ff" : "#374151" }} />
          </div>
        </div>
      </div>
      <div className="uth2-blocks-grid">
        {blocks.map((b, i) => {
          const ago = Math.floor((Date.now() - b.ts) / 1000);
          return (
            <div key={b.id} className={`uth2-block-card ${i === 0 ? "uth2-block-latest" : ""}`}>
              <div className="uth2-block-num">#{b.num.toLocaleString()} {i === 0 && <span className="uth2-new-badge">NUEVO</span>}</div>
              <div className="uth2-block-hash">{b.hash.slice(0, 16)}…</div>
              <div className="uth2-block-reward">₿ +{(Math.random() * 0.01).toFixed(6)} BTCH2O</div>
              <div className="uth2-block-time">⏱ {ago < 60 ? `${ago}s` : `${Math.floor(ago/60)}m`}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Package Card ─────────────────────────────────────────────────────────────
function PackageCard({ idx, price, rate, userCount, onBuy, loading, needsApprove, onApprove }) {
  const priceDisplay = price ? `${parseFloat(formatUnits(price, 18)).toFixed(2)} UTH₂` : "—";
  const rateYear     = rate  ? parseFloat(formatUnits(rate,  18)).toFixed(0) : "—";
  const rateDay      = rate  ? (parseFloat(formatUnits(rate, 18)) / 365).toFixed(4) : "—";

  return (
    <div className={`pkg-card ${userCount > 0 ? "pkg-card-owned" : ""}`} style={{ "--pkg-color": PACKAGE_COLORS[idx] }}>
      <div className="pkg-card-top">
        <span className="pkg-icon">{PACKAGE_ICONS[idx]}</span>
        <div className="pkg-name-wrap">
          <span className="pkg-name">{PACKAGE_NAMES[idx]}</span>
          {userCount > 0 && <span className="pkg-owned-badge">×{userCount} activo{userCount > 1 ? "s" : ""}</span>}
        </div>
      </div>
      <div className="pkg-price">{priceDisplay}</div>
      <div className="pkg-rate-year">
        <span className="pkg-rate-num">{rateYear}</span>
        <span className="pkg-rate-unit"> BTCH2O/año</span>
      </div>
      <div className="pkg-rate-day">≈ {rateDay} BTCH2O/día</div>
      <div className="pkg-actions">
        {needsApprove ? (
          <button className="pkg-btn pkg-btn-approve" onClick={onApprove} disabled={loading}>
            {loading ? "⏳" : "🔓 Aprobar UTH₂"}
          </button>
        ) : (
          <button className="pkg-btn" onClick={() => onBuy(idx)} disabled={loading}
            style={{ background: `linear-gradient(135deg, ${PACKAGE_COLORS[idx]}33, ${PACKAGE_COLORS[idx]}18)`, borderColor: PACKAGE_COLORS[idx] + "66" }}>
            {loading ? "⏳ Procesando..." : "⛏ Comprar"}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Owner Admin ──────────────────────────────────────────────────────────────
function OwnerAdmin({ contractOwner, userAddr, prices, rates, onSetPackage, onFundPool, onWithdrawUTH2, loading }) {
  const isOwner = contractOwner && userAddr && contractOwner.toLowerCase() === userAddr.toLowerCase();
  const [editPkg, setEditPkg] = useState(0);
  const [editPrice, setEditPrice] = useState("");
  const [editRate, setEditRate]   = useState("");
  const [fundAmt, setFundAmt]     = useState("");

  if (!isOwner) return null;

  return (
    <div className="uth2-owner-panel">
      <div className="uth2-owner-title">🔧 Panel Admin del Owner</div>

      <div className="uth2-owner-grid">
        <div className="uth2-owner-section">
          <div className="uth2-owner-sub">Modificar Paquete</div>
          <select className="uth2-select" value={editPkg} onChange={e => {
            const i = Number(e.target.value);
            setEditPkg(i);
            setEditPrice(prices[i] ? formatUnits(prices[i], 18) : "");
            setEditRate(rates[i]   ? formatUnits(rates[i],  18) : "");
          }}>
            {PACKAGE_NAMES.map((n, i) => <option key={i} value={i}>{i} — {n}</option>)}
          </select>
          <input className="uth2-input" placeholder="Precio en UTH₂ (ej: 50)" value={editPrice} onChange={e => setEditPrice(e.target.value)} />
          <input className="uth2-input" placeholder="BTCH2O/año (ej: 700)" value={editRate} onChange={e => setEditRate(e.target.value)} />
          <button className="uth2-owner-btn" disabled={loading} onClick={() => {
            if (!editPrice || !editRate) return;
            onSetPackage(editPkg, parseUnits(editPrice, 18), parseUnits(editRate, 18));
          }}>
            Actualizar Paquete
          </button>
        </div>

        <div className="uth2-owner-section">
          <div className="uth2-owner-sub">Pool de Recompensas BTCH2O</div>
          <input className="uth2-input" placeholder="Cantidad BTCH2O a fondear" value={fundAmt} onChange={e => setFundAmt(e.target.value)} />
          <button className="uth2-owner-btn" disabled={loading || !fundAmt} onClick={() => onFundPool(parseUnits(fundAmt, 18))}>
            Fondear Pool
          </button>
          <button className="uth2-owner-btn-warn" disabled={loading} onClick={onWithdrawUTH2}>
            Retirar UTH₂ del Contrato
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function UTH2MiningPage() {
  const { address: userAddr, isConnected } = useWallet();
  const { writeContractAsync, isPending } = useMiniKitWrite();
  const [txHash, setTxHash]   = useState(null);
  const [msg, setMsg]         = useState("");
  const [quantities, setQty]  = useState(Array(7).fill(1));
  const { isLoading: isConf } = useWaitForTransactionReceipt({ hash: txHash });
  const busy = isPending || isConf;

  // ── Contract reads ──────────────────────────────────────────────────────
  const { data: pending, refetch: rPending } = useReadContract({
    address: UTH2_MINING_ADDRESS, abi: UTH2_MINING_ABI,
    functionName: "pendingRewards",
    args: [userAddr ?? ZERO],
    query: { refetchInterval: 12_000, enabled: !!userAddr }
  });
  const { data: userCounts, refetch: rCounts } = useReadContract({
    address: UTH2_MINING_ADDRESS, abi: UTH2_MINING_ABI,
    functionName: "getUserCounts",
    args: [userAddr ?? ZERO],
    query: { refetchInterval: 30_000, enabled: !!userAddr }
  });
  const { data: userRate } = useReadContract({
    address: UTH2_MINING_ADDRESS, abi: UTH2_MINING_ABI,
    functionName: "getUserRate",
    args: [userAddr ?? ZERO],
    query: { refetchInterval: 30_000, enabled: !!userAddr }
  });
  const { data: pkgData, refetch: rPkgData } = useReadContract({
    address: UTH2_MINING_ADDRESS, abi: UTH2_MINING_ABI,
    functionName: "getPackages",
    query: { refetchInterval: 60_000 }
  });
  const { data: poolBal } = useReadContract({
    address: UTH2_MINING_ADDRESS, abi: UTH2_MINING_ABI,
    functionName: "poolBalance",
    query: { refetchInterval: 30_000 }
  });
  const { data: totalCollected } = useReadContract({
    address: UTH2_MINING_ADDRESS, abi: UTH2_MINING_ABI,
    functionName: "totalUTH2Collected",
    query: { refetchInterval: 60_000 }
  });
  const { data: contractOwner } = useReadContract({
    address: UTH2_MINING_ADDRESS, abi: UTH2_MINING_ABI,
    functionName: "owner",
    query: { refetchInterval: 120_000 }
  });

  // ── Allowance ────────────────────────────────────────────────────────────
  const { data: uth2Allowance, refetch: rAllow } = useReadContract({
    address: UTH2_TOKEN_ADDRESS, abi: ERC20_ABI,
    functionName: "allowance",
    args: [userAddr ?? ZERO, UTH2_MINING_ADDRESS],
    query: { refetchInterval: 15_000, enabled: !!userAddr }
  });

  // ── Derived values ───────────────────────────────────────────────────────
  const prices      = pkgData?.[0] ?? Array(7).fill(0n);
  const rates       = pkgData?.[1] ?? Array(7).fill(0n);
  const counts      = userCounts ?? Array(7).fill(0n);
  const pendingVal  = pending ? parseFloat(formatUnits(pending, 18)) : 0;
  const ratePerYear = userRate ? parseFloat(formatUnits(userRate, 18)) : 0;
  const ratePerSec  = ratePerYear / YEAR;
  const ratePerDay  = ratePerYear / 365;
  const hasMining   = counts.some(c => c > 0n);
  const hasPending  = pendingVal > 0;

  // needsApprove: check if allowance < any package price
  const minPriceForPkg = (idx) => prices[idx] ?? 0n;
  const pkgNeedsApprove = (idx) => {
    const p = minPriceForPkg(idx);
    return p > 0n && (uth2Allowance === undefined || uth2Allowance < p);
  };

  // ── Live reward counter ──────────────────────────────────────────────────
  const [liveBTCH2O, setLiveBTCH2O] = useState(0);
  const liveRef = useRef({ start: Date.now(), base: 0, rps: 0 });

  useEffect(() => {
    liveRef.current = { start: Date.now(), base: pendingVal, rps: ratePerSec };
    setLiveBTCH2O(pendingVal);
  }, [pendingVal, ratePerSec]);

  useEffect(() => {
    if (!hasMining) return;
    const t = setInterval(() => {
      const { start, base, rps } = liveRef.current;
      setLiveBTCH2O(base + ((Date.now() - start) / 1000) * rps);
    }, 100);
    return () => clearInterval(t);
  }, [hasMining]);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const refetchAll = useCallback(() => {
    rPending(); rCounts(); rAllow(); rPkgData();
  }, [rPending, rCounts, rAllow, rPkgData]);

  const exec = useCallback(async (fn) => {
    setMsg("⏳ Enviando transacción...");
    try {
      const tx = await fn();
      setTxHash(tx);
      setMsg("✅ Transacción confirmada — actualizando datos...");
      setTimeout(() => { refetchAll(); setMsg(""); }, 8000);
    } catch (e) {
      setMsg(`❌ ${e.shortMessage || e.message?.slice(0, 160) || "Error desconocido"}`);
    }
  }, [refetchAll]);

  const handleApprove = useCallback(() => exec(() => writeContractAsync({
    address: UTH2_TOKEN_ADDRESS, abi: ERC20_ABI,
    functionName: "approve", args: [UTH2_MINING_ADDRESS, MAXUINT256],
    txMeta: { label: "Aprobar UTH₂ para minería", amount: "Ilimitado", token: "UTH₂" },
  })), [exec, writeContractAsync]);

  const handleBuy = useCallback((idx) => exec(() => writeContractAsync({
    address: UTH2_MINING_ADDRESS, abi: UTH2_MINING_ABI,
    functionName: "buyPackage", args: [idx, BigInt(quantities[idx] ?? 1)],
    txMeta: {
      label: `Comprar paquete ${PACKAGE_NAMES[idx]}`,
      amount: prices[idx] ? `${parseFloat(formatUnits(prices[idx] * BigInt(quantities[idx] ?? 1), 18)).toFixed(2)} UTH₂` : "—",
      token: "UTH₂",
    },
  })), [exec, writeContractAsync, prices, quantities]);

  const handleClaim = useCallback(() => exec(() => writeContractAsync({
    address: UTH2_MINING_ADDRESS, abi: UTH2_MINING_ABI,
    functionName: "claimRewards", args: [],
    txMeta: { label: "Reclamar recompensas BTCH2O", amount: `${liveBTCH2O.toFixed(6)} BTCH2O` },
  })), [exec, writeContractAsync, liveBTCH2O]);

  const handleSetPackage = useCallback((pkg, price, rate) => exec(() => writeContractAsync({
    address: UTH2_MINING_ADDRESS, abi: UTH2_MINING_ABI,
    functionName: "setPackage", args: [pkg, price, rate],
    txMeta: { label: `Actualizar paquete ${PACKAGE_NAMES[pkg]}` },
  })), [exec, writeContractAsync]);

  const handleFundPool = useCallback((amt) => exec(() => writeContractAsync({
    address: UTH2_TOKEN_ADDRESS, abi: ERC20_ABI,
    functionName: "approve", args: [UTH2_MINING_ADDRESS, amt],
    txMeta: { label: "Fondear pool de BTCH2O" },
  })), [exec, writeContractAsync]);

  const handleWithdrawUTH2 = useCallback(() => exec(() => writeContractAsync({
    address: UTH2_MINING_ADDRESS, abi: UTH2_MINING_ABI,
    functionName: "withdrawUTH2", args: [],
    txMeta: { label: "Retirar UTH₂ del contrato" },
  })), [exec, writeContractAsync]);

  if (!isConnected) {
    return (
      <div className="uth2-connect-page">
        <div className="uth2-connect-card">
          <div className="uth2-connect-icon">⛏</div>
          <h1 className="uth2-connect-title">Minería UTH₂</h1>
          <p className="uth2-connect-desc">Conecta tu wallet para acceder a los paquetes de minería y generar BTCH2O 24/7.</p>
          <div className="uth2-connect-hint">Usa el botón "World App" en la barra superior.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="uth2-page">
      {/* ── Header ── */}
      <div className="uth2-page-header">
        <div className="uth2-page-title-wrap">
          <h1 className="uth2-page-title">
            <span className="uth2-title-icon">⛏</span>
            Minería UTH₂ → BTCH2O
          </h1>
          <span className="uth2-page-badge">24/7 ACTIVO</span>
        </div>
        <div className="uth2-header-stats">
          <div className="uth2-hstat">
            <span className="uth2-hstat-label">Pool BTCH2O</span>
            <span className="uth2-hstat-val">{poolBal ? parseFloat(formatUnits(poolBal, 18)).toFixed(2) : "—"}</span>
          </div>
          <div className="uth2-hstat">
            <span className="uth2-hstat-label">UTH₂ Recaudado</span>
            <span className="uth2-hstat-val">{totalCollected ? parseFloat(formatUnits(totalCollected, 18)).toFixed(2) : "—"}</span>
          </div>
          <div className="uth2-hstat">
            <span className="uth2-hstat-label">Tu Tasa/Día</span>
            <span className="uth2-hstat-val cyan">{hasMining ? ratePerDay.toFixed(4) : "0"} BTCH2O</span>
          </div>
        </div>
      </div>

      {msg && (
        <div className={`uth2-msg ${msg.startsWith("✅") ? "success" : msg.startsWith("❌") ? "error" : "info"}`}>
          {msg}
        </div>
      )}

      {/* ── Live Counter + Hash Graph ── */}
      {hasMining && (
        <div className="uth2-live-section">
          <div className="uth2-live-counter-wrap">
            <div className="uth2-live-title">⚡ Recompensas en Tiempo Real</div>
            <LiveCounter
              base={pendingVal}
              ratePerSec={ratePerSec}
              label="₿ BTCH2O Acumulado"
              color="#00d4ff"
            />
            <div className="uth2-claim-row">
              <button
                className="uth2-btn-claim"
                onClick={handleClaim}
                disabled={busy || !hasPending}
              >
                {busy ? "⏳ Procesando..." : `💰 Reclamar ${liveBTCH2O.toFixed(6)} BTCH2O`}
              </button>
            </div>
          </div>
          <div className="uth2-hash-wrap">
            <div className="uth2-hash-header">
              <span className="uth2-hash-title">📊 Hash Rate de Minería</span>
              <span className="uth2-hash-val">{(ratePerYear / 365 / 24 * 1000).toFixed(2)} mBTCH2O/hr</span>
            </div>
            <HashGraph active={hasMining} />
            <div className="uth2-hash-footer">
              <span>MH/s: {(Math.random() * 9 + 1).toFixed(1)}</span>
              <span>Paquetes activos: {counts.reduce((a, c) => a + Number(c), 0)}</span>
              <span>APY estimado: ∞</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Mining Rig Stats ── */}
      {hasMining && (
        <div className="uth2-rig-stats">
          {PACKAGE_NAMES.map((name, i) => {
            const count = Number(counts[i] ?? 0n);
            if (count === 0) return null;
            const myRate = rates[i] ? parseFloat(formatUnits(rates[i], 18)) * count / 365 : 0;
            return (
              <div key={i} className="uth2-rig-chip" style={{ borderColor: PACKAGE_COLORS[i] + "66" }}>
                <span>{PACKAGE_ICONS[i]}</span>
                <span>{name} ×{count}</span>
                <span style={{ color: PACKAGE_COLORS[i] }}>{myRate.toFixed(4)}/día</span>
              </div>
            );
          })}
        </div>
      )}

      {/* ── 7 Package Cards ── */}
      <div className="uth2-packages-section">
        <div className="uth2-packages-title">
          <h2>💎 Paquetes de Minería</h2>
          <span className="uth2-packages-sub">Compra con UTH₂ · Genera BTCH2O 24/7 · Sin fecha de vencimiento</span>
        </div>
        <div className="uth2-packages-grid">
          {PACKAGE_NAMES.map((_, idx) => (
            <PackageCard
              key={idx}
              idx={idx}
              price={prices[idx]}
              rate={rates[idx]}
              userCount={Number(counts[idx] ?? 0n)}
              onBuy={handleBuy}
              loading={busy}
              needsApprove={pkgNeedsApprove(idx)}
              onApprove={handleApprove}
            />
          ))}
        </div>
      </div>

      {/* ── Block Log ── */}
      <BlockLog active={hasMining} />

      {/* ── Owner Admin ── */}
      <OwnerAdmin
        contractOwner={contractOwner}
        userAddr={userAddr}
        prices={prices}
        rates={rates}
        onSetPackage={handleSetPackage}
        onFundPool={handleFundPool}
        onWithdrawUTH2={handleWithdrawUTH2}
        loading={busy}
      />

      {/* ── Contract Info ── */}
      <div className="uth2-footer-info">
        <a href={`https://worldscan.org/address/${UTH2_MINING_ADDRESS}`} target="_blank" rel="noreferrer" className="uth2-footer-link">
          📋 {UTH2_MINING_ADDRESS.slice(0, 14)}…{UTH2_MINING_ADDRESS.slice(-6)} ↗
        </a>
        <span className="uth2-footer-sep">|</span>
        <a href="https://t.me/+DFj-rZvWDgw0YjNh" target="_blank" rel="noreferrer" className="uth2-footer-link">
          📨 Telegram
        </a>
      </div>
    </div>
  );
}
