import { useState } from "react";
import { useReadContract, useWaitForTransactionReceipt } from "wagmi";
import { useWallet } from "../context/WalletContext.jsx";
import { useMiniKitWrite } from "../hooks/useMiniKitWrite.js";
import { parseGwei, parseUnits, formatUnits, getAddress } from "viem";
import { useIsOwner, useIsPrimaryOwner } from "../hooks/useContract.js";
import ReservePanel from "../components/ReservePanel.jsx";
import OwnersPanel from "../components/OwnersPanel.jsx";
import { useContractRead } from "../hooks/useContract.js";
import { CONTRACT_ADDRESS } from "../config/contract.js";
import { ACUA_STAKING_ADDRESS, STAKING_ABI, ERC20_ABI, OWNER_ADDRESS } from "../config/staking.js";
import { WCOP_TOKEN_ADDRESS,  WCOP_STAKING_ADDRESS,  WCOP_STAKING_ABI,  WCOP_DECIMALS,  WCOP_SYMBOL  } from "../config/wcop.js";
import { USDC_TOKEN_ADDRESS,  USDC_STAKING_ADDRESS,  USDC_STAKING_ABI,  USDC_DECIMALS,  USDC_SYMBOL  } from "../config/usdc.js";
import { WLD_TOKEN_ADDRESS,   WLD_STAKING_ADDRESS,   WLD_STAKING_ABI,   WLD_DECIMALS,   WLD_SYMBOL   } from "../config/wld.js";
import { AIR_TOKEN_ADDRESS,   AIR_STAKING_ADDRESS,   AIR_STAKING_ABI,   AIR_DECIMALS,   AIR_SYMBOL   } from "../config/air.js";
import { WARS_TOKEN_ADDRESS,  WARS_STAKING_ADDRESS,  WARS_STAKING_ABI,  WARS_DECIMALS,  WARS_SYMBOL  } from "../config/wars.js";
import { BTCH2O_TOKEN_ADDRESS, BTCH2O_STAKING_ADDRESS, BTCH2O_STAKING_ABI, BTCH2O_DECIMALS, BTCH2O_SYMBOL } from "../config/btch2o.js";
import { FIRE_TOKEN_ADDRESS, FIRE_STAKING_ADDRESS, FIRE_STAKING_ABI, FIRE_DECIMALS, FIRE_SYMBOL } from "../config/fire.js";
import {
  MINING_ADDRESS, MINING_ABI, ERC20_MINIMAL_ABI,
  H2O_TOKEN_ADDRESS, WLD_TOKEN_ADDRESS as MINING_WLD
} from "../config/mining.js";
import { Link } from "react-router-dom";
import "../styles/OwnerPanel.css";
import "../styles/MiningPanel.css";

const GAS = {
  gas: 700_000n,
  maxFeePerGas: parseGwei("0.003"),
  maxPriorityFeePerGas: parseGwei("0.001"),
};

const MAXUINT256 = BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
const ZERO_ADDR  = getAddress("0x0000000000000000000000000000000000000000");

function fmt(val, dec = 18, dp = 4) {
  if (val === undefined || val === null) return "—";
  try { return parseFloat(formatUnits(BigInt(val.toString()), dec)).toFixed(dp); } catch { return "—"; }
}

