import { useState, useEffect, useCallback } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from "wagmi";
import WorldConnectBtn from "./WorldConnectBtn.jsx";
import { formatUnits, parseUnits, parseGwei, getAddress, maxUint256, isAddress } from "viem";
import { SWAP_PROXY_ADDRESS, SWAP_PROXY_ABI, POOL_FEES, KNOWN_TOKENS } from "../config/swap.js";
import { ERC20_ABI } from "../config/staking.js";
import "../styles/SwapPanel.css";

const GAS = {
  gas:                  700_000n,
  maxFeePerGas:         parseGwei("0.001"),
  maxPriorityFeePerGas: parseGwei("0.001"),
};

const ZERO_ADDR = getAddress("0x0000000000000000000000000000000000000000");

function fmt(val, dec = 18, dp = 6) {
  if (val === undefined || val === null) return "—";
  try { return parseFloat(formatUnits(BigInt(val.toString()), dec)).toFixed(dp); }
  catch { return "—"; }
}

function parseErr(e) {
  const msg = e?.shortMessage || e?.message || String(e);
  if (msg.includes("User rejected") || msg.includes("user rejected")) return "❌ Rechazado por el usuario";
  if (msg.includes("insufficient funds")) return "❌ Fondos insuficientes para gas";
  if (msg.includes("allowance")) return "❌ Necesitas aprobar el token primero";
  if (msg.includes("execution reverted")) return "❌ La transacción fue revertida por el contrato";
  return `❌ ${msg.slice(0, 160)}`;
}

function useTokenBalance(tokenAddress, userAddress) {
  return useReadContract({
    address: tokenAddress || undefined,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [userAddress ?? ZERO_ADDR],
    query: { enabled: !!tokenAddress && !!userAddress, refetchInterval: 8000 },
  });
}