// ─── SIMPLE STAKING ADMIN CARD ─────────────────────────────────────────────────
function SimpleStakingAdminCard({ name, symbol, stakingAddr, tokenAddr, decimals, abi }) {
  const { address: userAddr } = useWallet();

  const { data: aprBps,       refetch: refetchApr }  = useReadContract({ address: stakingAddr, abi, functionName: "aprBps",        query: { refetchInterval: 30000 } });
  const { data: depositFee,   refetch: refetchFees } = useReadContract({ address: stakingAddr, abi, functionName: "depositFeeBps", query: { refetchInterval: 30000 } });
  const { data: withdrawFee }  = useReadContract({ address: stakingAddr, abi, functionName: "withdrawFeeBps", query: { refetchInterval: 30000 } });
  const { data: claimFee }     = useReadContract({ address: stakingAddr, abi, functionName: "claimFeeBps",    query: { refetchInterval: 30000 } });
  const { data: rewardPool }   = useReadContract({ address: stakingAddr, abi, functionName: "rewardPool",     query: { refetchInterval: 15000 } });
  const { data: totalStaked }  = useReadContract({ address: stakingAddr, abi, functionName: "totalStaked",    query: { refetchInterval: 15000 } });
  const { data: ownerBal,      refetch: refetchOwnerBal }   = useReadContract({ address: tokenAddr, abi: ERC20_ABI, functionName: "balanceOf", args: [userAddr ?? ZERO_ADDR], query: { refetchInterval: 10000, enabled: !!userAddr } });
  const { data: allowance,     refetch: refetchAllowance }  = useReadContract({ address: tokenAddr, abi: ERC20_ABI, functionName: "allowance", args: [userAddr ?? ZERO_ADDR, stakingAddr], query: { refetchInterval: 10000, enabled: !!userAddr } });

  const { writeContractAsync, isPending } = useMiniKitWrite();
  const [hash, setHash] = useState(null);
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash });

  const [newApr, setNewApr]     = useState("");
  const [depFeeIn, setDepFeeIn] = useState("");
  const [wdFeeIn, setWdFeeIn]   = useState("");
  const [clFeeIn, setClFeeIn]   = useState("");
  const [fundAmt, setFundAmt]   = useState("");
  const [msg, setMsg] = useState("");
  const busy = isPending || isConfirming;

  const exec = async (fn) => {
    setMsg("⏳ Enviando...");
    try {
      const tx = await fn();
      setHash(tx);
      setMsg("✅ Enviado — esperando confirmación...");
      setTimeout(() => { refetchApr(); refetchFees(); refetchOwnerBal(); refetchAllowance(); setMsg(""); }, 7000);
    } catch (e) { setMsg(`❌ ${e.shortMessage || e.message?.slice(0, 140)}`); }
  };

  const parsedFund = fundAmt ? (() => { try { return parseUnits(fundAmt, decimals); } catch { return 0n; } })() : 0n;
  const needsApproval = allowance !== undefined && parsedFund > 0n && allowance < parsedFund;

  return (
    <div className="config-section" style={{ marginBottom: 28 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <h4 style={{ margin: 0 }}>{name} Staking</h4>
        <a href={`https://worldscan.org/address/${stakingAddr}`} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "var(--text-secondary)" }}>
          {stakingAddr.slice(0, 14)}... ↗
        </a>
      </div>
      {msg && <div className={`staking-msg ${msg.startsWith("✅") ? "success" : msg.startsWith("❌") ? "error" : "info"}`} style={{ marginBottom: 10 }}>{msg}</div>}

      <div className="info-grid" style={{ marginBottom: 14 }}>
        <div className="info-item"><label>APR actual</label><strong className="text-success">{aprBps !== undefined ? `${(Number(aprBps) / 100).toFixed(2)}%` : "—"}</strong></div>
        <div className="info-item"><label>Fee Depósito</label><strong>{depositFee !== undefined ? `${(Number(depositFee) / 100).toFixed(2)}%` : "—"}</strong></div>
        <div className="info-item"><label>Fee Retiro</label><strong>{withdrawFee !== undefined ? `${(Number(withdrawFee) / 100).toFixed(2)}%` : "—"}</strong></div>
        <div className="info-item"><label>Fee Claim</label><strong>{claimFee !== undefined ? `${(Number(claimFee) / 100).toFixed(2)}%` : "—"}</strong></div>
        <div className="info-item"><label>Pool Recompensas</label><strong className="text-success">{fmt(rewardPool, decimals)} {symbol}</strong></div>
        <div className="info-item"><label>Total Stakeado</label><strong>{fmt(totalStaked, decimals)} {symbol}</strong></div>
        <div className="info-item"><label>Tu Balance {symbol}</label><strong>{fmt(ownerBal, decimals)} {symbol}</strong></div>
      </div>

      <div className="config-form">
        <div className="form-group">
          <label>Cambiar APR (bps — 100 bps = 1%)</label>
          <div className="input-row">
            <input type="number" min="0" max="100000" placeholder="Ej: 1200 = 12%" value={newApr} onChange={e => setNewApr(e.target.value)} disabled={busy} />
            <button className="btn-primary btn-sm" disabled={busy || !newApr}
              onClick={() => exec(() => writeContractAsync({ address: stakingAddr, abi, functionName: "setApr", args: [BigInt(newApr)], ...GAS }))}>
              {busy ? "..." : "Actualizar APR"}
            </button>
          </div>
        </div>

        <div className="form-group">
          <label>Cambiar comisiones (bps) — Depósito / Retiro / Reclamo</label>
          <small style={{ color: "var(--text-secondary)" }}>Cada fee máximo 200 bps (2%)</small>
          <div className="input-row" style={{ gap: 6 }}>
            <input type="number" min="0" max="200" placeholder="Dep" value={depFeeIn} onChange={e => setDepFeeIn(e.target.value)} disabled={busy} style={{ width: 70 }} />
            <input type="number" min="0" max="200" placeholder="Ret" value={wdFeeIn}  onChange={e => setWdFeeIn(e.target.value)}  disabled={busy} style={{ width: 70 }} />
            <input type="number" min="0" max="200" placeholder="Clm" value={clFeeIn}  onChange={e => setClFeeIn(e.target.value)}  disabled={busy} style={{ width: 70 }} />
            <button className="btn-warning btn-sm" disabled={busy || !depFeeIn || !wdFeeIn || !clFeeIn}
              onClick={() => exec(() => writeContractAsync({ address: stakingAddr, abi, functionName: "setFees", args: [BigInt(depFeeIn), BigInt(wdFeeIn), BigInt(clFeeIn)], ...GAS }))}>
              {busy ? "..." : "Actualizar Fees"}
            </button>
          </div>
        </div>

        <div className="form-group">
          <label>Fondear pool de recompensas {symbol}</label>
          <small style={{ color: "var(--text-secondary)" }}>Tu balance: {fmt(ownerBal, decimals)} {symbol}</small>
          <div className="input-row" style={{ marginTop: 6 }}>
            <input type="number" min="0" placeholder={`Cantidad ${symbol}`} value={fundAmt} onChange={e => setFundAmt(e.target.value)} disabled={busy} />
            <button className="btn-sm btn-secondary" onClick={() => ownerBal && setFundAmt(fmt(ownerBal, decimals, 6))} disabled={!ownerBal}>Max</button>
          </div>
          {needsApproval ? (
            <button className="btn-primary btn-sm" style={{ marginTop: 8 }} disabled={busy}
              onClick={() => exec(() => writeContractAsync({ address: tokenAddr, abi: ERC20_ABI, functionName: "approve", args: [stakingAddr, MAXUINT256], ...GAS }))}>
              {busy ? "⏳ Aprobando..." : `Aprobar ${symbol} (ilimitado)`}
            </button>
          ) : (
            <button className="btn-success btn-sm" style={{ marginTop: 8 }} disabled={busy || !fundAmt || parsedFund === 0n}
              onClick={() => exec(() => writeContractAsync({ address: stakingAddr, abi, functionName: "fundRewards", args: [parsedFund], ...GAS }))}>
              {busy ? "⏳ Fondeando..." : `Fondear ${fundAmt || "0"} ${symbol}`}
            </button>
          )}
        </div>

        <div className="form-group">
          <label>Retirar comisiones acumuladas</label>
          <button className="btn-warning btn-sm" disabled={busy}
            onClick={() => exec(() => writeContractAsync({ address: stakingAddr, abi, functionName: "withdrawFees", args: [], ...GAS }))}>
            {busy ? "⏳..." : "Retirar Fees"}
          </button>
        </div>
      </div>
    </div>
  );
}

function StakingAdminPanel() {
  const POOLS = [
    { name: "USDC",   symbol: USDC_SYMBOL,   stakingAddr: USDC_STAKING_ADDRESS,  tokenAddr: USDC_TOKEN_ADDRESS,  decimals: USDC_DECIMALS,  abi: USDC_STAKING_ABI  },
    { name: "WLD",    symbol: WLD_SYMBOL,    stakingAddr: WLD_STAKING_ADDRESS,   tokenAddr: WLD_TOKEN_ADDRESS,   decimals: WLD_DECIMALS,   abi: WLD_STAKING_ABI   },
    { name: "wARS",   symbol: WARS_SYMBOL,   stakingAddr: WARS_STAKING_ADDRESS,  tokenAddr: WARS_TOKEN_ADDRESS,  decimals: WARS_DECIMALS,  abi: WARS_STAKING_ABI  },
    { name: "wCOP",   symbol: WCOP_SYMBOL,   stakingAddr: WCOP_STAKING_ADDRESS,  tokenAddr: WCOP_TOKEN_ADDRESS,  decimals: WCOP_DECIMALS,  abi: WCOP_STAKING_ABI  },
    { name: "AIR",    symbol: AIR_SYMBOL,    stakingAddr: AIR_STAKING_ADDRESS,   tokenAddr: AIR_TOKEN_ADDRESS,   decimals: AIR_DECIMALS,   abi: AIR_STAKING_ABI   },
    { name: "BTCH2O", symbol: BTCH2O_SYMBOL, stakingAddr: BTCH2O_STAKING_ADDRESS, tokenAddr: BTCH2O_TOKEN_ADDRESS, decimals: BTCH2O_DECIMALS, abi: BTCH2O_STAKING_ABI },
    { name: "🔥 FIRE", symbol: FIRE_SYMBOL, stakingAddr: FIRE_STAKING_ADDRESS, tokenAddr: FIRE_TOKEN_ADDRESS, decimals: FIRE_DECIMALS, abi: FIRE_STAKING_ABI },
  ];

  return (
    <div>
      <h3>Admin de Staking — Todos los Pools</h3>
      <p style={{ color: "var(--text-secondary)", marginBottom: 20, fontSize: 14 }}>
        Ajusta APR, comisiones y fondea los pools de recompensas de todos los contratos de staking.
      </p>
      {POOLS.map(p => (
        <SimpleStakingAdminCard key={p.name} {...p} />
      ))}
      <AirOwner2ManageSection />
    </div>
  );
}

// ─── AIR OWNER2 MANAGEMENT ────────────────────────────────────────────────────
function AirOwner2ManageSection() {
  const { data: currentOwner2 } = useReadContract({ address: AIR_STAKING_ADDRESS, abi: AIR_STAKING_ABI, functionName: "owner2", query: { refetchInterval: 15000 } });
  const { writeContractAsync, isPending } = useMiniKitWrite();
  const [hash, setHash] = useState(null);
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash });
  const [newOwner2, setNewOwner2] = useState("");
  const [msg, setMsg] = useState("");
  const busy = isPending || isConfirming;

  const exec = async (fn) => {
    setMsg("⏳ Enviando...");
    try {
      const tx = await fn();
      setHash(tx);
      setMsg("✅ Enviado — esperando confirmación...");
      setTimeout(() => setMsg(""), 7000);
    } catch (e) { setMsg(`❌ ${e.shortMessage || e.message?.slice(0, 140)}`); }
  };

  return (
    <div className="config-section" style={{ marginTop: 24, borderTop: "1px solid rgba(167,139,250,0.3)", paddingTop: 20 }}>
      <h4 style={{ margin: "0 0 12px", color: "#a78bfa" }}>👑 Gestión de Owner2 — AIR Staking</h4>
      {msg && <div className={`staking-msg ${msg.startsWith("✅") ? "success" : msg.startsWith("❌") ? "error" : "info"}`} style={{ marginBottom: 10 }}>{msg}</div>}
      <div className="info-grid" style={{ marginBottom: 14 }}>
        <div className="info-item">
          <label>Owner2 actual</label>
          <strong style={{ fontSize: 12, wordBreak: "break-all" }}>
            {currentOwner2 && currentOwner2 !== "0x0000000000000000000000000000000000000000"
              ? currentOwner2
              : "Sin asignar"}
          </strong>
        </div>
      </div>
      <div className="form-group">
        <label>Asignar nuevo Owner2 (puede fondear el pool)</label>
        <div className="input-row">
          <input
            type="text"
            placeholder="0x... dirección del nuevo owner2"
            value={newOwner2}
            onChange={e => setNewOwner2(e.target.value)}
            disabled={busy}
            style={{ fontFamily: "monospace", fontSize: 13 }}
          />
          <button className="btn-primary btn-sm" disabled={busy || !newOwner2 || !newOwner2.startsWith("0x")}
            onClick={() => {
              try {
                const addr = getAddress(newOwner2);
                exec(() => writeContractAsync({ address: AIR_STAKING_ADDRESS, abi: AIR_STAKING_ABI, functionName: "setOwner2", args: [addr], ...GAS }));
              } catch { setMsg("❌ Dirección inválida"); }
            }}>
            {busy ? "..." : "Asignar Owner2"}
          </button>
        </div>
      </div>
      <div className="form-group">
        <label>Eliminar Owner2 (dejar sin asignar)</label>
        <button className="btn-danger btn-sm" disabled={busy || !currentOwner2 || currentOwner2 === "0x0000000000000000000000000000000000000000"}
          onClick={() => exec(() => writeContractAsync({ address: AIR_STAKING_ADDRESS, abi: AIR_STAKING_ABI, functionName: "setOwner2", args: [ZERO_ADDR], ...GAS }))}>
          {busy ? "⏳..." : "Eliminar Owner2"}
        </button>
      </div>
    </div>
  );
}