function TokenSelector({ label, value, onChange, exclude, allTokens, userAddress }) {
  const [search, setSearch] = useState("");
  const filtered = allTokens.filter(t =>
    t.address !== exclude &&
    (search === "" ||
      t.symbol.toLowerCase().includes(search.toLowerCase()) ||
      t.address.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="swap-token-select">
      <label>{label}</label>
      <div className="token-selector-wrap">
        <input
          className="token-search-input"
          placeholder="Buscar por símbolo o pegar dirección..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select value={value} onChange={e => { onChange(e.target.value); setSearch(""); }}>
          <option value="">-- Seleccionar token --</option>
          {filtered.map(t => (
            <option key={t.address} value={t.address}>
              {t.symbol} — {t.address.slice(0, 10)}...
              {t.custom ? " ✨" : ""}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function CustomTokenSearch({ onAdd, allTokens }) {
  const publicClient = usePublicClient();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(null);

  const lookup = useCallback(async (addr) => {
    setError("");
    setPreview(null);
    if (!addr || !isAddress(addr)) { setError("Dirección inválida"); return; }
    const checksummed = getAddress(addr);
    if (allTokens.find(t => t.address.toLowerCase() === checksummed.toLowerCase())) {
      setError("Este token ya está en la lista"); return;
    }
    setLoading(true);
    try {
      const [symbol, decimals] = await Promise.all([
        publicClient.readContract({ address: checksummed, abi: ERC20_ABI, functionName: "symbol" }),
        publicClient.readContract({ address: checksummed, abi: ERC20_ABI, functionName: "decimals" }),
      ]);
      setPreview({ address: checksummed, symbol: String(symbol), decimals: Number(decimals), custom: true });
    } catch {
      setError("No se pudo leer el token — ¿es un ERC20 válido en World Chain?");
    } finally { setLoading(false); }
  }, [publicClient, allTokens]);

  useEffect(() => {
    const v = input.trim();
    if (v.length === 42 && v.startsWith("0x")) {
      const t = setTimeout(() => lookup(v), 500);
      return () => clearTimeout(t);
    } else {
      setPreview(null); setError("");
    }
  }, [input, lookup]);

  return (
    <div className="custom-token-search">
      <label>🔍 Agregar token por dirección</label>
      <div className="staking-input-row">
        <input
          type="text"
          placeholder="0x... dirección del contrato ERC20"
          value={input}
          onChange={e => setInput(e.target.value)}
          className="token-addr-input"
        />
        {loading && <span className="loader-dot">⏳</span>}
      </div>
      {error && <p className="swap-warn">{error}</p>}
      {preview && (
        <div className="token-preview">
          <span><strong>{preview.symbol}</strong> — {preview.address.slice(0, 14)}... ({preview.decimals} decimales)</span>
          <button className="btn-primary btn-sm" onClick={() => { onAdd(preview); setInput(""); setPreview(null); }}>
            + Agregar
          </button>
        </div>
      )}
    </div>
  );
}

export default function SwapPanel() {
  const { address, isConnected } = useAccount();
  const [extraTokens, setExtraTokens] = useState([]);
  const allTokens = [...KNOWN_TOKENS, ...extraTokens];

  const [tokenIn,  setTokenIn]  = useState(KNOWN_TOKENS[0]?.address ?? "");
  const [tokenOut, setTokenOut] = useState(KNOWN_TOKENS[1]?.address ?? "");
  const [amountIn, setAmountIn] = useState("");
  const [poolFee,  setPoolFee]  = useState(3000);
  const [slippage, setSlippage] = useState("0.5");
  const [msg, setMsg] = useState("");
  const [showCustom, setShowCustom] = useState(false);

  const tokenInInfo  = allTokens.find(t => t.address === tokenIn);
  const tokenOutInfo = allTokens.find(t => t.address === tokenOut);

  const userAddr = address ?? ZERO_ADDR;

  const { data: balanceIn,  refetch: refetchBalIn }  = useTokenBalance(tokenIn,  address);
  const { data: balanceOut, refetch: refetchBalOut } = useTokenBalance(tokenOut, address);

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: tokenIn || undefined,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [userAddr, SWAP_PROXY_ADDRESS],
    query: { enabled: !!tokenIn && !!address, refetchInterval: 8000 },
  });

  const { data: feeBps, refetch: refetchFee } = useReadContract({
    address: SWAP_PROXY_ADDRESS,
    abi: SWAP_PROXY_ABI,
    functionName: "feeBps",
    query: { staleTime: 30000, refetchInterval: 30000 },
  });

  const { writeContractAsync, isPending } = useWriteContract();
  const [hash, setHash] = useState(null);
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  const busy = isPending || isConfirming;

  useEffect(() => {
    if (isSuccess) {
      refetchBalIn(); refetchBalOut(); refetchAllowance(); refetchFee();
      setMsg("✅ ¡Swap completado exitosamente!");
      setAmountIn("");
    }
  }, [isSuccess]);

  const dec  = tokenInInfo?.decimals  ?? 18;
  const decO = tokenOutInfo?.decimals ?? 18;

  const parsedAmount = amountIn ? (() => { try { return parseUnits(amountIn, dec); } catch { return 0n; } })() : 0n;
  const feeAmt   = feeBps !== undefined ? (parsedAmount * BigInt(feeBps)) / 10000n : 0n;
  const swapAmt  = parsedAmount - feeAmt;
  const slipBps  = Math.round(parseFloat(slippage || "0.5") * 100);
  const amtOutMin = swapAmt > 0n ? swapAmt - (swapAmt * BigInt(slipBps)) / 10000n : 0n;

  const needsApproval = allowance !== undefined && parsedAmount > 0n && allowance < parsedAmount;

  const handleApprove = async () => {
    if (!tokenIn) { setMsg("❌ Selecciona un token de entrada"); return; }
    setMsg("⏳ Aprobando token...");
    try {
      const tx = await writeContractAsync({
        address: tokenIn, abi: ERC20_ABI, functionName: "approve",
        args: [SWAP_PROXY_ADDRESS, maxUint256], ...GAS,
      });
      setHash(tx);
      setMsg("✅ Aprobación enviada, esperando confirmación...");
      setTimeout(() => { refetchAllowance(); setMsg(""); }, 6000);
    } catch (e) { setMsg(parseErr(e)); }
  };

  const handleSwap = async () => {
    if (!tokenIn || !tokenOut || !amountIn || parsedAmount === 0n) { setMsg("❌ Completa todos los campos"); return; }
    if (tokenIn === tokenOut) { setMsg("❌ Los tokens deben ser diferentes"); return; }
    if (!address) { setMsg("❌ Conecta tu wallet"); return; }
    setMsg("⏳ Enviando swap a Uniswap V3...");
    try {
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 300);
      const tx = await writeContractAsync({
        address: SWAP_PROXY_ADDRESS, abi: SWAP_PROXY_ABI, functionName: "swap",
        args: [tokenIn, tokenOut, parsedAmount, amtOutMin, poolFee, deadline], ...GAS,
      });
      setHash(tx);
    } catch (e) { setMsg(parseErr(e)); }
  };

  if (!isConnected) {
    return (
      <div className="swap-connect">
        <div className="swap-connect-card">
          <div className="swap-icon">🔄</div>
          <h2>Swap de Tokens</h2>
          <p>Conecta tu wallet para hacer swaps en World Chain via Uniswap V3</p>
          <WorldConnectBtn />
        </div>
      </div>
    );
  }

  return (
    <div className="swap-panel">
      <div className="swap-header">
        <h2>🔄 Swap de Tokens</h2>
        <p className="swap-subtitle">
          Via Uniswap V3 — Comisión protocolo: <strong>{feeBps !== undefined ? `${Number(feeBps) / 100}%` : "0.1%"}</strong>
        </p>
      </div>

      {msg && (
        <div className={`swap-msg ${msg.startsWith("✅") ? "success" : msg.startsWith("❌") ? "error" : "info"}`}>
          {msg}
        </div>
      )}

      <div className="swap-card">
        <TokenSelector
          label="Token de entrada (vendes)"
          value={tokenIn}
          onChange={v => { setTokenIn(v); setMsg(""); }}
          exclude={tokenOut}
          allTokens={allTokens}
          userAddress={address}
        />
        {tokenIn && address && (
          <div className="swap-balance">
            Balance: <strong>
              {balanceIn !== undefined
                ? `${fmt(balanceIn, dec)} ${tokenInInfo?.symbol ?? ""}`
                : "cargando..."}
            </strong>
            {balanceIn !== undefined && balanceIn > 0n && (
              <button className="btn-sm btn-ghost" onClick={() => setAmountIn(fmt(balanceIn, dec, 6))}>Max</button>
            )}
          </div>
        )}

        <div className="swap-amount-row">
          <label>Cantidad a intercambiar</label>
          <div className="staking-input-row">
            <input
              type="number" min="0" placeholder="0.00"
              value={amountIn} onChange={e => setAmountIn(e.target.value)}
              disabled={busy}
            />
          </div>
          {parsedAmount > 0n && feeBps !== undefined && (
            <div className="swap-fee-info">
              <span>Comisión ({Number(feeBps) / 100}%): <strong>{fmt(feeAmt, dec)} {tokenInInfo?.symbol}</strong></span>
              <span>Enviado al pool: <strong>{fmt(swapAmt, dec)} {tokenInInfo?.symbol}</strong></span>
              <span>Mínimo a recibir: <strong>{fmt(amtOutMin, decO)} {tokenOutInfo?.symbol ?? "—"}</strong></span>
            </div>
          )}
        </div>

        <div className="swap-arrow">↓</div>

        <TokenSelector
          label="Token de salida (compras)"
          value={tokenOut}
          onChange={v => { setTokenOut(v); setMsg(""); }}
          exclude={tokenIn}
          allTokens={allTokens}
          userAddress={address}
        />
        {tokenOut && address && (
          <div className="swap-balance">
            Balance: <strong>
              {balanceOut !== undefined
                ? `${fmt(balanceOut, decO)} ${tokenOutInfo?.symbol ?? ""}`
                : "cargando..."}
            </strong>
          </div>
        )}

        <div className="swap-settings">
          <div className="swap-setting">
            <label>Pool Fee Tier (Uniswap V3)</label>
            <select value={poolFee} onChange={e => setPoolFee(Number(e.target.value))}>
              {POOL_FEES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </div>
          <div className="swap-setting">
            <label>Slippage máx. (%)</label>
            <input type="number" min="0.1" max="50" step="0.1" value={slippage} onChange={e => setSlippage(e.target.value)} />
          </div>
        </div>

        <div className="swap-actions">
          {needsApproval ? (
            <button className="btn-primary swap-btn" onClick={handleApprove} disabled={busy}>
              {busy ? "⏳ Aprobando..." : `Aprobar ${tokenInInfo?.symbol ?? "token"} (ilimitado)`}
            </button>
          ) : (
            <button className="btn-success swap-btn" onClick={handleSwap} disabled={busy || !tokenIn || !tokenOut || !amountIn}>
              {busy ? "⏳ Procesando swap..." : "🔄 Hacer Swap"}
            </button>
          )}
        </div>
      </div>

      <div className="custom-token-section">
        <button className="btn-ghost btn-sm" onClick={() => setShowCustom(v => !v)}>
          {showCustom ? "▲ Ocultar" : "🔍 Agregar token personalizado por dirección"}
        </button>
        {showCustom && (
          <CustomTokenSearch
            allTokens={allTokens}
            onAdd={(t) => {
              setExtraTokens(prev => [...prev, t]);
              setShowCustom(false);
            }}
          />
        )}
        {extraTokens.length > 0 && (
          <div className="custom-tokens-list">
            <span>Tokens personalizados: </span>
            {extraTokens.map(t => (
              <span key={t.address} className="custom-token-chip">
                {t.symbol}
                <button onClick={() => setExtraTokens(prev => prev.filter(x => x.address !== t.address))}>✕</button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="swap-info-row">
        <div className="swap-info-card">
          <span>Router</span>
          <a href="https://worldscan.org/address/0x091AD9e2e6e5eD44c1c66dB50e49A601F9f36cF6" target="_blank" rel="noreferrer">Uniswap V3 ↗</a>
        </div>
        <div className="swap-info-card">
          <span>SwapProxy</span>
          <a href={`https://worldscan.org/address/${SWAP_PROXY_ADDRESS}`} target="_blank" rel="noreferrer">{SWAP_PROXY_ADDRESS.slice(0, 10)}... ↗</a>
        </div>
        <div className="swap-info-card">
          <span>Comisión protocolo</span>
          <strong>{feeBps !== undefined ? `${Number(feeBps) / 100}%` : "0.1%"}</strong>
        </div>
        <div className="swap-info-card">
          <span>Red</span>
          <span>World Chain (480)</span>
        </div>
      </div>
    </div>
  );
}