// ─── ACUA FUND REWARDS PANEL ──────────────────────────────────────────────────
function AcuaFundRewardsPanel() {
  const { address } = useWallet();
  const userAddr = address ?? ZERO_ADDR;

  const minERC20 = [
    { inputs: [], name: "symbol",  outputs: [{ type: "string"  }], stateMutability: "view", type: "function" },
    { inputs: [{ name: "account", type: "address" }], name: "balanceOf", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
    { inputs: [], name: "decimals", outputs: [{ type: "uint8" }], stateMutability: "view", type: "function" },
    { inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], name: "allowance", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
    { inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], name: "approve", outputs: [{ type: "bool" }], stateMutability: "nonpayable", type: "function" },
    { inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }], name: "transfer", outputs: [{ type: "bool" }], stateMutability: "nonpayable", type: "function" },
  ];

  const { data: stakingToken }   = useReadContract({ address: ACUA_STAKING_ADDRESS, abi: STAKING_ABI, functionName: "stakingToken", query: { staleTime: 60000 } });
  const { data: tokenSymbol }    = useReadContract({ address: stakingToken, abi: minERC20, functionName: "symbol",   query: { enabled: !!stakingToken } });
  const { data: tokenDecimals }  = useReadContract({ address: stakingToken, abi: minERC20, functionName: "decimals", query: { enabled: !!stakingToken } });
  const { data: ownerBalance,    refetch: refetchOwnerBalance }    = useReadContract({ address: stakingToken, abi: minERC20, functionName: "balanceOf", args: [userAddr], query: { refetchInterval: 10000, enabled: !!stakingToken && !!address } });
  const { data: contractBalance, refetch: refetchContractBalance } = useReadContract({ address: stakingToken, abi: minERC20, functionName: "balanceOf", args: [ACUA_STAKING_ADDRESS], query: { refetchInterval: 10000, enabled: !!stakingToken } });
  const { data: allowance,       refetch: refetchAllowance }       = useReadContract({ address: stakingToken, abi: minERC20, functionName: "allowance", args: [userAddr, ACUA_STAKING_ADDRESS], query: { refetchInterval: 10000, enabled: !!stakingToken && !!address } });

  const { writeContractAsync, isPending } = useMiniKitWrite();
  const [hash, setHash] = useState(null);
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash });
  const [fundAmt, setFundAmt] = useState("");
  const [msg, setMsg] = useState("");

  const dec  = Number(tokenDecimals ?? 18);
  const busy = isPending || isConfirming;
  const sym  = tokenSymbol ?? "H2O";

  function fmtLocal(val, d = 18, dp = 4) {
    if (val === undefined || val === null) return "—";
    try { return parseFloat(formatUnits(BigInt(val.toString()), d)).toFixed(dp); } catch { return "—"; }
  }

  const parsedAmt = fundAmt ? (() => { try { return parseUnits(fundAmt, dec); } catch { return 0n; } })() : 0n;
  const needsApproval = allowance !== undefined && parsedAmt > 0n && allowance < parsedAmt;

  const exec = async (fn) => {
    setMsg("");
    try {
      const tx = await fn();
      setHash(tx);
      setMsg("⏳ Transacción enviada...");
      setTimeout(() => { refetchOwnerBalance(); refetchContractBalance(); refetchAllowance(); setMsg(""); }, 7000);
    } catch (e) { setMsg(`❌ ${e.shortMessage || e.message}`); }
  };

  return (
    <div className="config-section">
      <h3>🪙 Fondear Rewards — H2O Staking</h3>
      <p style={{ color: "var(--text-secondary)", marginBottom: 16 }}>
        Transfiere tokens <strong>{sym}</strong> al contrato de staking H2O para fondear las recompensas.
      </p>

      {msg && <div className={`staking-msg ${msg.startsWith("✅") ? "success" : msg.startsWith("❌") ? "error" : "info"}`}>{msg}</div>}

      <div className="info-grid" style={{ marginBottom: 20 }}>
        <div className="info-item">
          <label>Contrato H2O Staking</label>
          <a href={`https://worldscan.org/address/${ACUA_STAKING_ADDRESS}`} target="_blank" rel="noreferrer">{ACUA_STAKING_ADDRESS}</a>
        </div>
        <div className="info-item">
          <label>Token de Reward</label>
          <strong>{sym}</strong>{stakingToken && <a href={`https://worldscan.org/token/${stakingToken}`} target="_blank" rel="noreferrer"> (ver ↗)</a>}
        </div>
        <div className="info-item">
          <label>Tu Balance {sym}</label>
          <strong>{fmtLocal(ownerBalance, dec)} {sym}</strong>
        </div>
        <div className="info-item">
          <label>Balance del Contrato</label>
          <strong className="text-accent">{fmtLocal(contractBalance, dec)} {sym}</strong>
        </div>
      </div>

      <div className="config-form">
        <div className="form-group">
          <label>Cantidad a fondear ({sym})</label>
          <div className="input-row">
            <input
              type="number" min="0" placeholder={`Cantidad ${sym}`}
              value={fundAmt} onChange={e => setFundAmt(e.target.value)} disabled={busy || !stakingToken}
            />
            <button className="btn-sm btn-secondary" onClick={() => ownerBalance && setFundAmt(fmtLocal(ownerBalance, dec, 6))} disabled={!ownerBalance}>Max</button>
          </div>
          {needsApproval ? (
            <button className="btn-primary btn-sm" style={{ marginTop: 8 }} disabled={busy || !stakingToken}
              onClick={() => exec(() => writeContractAsync({ address: stakingToken, abi: minERC20, functionName: "approve", args: [ACUA_STAKING_ADDRESS, MAXUINT256], ...GAS }))}>
              {busy ? "⏳ Aprobando..." : `Aprobar ${sym} (ilimitado)`}
            </button>
          ) : (
            <button className="btn-success btn-sm" style={{ marginTop: 8 }} disabled={busy || !fundAmt || parsedAmt === 0n || !stakingToken}
              onClick={() => exec(() => writeContractAsync({ address: stakingToken, abi: minERC20, functionName: "transfer", args: [ACUA_STAKING_ADDRESS, parsedAmt], ...GAS }))}>
              {busy ? "⏳ Fondeando..." : `Fondear ${fundAmt || "0"} ${sym} → Contrato`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── MINING ADMIN PANEL ──────────────────────────────────────────────────────
function MiningAdminPanel() {
  const { address: userAddr } = useWallet();
  const ZERO = "0x0000000000000000000000000000000000000000";

  const { data: priceWLD,    refetch: refetchPrice }  = useReadContract({ address: MINING_ADDRESS, abi: MINING_ABI, functionName: "packagePriceWLD",   query: { refetchInterval: 30000 } });
  const { data: h2oRate,     refetch: refetchRates }  = useReadContract({ address: MINING_ADDRESS, abi: MINING_ABI, functionName: "h2oRatePerYear",    query: { refetchInterval: 30000 } });
  const { data: btch2oRate }                          = useReadContract({ address: MINING_ADDRESS, abi: MINING_ABI, functionName: "btch2oRatePerYear", query: { refetchInterval: 30000 } });
  const { data: h2oPool,     refetch: refetchPools }  = useReadContract({ address: MINING_ADDRESS, abi: MINING_ABI, functionName: "h2oPool",           query: { refetchInterval: 15000 } });
  const { data: btch2oPool }                          = useReadContract({ address: MINING_ADDRESS, abi: MINING_ABI, functionName: "btch2oPool",        query: { refetchInterval: 15000 } });
  const { data: totalPwr }                            = useReadContract({ address: MINING_ADDRESS, abi: MINING_ABI, functionName: "totalPower",        query: { refetchInterval: 30000 } });
  const { data: wldCollected }                        = useReadContract({ address: MINING_ADDRESS, abi: MINING_ABI, functionName: "wldCollected",      query: { refetchInterval: 30000 } });

  const { data: h2oBal,     refetch: rH2OBal }     = useReadContract({ address: H2O_TOKEN_ADDRESS,    abi: ERC20_MINIMAL_ABI, functionName: "balanceOf", args: [userAddr ?? ZERO], query: { refetchInterval: 15000, enabled: !!userAddr } });
  const { data: btch2oBal,  refetch: rBTCH2OBal }  = useReadContract({ address: BTCH2O_TOKEN_ADDRESS, abi: ERC20_MINIMAL_ABI, functionName: "balanceOf", args: [userAddr ?? ZERO], query: { refetchInterval: 15000, enabled: !!userAddr } });
  const { data: wldBal }                            = useReadContract({ address: MINING_WLD,           abi: ERC20_MINIMAL_ABI, functionName: "balanceOf", args: [MINING_ADDRESS],   query: { refetchInterval: 15000 } });

  const { data: h2oAllowance,    refetch: rH2OAllow }   = useReadContract({ address: H2O_TOKEN_ADDRESS,    abi: ERC20_MINIMAL_ABI, functionName: "allowance", args: [userAddr ?? ZERO, MINING_ADDRESS], query: { refetchInterval: 10000, enabled: !!userAddr } });
  const { data: btch2oAllowance, refetch: rBTCH2OAllow }= useReadContract({ address: BTCH2O_TOKEN_ADDRESS, abi: ERC20_MINIMAL_ABI, functionName: "allowance", args: [userAddr ?? ZERO, MINING_ADDRESS], query: { refetchInterval: 10000, enabled: !!userAddr } });

  const { writeContractAsync, isPending } = useMiniKitWrite();
  const [txHash, setTxHash] = useState(null);
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash: txHash });
  const busy = isPending || isConfirming;

  const [newPrice, setNewPrice]   = useState("");
  const [newH2ORate, setNewH2ORate]     = useState("");
  const [newBTCH2ORate, setNewBTCH2ORate] = useState("");
  const [fundH2OAmt, setFundH2OAmt]   = useState("");
  const [fundBTCH2OAmt, setFundBTCH2OAmt] = useState("");
  const [msg, setMsg] = useState("");

  const parsedH2OFund    = fundH2OAmt    ? (() => { try { return parseUnits(fundH2OAmt, 18); }    catch { return 0n; } })() : 0n;
  const parsedBTCH2OFund = fundBTCH2OAmt ? (() => { try { return parseUnits(fundBTCH2OAmt, 18); } catch { return 0n; } })() : 0n;
  const needsH2OApprove    = h2oAllowance    !== undefined && parsedH2OFund    > 0n && h2oAllowance    < parsedH2OFund;
  const needsBTCH2OApprove = btch2oAllowance !== undefined && parsedBTCH2OFund > 0n && btch2oAllowance < parsedBTCH2OFund;

  const exec = async (fn, refetchFns = []) => {
    setMsg("⏳ Enviando...");
    try {
      const tx = await fn();
      setTxHash(tx);
      setMsg("✅ Enviado — esperando confirmación...");
      setTimeout(() => { refetchFns.forEach(f => f()); setMsg(""); }, 7000);
    } catch (e) { setMsg(`❌ ${e.shortMessage || e.message?.slice(0, 140)}`); }
  };

  return (
    <div>
      <h3 style={{ marginBottom: 6 }}>⛏ Admin Minería H2O + BTCH2O</h3>
      <p style={{ color: "var(--text-secondary)", fontSize: 14, marginBottom: 20 }}>
        Contrato: <a href={`https://worldscan.org/address/${MINING_ADDRESS}`} target="_blank" rel="noreferrer" style={{ color: "#00d4ff" }}>{MINING_ADDRESS}</a>
      </p>

      {msg && <div className={`mining-msg ${msg.startsWith("✅") ? "success" : msg.startsWith("❌") ? "error" : "info"}`} style={{ marginBottom: 16 }}>{msg}</div>}

      {/* Pool Balance Summary */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20,
        padding: "18px 20px",
        background: "linear-gradient(135deg, rgba(0,212,255,0.06), rgba(124,58,237,0.06))",
        border: "1px solid rgba(0,212,255,0.2)", borderRadius: 12
      }}>
        <div>
          <div style={{ fontSize: 11, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Pool H2O disponible</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#00d4ff" }}>{fmt(h2oPool, 18, 2)} <span style={{ fontSize: 14 }}>H2O</span></div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Pool BTCH2O disponible</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#a78bfa" }}>{fmt(btch2oPool, 18, 2)} <span style={{ fontSize: 14 }}>BTCH2O</span></div>
        </div>
      </div>

      {/* Stats */}
      <div className="info-grid" style={{ marginBottom: 24 }}>
        <div className="info-item"><label>Precio del paquete</label><strong className="text-success">{fmt(priceWLD, 18, 2)} WLD</strong></div>
        <div className="info-item"><label>Tasa H2O/año por unidad</label><strong>{fmt(h2oRate, 18, 0)} H2O</strong></div>
        <div className="info-item"><label>Tasa BTCH2O/año por unidad</label><strong>{fmt(btch2oRate, 18, 0)} BTCH2O</strong></div>
        <div className="info-item"><label>Poder total de mineros</label><strong>{totalPwr?.toString() ?? "—"} unidades</strong></div>
        <div className="info-item"><label>WLD recaudado (contrato)</label><strong className="text-success">{fmt(wldBal, 18, 4)} WLD</strong></div>
        <div className="info-item"><label>Tu balance H2O</label><strong>{fmt(h2oBal, 18, 2)} H2O</strong></div>
        <div className="info-item"><label>Tu balance BTCH2O</label><strong>{fmt(btch2oBal, 18, 2)} BTCH2O</strong></div>
      </div>

      <div className="mining-admin-grid">
        {/* Set Price */}
        <div className="mining-admin-card">
          <h5>💰 Precio del paquete (WLD)</h5>
          <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 10 }}>Actual: {fmt(priceWLD, 18, 2)} WLD</p>
          <div className="input-row">
            <input type="number" min="0" step="0.01" placeholder="Ej: 1.5" value={newPrice} onChange={e => setNewPrice(e.target.value)} disabled={busy} />
            <button className="btn-primary btn-sm" disabled={busy || !newPrice}
              onClick={() => exec(() => writeContractAsync({ address: MINING_ADDRESS, abi: MINING_ABI, functionName: "setPackagePrice", args: [parseUnits(newPrice || "0", 18)], ...GAS }), [refetchPrice])}>
              {busy ? "..." : "Actualizar"}
            </button>
          </div>
        </div>

        {/* Set Rates */}
        <div className="mining-admin-card">
          <h5>📈 Tasas de recompensa anual por unidad</h5>
          <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 10 }}>H2O: {fmt(h2oRate, 18, 0)} | BTCH2O: {fmt(btch2oRate, 18, 0)}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <input type="number" min="0" placeholder="H2O por año" value={newH2ORate} onChange={e => setNewH2ORate(e.target.value)} disabled={busy} />
            <input type="number" min="0" placeholder="BTCH2O por año" value={newBTCH2ORate} onChange={e => setNewBTCH2ORate(e.target.value)} disabled={busy} />
            <button className="btn-primary btn-sm" disabled={busy || !newH2ORate || !newBTCH2ORate}
              onClick={() => exec(() => writeContractAsync({
                address: MINING_ADDRESS, abi: MINING_ABI, functionName: "setRewardRates",
                args: [parseUnits(newH2ORate || "0", 18), parseUnits(newBTCH2ORate || "0", 18)],
                ...GAS
              }), [refetchRates])}>
              {busy ? "..." : "Actualizar Tasas"}
            </button>
          </div>
        </div>

        {/* Fund H2O */}
        <div className="mining-admin-card">
          <h5>💧 Fondear Pool H2O</h5>
          <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 10 }}>Tu balance: {fmt(h2oBal, 18, 2)} H2O</p>
          <div className="input-row">
            <input type="number" min="0" placeholder="Cantidad H2O" value={fundH2OAmt} onChange={e => setFundH2OAmt(e.target.value)} disabled={busy} />
          </div>
          <div style={{ marginTop: 8 }}>
            {needsH2OApprove ? (
              <button className="btn-primary btn-sm" disabled={busy}
                onClick={() => exec(() => writeContractAsync({ address: H2O_TOKEN_ADDRESS, abi: ERC20_MINIMAL_ABI, functionName: "approve", args: [MINING_ADDRESS, BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff")], ...GAS }), [rH2OAllow])}>
                {busy ? "⏳..." : "Aprobar H2O"}
              </button>
            ) : (
              <button className="btn-success btn-sm" disabled={busy || parsedH2OFund === 0n}
                onClick={() => exec(() => writeContractAsync({ address: MINING_ADDRESS, abi: MINING_ABI, functionName: "fundH2O", args: [parsedH2OFund], ...GAS }), [refetchPools, rH2OBal])}>
                {busy ? "⏳..." : `Fondear H2O`}
              </button>
            )}
          </div>
        </div>

        {/* Fund BTCH2O */}
        <div className="mining-admin-card">
          <h5>₿ Fondear Pool BTCH2O</h5>
          <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 10 }}>Tu balance: {fmt(btch2oBal, 18, 2)} BTCH2O</p>
          <div className="input-row">
            <input type="number" min="0" placeholder="Cantidad BTCH2O" value={fundBTCH2OAmt} onChange={e => setFundBTCH2OAmt(e.target.value)} disabled={busy} />
          </div>
          <div style={{ marginTop: 8 }}>
            {needsBTCH2OApprove ? (
              <button className="btn-primary btn-sm" disabled={busy}
                onClick={() => exec(() => writeContractAsync({ address: BTCH2O_TOKEN_ADDRESS, abi: ERC20_MINIMAL_ABI, functionName: "approve", args: [MINING_ADDRESS, BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff")], ...GAS }), [rBTCH2OAllow])}>
                {busy ? "⏳..." : "Aprobar BTCH2O"}
              </button>
            ) : (
              <button className="btn-success btn-sm" disabled={busy || parsedBTCH2OFund === 0n}
                onClick={() => exec(() => writeContractAsync({ address: MINING_ADDRESS, abi: MINING_ABI, functionName: "fundBTCH2O", args: [parsedBTCH2OFund], ...GAS }), [refetchPools, rBTCH2OBal])}>
                {busy ? "⏳..." : `Fondear BTCH2O`}
              </button>
            )}
          </div>
        </div>

        {/* Withdraw WLD */}
        <div className="mining-admin-card">
          <h5>💸 Retirar WLD recaudado</h5>
          <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 10 }}>WLD en contrato: {fmt(wldBal, 18, 4)} WLD</p>
          <button className="btn-warning btn-sm" disabled={busy || !wldBal || wldBal === 0n}
            onClick={() => exec(() => writeContractAsync({ address: MINING_ADDRESS, abi: MINING_ABI, functionName: "withdrawWLD", args: [], ...GAS }))}>
            {busy ? "⏳..." : "Retirar WLD"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── OWNER PANEL ─────────────────────────────────────────────────────────────
const TABS = [
  { id: "mining",     label: "⛏ Minería"         },
  { id: "stakeadmin", label: "📊 Admin Staking"  },
  { id: "positions",  label: "📍 Posiciones"      },
  { id: "reserves",   label: "💰 Reservas"        },
  { id: "fund",       label: "🪙 Fondear H2O"     },
  { id: "owners",     label: "👥 Owners"          },
  { id: "contracts",  label: "📄 Contratos"       },
];

export default function OwnerPanel() {
  const { address, isConnected } = useWallet();
  const isOwner   = useIsOwner();
  const isPrimary = useIsPrimaryOwner();
  const [tab, setTab] = useState("mining");

  const { data: positions } = useContractRead("getManagedPositions", [], true);
  const { data: wld }     = useContractRead("WLD");
  const { data: primary } = useContractRead("primaryOwner");

  const { connect, isConnecting } = useWallet();

  if (!isConnected) return (
    <div className="owner-locked">
      <h2>🔒 Acceso Restringido</h2>
      <p>Conecta tu wallet para continuar.</p>
      <button className="connect-world-app-btn" onClick={connect} disabled={isConnecting} style={{ marginTop: 16 }}>
        <svg viewBox="0 0 40 40" width="20" height="20">
          <circle cx="20" cy="20" r="19" fill="#000" stroke="#fff" strokeWidth="2"/>
          <circle cx="20" cy="20" r="11" fill="none" stroke="#fff" strokeWidth="2.5"/>
          <circle cx="20" cy="20" r="4" fill="#fff"/>
        </svg>
        {isConnecting ? "Conectando..." : "Conectar con World App"}
      </button>
    </div>
  );

  if (!isOwner) return (
    <div className="owner-locked">
      <h2>🔒 Sin Permisos</h2>
      <p>Tu wallet (<code>{address?.slice(0, 10)}...</code>) no tiene permisos de administración.</p>
      <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>Solo el owner del contrato puede acceder a este panel.</p>
      <Link to="/" className="btn-secondary">Volver al Dashboard</Link>
    </div>
  );

  return (
    <div className="owner-panel">
      <div className="owner-header">
        <div>
          <h1>Panel de Owner</h1>
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            {isPrimary && <span className="primary-badge">⭐ Primary Owner</span>}
            <span className="primary-badge" style={{ background: "rgba(16,185,129,0.2)", color: "#10b981" }}>🔑 Owner Verificado</span>
          </div>
        </div>
      </div>

      <div className="tab-bar">
        {TABS.map(t => (
          <button key={t.id} className={`tab-btn ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="tab-content">
        {tab === "mining"     && <MiningAdminPanel />}
        {tab === "stakeadmin" && <StakingAdminPanel />}
        {tab === "reserves"   && <ReservePanel />}
        {tab === "owners"     && <OwnersPanel />}
        {tab === "fund"       && <AcuaFundRewardsPanel />}

        {tab === "positions" && (
          <div className="positions-owner">
            <div className="section-header">
              <h3>Posiciones Gestionadas</h3>
            </div>
            {positions?.length === 0 && <p className="empty">Sin posiciones gestionadas actualmente.</p>}
            <div className="positions-list">
              {positions?.map(id => (
                <div key={id.toString()} className="pos-row">
                  <span>NFT #{id.toString()}</span>
                  <a href={`https://worldscan.org/token/0xec12a9F9a09f50550686363766Cc153D03c27b5e?a=${id.toString()}`} target="_blank" rel="noreferrer" className="btn-secondary btn-xs">Worldscan</a>
                  <a href={`https://app.uniswap.org/positions/${id.toString()}`} target="_blank" rel="noreferrer" className="btn-secondary btn-xs">Uniswap</a>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "contracts" && (
          <div className="contracts-info">
            <h3>Información de Contratos</h3>
            <div className="info-grid">
              <div className="info-item"><label>AutoReinvestBot V6</label><a href={`https://worldscan.org/address/${CONTRACT_ADDRESS}`} target="_blank" rel="noreferrer">{CONTRACT_ADDRESS}</a></div>
              <div className="info-item"><label>H2O Mining</label><a href={`https://worldscan.org/address/${MINING_ADDRESS}`} target="_blank" rel="noreferrer" style={{ color: "#00d4ff" }}>{MINING_ADDRESS}</a></div>
              <div className="info-item"><label>H2O Staking</label><a href={`https://worldscan.org/address/${ACUA_STAKING_ADDRESS}`} target="_blank" rel="noreferrer">{ACUA_STAKING_ADDRESS}</a></div>
              <div className="info-item"><label>USDC Staking</label><a href={`https://worldscan.org/address/${USDC_STAKING_ADDRESS}`} target="_blank" rel="noreferrer">{USDC_STAKING_ADDRESS}</a></div>
              <div className="info-item"><label>WLD Staking</label><a href={`https://worldscan.org/address/${WLD_STAKING_ADDRESS}`} target="_blank" rel="noreferrer">{WLD_STAKING_ADDRESS}</a></div>
              <div className="info-item"><label>wARS Staking</label><a href={`https://worldscan.org/address/${WARS_STAKING_ADDRESS}`} target="_blank" rel="noreferrer">{WARS_STAKING_ADDRESS}</a></div>
              <div className="info-item"><label>wCOP Staking</label><a href={`https://worldscan.org/address/${WCOP_STAKING_ADDRESS}`} target="_blank" rel="noreferrer">{WCOP_STAKING_ADDRESS}</a></div>
              <div className="info-item"><label>AIR Staking</label><a href={`https://worldscan.org/address/${AIR_STAKING_ADDRESS}`} target="_blank" rel="noreferrer">{AIR_STAKING_ADDRESS}</a></div>
              <div className="info-item"><label>BTCH2O Staking</label><a href={`https://worldscan.org/address/${BTCH2O_STAKING_ADDRESS}`} target="_blank" rel="noreferrer">{BTCH2O_STAKING_ADDRESS}</a></div>
              <div className="info-item"><label>Fee / Dueño</label><span>{OWNER_ADDRESS}</span></div>
              <div className="info-item"><label>Primary Owner</label><a href={`https://worldscan.org/address/${primary}`} target="_blank" rel="noreferrer">{primary}</a></div>
              <div className="info-item"><label>Token WLD</label><a href={`https://worldscan.org/token/${wld}`} target="_blank" rel="noreferrer">{wld}</a></div>
              <div className="info-item"><label>Network</label><span>World Chain — Chain ID: 480</span></div>
            </div>
            <div className="external-links">
              <h4>Links útiles</h4>
              <a href={`https://worldscan.org/address/${CONTRACT_ADDRESS}#code`} target="_blank" rel="noreferrer" className="btn-secondary">Ver código Bot ↗</a>
              <a href="https://app.uniswap.org/positions" target="_blank" rel="noreferrer" className="btn-secondary">Mis posiciones Uniswap ↗</a>
              <a href={`https://worldscan.org/address/${MINING_ADDRESS}`} target="_blank" rel="noreferrer" className="btn-secondary">Ver Mining Contract ↗</a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
