import { useState } from "react";
import {
  useReadContract, useWaitForTransactionReceipt
} from "wagmi";
import { useWallet } from "../context/WalletContext.jsx";
import { useMiniKitWrite } from "../hooks/useMiniKitWrite.js";
import { formatUnits, parseUnits, parseGwei, getAddress } from "viem";
import { ACUA_STAKING_ADDRESS, STAKING_ABI, ERC20_ABI } from "../config/staking.js";
import { SUSHI_TOKEN_ADDRESS, SUSHI_STAKING_ADDRESS, SUSHI_TOKEN_ABI, SUSHI_STAKING_ABI } from "../config/sushi.js";
import { TIME_TOKEN_ADDRESS, TIME_TOKEN_ABI, TIME_STAKING_ADDRESS, TIME_STAKING_ABI, WLD_TOKEN_ADDRESS } from "../config/time.js";
import { USDC_TOKEN_ADDRESS, USDC_STAKING_ADDRESS, USDC_TOKEN_ABI, USDC_STAKING_ABI, USDC_DECIMALS } from "../config/usdc.js";
import { WLD_STAKING_ADDRESS, WLD_STAKING_ABI, WLD_TOKEN_ABI, WLD_DECIMALS } from "../config/wld.js";
import { WARS_TOKEN_ADDRESS, WARS_STAKING_ADDRESS, WARS_TOKEN_ABI, WARS_STAKING_ABI, WARS_DECIMALS } from "../config/wars.js";
import { WCOP_TOKEN_ADDRESS, WCOP_STAKING_ADDRESS, WCOP_TOKEN_ABI, WCOP_STAKING_ABI, WCOP_DECIMALS } from "../config/wcop.js";
import { AIR_TOKEN_ADDRESS, AIR_STAKING_ADDRESS, AIR_TOKEN_ABI, AIR_STAKING_ABI, AIR_DECIMALS } from "../config/air.js";
import { BTCH2O_TOKEN_ADDRESS, BTCH2O_STAKING_ADDRESS, BTCH2O_TOKEN_ABI, BTCH2O_STAKING_ABI, BTCH2O_DECIMALS } from "../config/btch2o.js";
import { FIRE_TOKEN_ADDRESS, FIRE_STAKING_ADDRESS, FIRE_TOKEN_ABI, FIRE_STAKING_ABI, FIRE_DECIMALS } from "../config/fire.js";
import "../styles/StakingPanel.css";

const MAXUINT256 = BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
const ZERO_ADDR  = getAddress("0x0000000000000000000000000000000000000000");

const GAS = {
  gas:                  700_000n,
  maxFeePerGas:         parseGwei("0.003"),
  maxPriorityFeePerGas: parseGwei("0.001"),
};

function fmt(val, dec = 18, dp = 4) {
  if (val === undefined || val === null) return "—";
  try { return parseFloat(formatUnits(BigInt(val.toString()), dec)).toFixed(dp); }
  catch { return "—"; }
}

// bps: basis points on-chain (e.g. 1200 = 12% APR)
function aprBpsToDisplay(bps) {
  if (bps === undefined || bps === null) return { apr: "—", apy: "—" };
  const aprPct = Number(bps) / 100;                                   // e.g. 12.00
  const apy    = (Math.pow(1 + (aprPct / 100) / 365, 365) - 1) * 100; // daily compounding
  return { apr: aprPct.toFixed(2), apy: apy.toFixed(2) };
}

function parseErr(e) {
  const msg = e?.shortMessage || e?.message || String(e);
  const low = msg.toLowerCase();
  if (low.includes("user rejected") || low.includes("rejected the request") || low.includes("denied transaction"))
    return "❌ Transacción rechazada por el usuario";
  if (low.includes("insufficient funds") || low.includes("insufficient balance"))
    return "❌ ETH insuficiente para pagar el gas en World Chain";
  if (low.includes("max fee per gas less than block base fee") || low.includes("maxfeepergas too low") || low.includes("fee too low"))
    return "❌ Gas fee demasiado bajo para la red — reintenta en un momento";
  if (low.includes("nonce too low") || low.includes("nonce has already been used"))
    return "❌ Nonce inválido — espera que la transacción anterior confirme";
  if (low.includes("replacement transaction underpriced"))
    return "❌ Transacción pendiente — espera confirmación antes de reintentar";
  if (low.includes("allowance") || low.includes("insufficient allowance"))
    return "❌ Necesitas aprobar el token antes de depositar";
  if (low.includes("zero amount") || low.includes("amount must be greater"))
    return "❌ La cantidad debe ser mayor a 0";
  if (low.includes("insufficient staked") || low.includes("exceeds staked"))
    return "❌ Cantidad a retirar supera tu balance stakeado";
  if (low.includes("no rewards") || low.includes("nothing to claim"))
    return "❌ No hay recompensas disponibles para reclamar";
  if (low.includes("execution reverted")) {
    const inner = msg.match(/reverted: (.+)/)?.[1] || msg.match(/reason: (.+)/)?.[1] || msg.match(/"message":"(.+?)"/)?.[1];
    return `❌ Contrato rechazó la transacción${inner ? `: ${inner}` : ""}`;
  }
  if (low.includes("timeout") || low.includes("network"))
    return "❌ Error de red — verifica tu conexión y reintenta";
  return `❌ ${msg.slice(0, 150)}`;
}

function TxMsg({ msg }) {
  if (!msg) return null;
  const cls = msg.startsWith("✅") ? "success" : msg.startsWith("❌") ? "error" : "info";
  return <div className={`staking-msg ${cls}`}>{msg}</div>;
}

function ApproveBtn({ tokenAddress, spender, label, onDone }) {
  const { writeContractAsync, isPending } = useMiniKitWrite();
  const [hash, setHash] = useState(null);
  const { isLoading } = useWaitForTransactionReceipt({ hash });
  const [msg, setMsg] = useState("");

  const handleApprove = async () => {
    setMsg("Aprobando token...");
    try {
      const tx = await writeContractAsync({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [spender, MAXUINT256],
        txMeta: {
          label:  label || "Aprobar token para staking",
          amount: "Ilimitado",
          token:  "",
        },
      });
      setHash(tx);
      setMsg("✅ Aprobación enviada, esperando confirmación...");
      if (onDone) setTimeout(() => { onDone(); setMsg(""); }, 5000);
    } catch (e) { setMsg(parseErr(e)); }
  };

  return (
    <div>
      {msg && <TxMsg msg={msg} />}
      <button className="btn-primary staking-btn" onClick={handleApprove} disabled={isPending || isLoading}>
        {isPending || isLoading ? "⏳ Aprobando..." : label || "Aprobar Token"}
      </button>
    </div>
  );
}

// ─── ACUA / H2O STAKING ───────────────────────────────────────────────────────
function AcuaStakingCard() {
  const { address, isConnected } = useWallet();
  const userAddr = address ?? ZERO_ADDR;

  const minERC20 = [
    { inputs: [], name: "symbol", outputs: [{ type: "string" }], stateMutability: "view", type: "function" },
    { inputs: [{ name: "account", type: "address" }], name: "balanceOf", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
    { inputs: [], name: "decimals", outputs: [{ type: "uint8" }], stateMutability: "view", type: "function" },
    { inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], name: "allowance", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  ];

  const { data: stakingToken } = useReadContract({ address: ACUA_STAKING_ADDRESS, abi: STAKING_ABI, functionName: "stakingToken", query: { staleTime: 60000 } });
  const { data: apr }          = useReadContract({ address: ACUA_STAKING_ADDRESS, abi: STAKING_ABI, functionName: "apr",          query: { refetchInterval: 60000 } });
  const { data: stakedBalance, refetch: refetchStaked }   = useReadContract({ address: ACUA_STAKING_ADDRESS, abi: STAKING_ABI, functionName: "stakedBalance", args: [userAddr], query: { refetchInterval: 8000, enabled: !!address } });
  const { data: pendingRewards, refetch: refetchRewards } = useReadContract({ address: ACUA_STAKING_ADDRESS, abi: STAKING_ABI, functionName: "pendingRewards", args: [userAddr], query: { refetchInterval: 8000, enabled: !!address } });

  const { data: tokenSymbol }   = useReadContract({ address: stakingToken, abi: minERC20, functionName: "symbol",   query: { enabled: !!stakingToken } });
  const { data: tokenDecimals } = useReadContract({ address: stakingToken, abi: minERC20, functionName: "decimals", query: { enabled: !!stakingToken } });
  const { data: tokenBalance,   refetch: refetchBalance }   = useReadContract({ address: stakingToken, abi: minERC20, functionName: "balanceOf",  args: [userAddr], query: { refetchInterval: 8000, enabled: !!stakingToken && !!address } });
  const { data: allowance,      refetch: refetchAllowance } = useReadContract({ address: stakingToken, abi: minERC20, functionName: "allowance", args: [userAddr, ACUA_STAKING_ADDRESS], query: { refetchInterval: 8000, enabled: !!stakingToken && !!address } });

  const { writeContractAsync, isPending } = useMiniKitWrite();
  const [hash, setHash] = useState(null);
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash });
  const [stakeAmt, setStakeAmt]     = useState("");
  const [unstakeAmt, setUnstakeAmt] = useState("");
  const [msg, setMsg] = useState("");

  const dec  = Number(tokenDecimals ?? 18);
  const busy = isPending || isConfirming;
  const refetchAll = () => { refetchStaked(); refetchRewards(); refetchBalance(); refetchAllowance(); };

  const needsApproval = (amtStr) => {
    if (allowance === undefined || !amtStr) return false;
    try { return allowance < parseUnits(amtStr, dec); } catch { return false; }
  };

  const exec = async (fn) => {
    setMsg("");
    try {
      const tx = await fn();
      setHash(tx);
      setMsg("⏳ Transacción enviada, esperando confirmación...");
      setTimeout(() => { refetchAll(); setMsg(""); }, 6000);
    } catch (e) { setMsg(parseErr(e)); }
  };

  if (!isConnected) return <p className="staking-connect-hint">Conecta tu wallet para gestionar tu H2O stake.</p>;

  return (
    <div className="staking-card">
      <div className="staking-card-header">
        <h3>H2O Staking</h3>
        <span className="staking-label">Earn APR</span>
      </div>
      <TxMsg msg={msg} />
      {(() => { const { apr: aprPct, apy } = aprBpsToDisplay(apr); return (
      <div className="staking-stats">
        <div className="staking-stat"><span>APR</span><strong className="text-success">{aprPct}%</strong></div>
        <div className="staking-stat"><span>APY (diario)</span><strong className="text-accent">{apy}%</strong></div>
        <div className="staking-stat"><span>Tu Stake</span><strong>{fmt(stakedBalance, dec)} {tokenSymbol ?? "—"}</strong></div>
        <div className="staking-stat"><span>Recompensas</span><strong className="text-accent">{fmt(pendingRewards, dec)} {tokenSymbol ?? ""}</strong></div>
        <div className="staking-stat"><span>Wallet</span><strong>{fmt(tokenBalance, dec)} {tokenSymbol ?? "—"}</strong></div>
      </div>
      ); })()}
      <div className="staking-actions">
        <div className="staking-section">
          <label>Depositar (Stake)</label>
          <div className="staking-input-row">
            <input type="number" min="0" placeholder={`Cantidad ${tokenSymbol ?? ""}`} value={stakeAmt} onChange={e => setStakeAmt(e.target.value)} disabled={busy} />
            <button className="btn-sm btn-secondary" onClick={() => tokenBalance && setStakeAmt(fmt(tokenBalance, dec, 6))} disabled={!tokenBalance}>Max</button>
          </div>
          {stakeAmt && needsApproval(stakeAmt) ? (
            <ApproveBtn tokenAddress={stakingToken} spender={ACUA_STAKING_ADDRESS} label="Aprobar H2O (ilimitado)" onDone={refetchAllowance} />
          ) : (
            <button className="btn-primary staking-btn" disabled={busy || !stakeAmt || !stakingToken}
              onClick={() => exec(async () => {
                setMsg("⏳ Haciendo stake...");
                const tx = await writeContractAsync({ address: ACUA_STAKING_ADDRESS, abi: STAKING_ABI, functionName: "stake", args: [parseUnits(stakeAmt, dec)], txMeta: { label: "Depositar para Staking H2O", amount: stakeAmt, token: tokenSymbol ?? "H2O" } });
                setStakeAmt(""); return tx;
              })}>
              {busy ? "⏳ Procesando..." : "Depositar"}
            </button>
          )}
        </div>

        <div className="staking-section">
          <label>Retirar (Unstake)</label>
          <div className="staking-input-row">
            <input type="number" min="0" placeholder={`Cantidad ${tokenSymbol ?? ""}`} value={unstakeAmt} onChange={e => setUnstakeAmt(e.target.value)} disabled={busy} />
            <button className="btn-sm btn-secondary" onClick={() => stakedBalance && setUnstakeAmt(fmt(stakedBalance, dec, 6))} disabled={!stakedBalance}>Max</button>
          </div>
          <button className="btn-warning staking-btn" disabled={busy || !unstakeAmt}
            onClick={() => exec(async () => {
              setMsg("⏳ Retirando...");
              const tx = await writeContractAsync({
                address: ACUA_STAKING_ADDRESS, abi: STAKING_ABI, functionName: "unstake",
                args: [parseUnits(unstakeAmt, dec)],
                txMeta: { label: "Retirar del Staking H2O", amount: unstakeAmt, token: tokenSymbol ?? "H2O" },
              });
              setUnstakeAmt(""); return tx;
            })}>
            {busy ? "⏳ Procesando..." : "Retirar"}
          </button>
        </div>

        <div className="staking-section staking-claim">
          <div className="claim-info">
            <span>Recompensas disponibles</span>
            <strong className="text-success">{fmt(pendingRewards, dec)} {tokenSymbol ?? ""}</strong>
          </div>
          <button className="btn-success staking-claim-btn" disabled={busy || !pendingRewards || pendingRewards === 0n}
            onClick={() => exec(async () => {
              setMsg("⏳ Reclamando recompensas...");
              const tx = await writeContractAsync({ address: ACUA_STAKING_ADDRESS, abi: STAKING_ABI, functionName: "claim", args: [], txMeta: { label: "Reclamar recompensas de Staking H2O", amount: fmt(pendingRewards, dec), token: tokenSymbol ?? "H2O" } });
              return tx;
            })}>
            {busy ? "⏳ ..." : "Reclamar Recompensas"}
          </button>
        </div>
      </div>
      <div className="staking-footer">
        <a href={`https://worldscan.org/address/${ACUA_STAKING_ADDRESS}`} target="_blank" rel="noreferrer" className="staking-link">Ver contrato ↗</a>
        {stakingToken && <a href={`https://worldscan.org/token/${stakingToken}`} target="_blank" rel="noreferrer" className="staking-link">Ver token {tokenSymbol} ↗</a>}
      </div>
    </div>
  );
}

// ─── TIME STAKING ─────────────────────────────────────────────────────────────
function TimeStakingCard() {
  const { address, isConnected } = useWallet();
  const userAddr = address ?? ZERO_ADDR;

  const { data: stakedBalance, refetch: refetchStaked }   = useReadContract({ address: TIME_STAKING_ADDRESS, abi: TIME_STAKING_ABI, functionName: "stakedBalance",  args: [userAddr], query: { refetchInterval: 8000, enabled: !!address } });
  const { data: pendingWLD,    refetch: refetchPending }  = useReadContract({ address: TIME_STAKING_ADDRESS, abi: TIME_STAKING_ABI, functionName: "pendingWldReward",args: [userAddr], query: { refetchInterval: 8000, enabled: !!address } });
  const { data: totalStaked }                             = useReadContract({ address: TIME_STAKING_ADDRESS, abi: TIME_STAKING_ABI, functionName: "totalStaked",                       query: { refetchInterval: 30000 } });
  const { data: timeBalance, refetch: refetchBalance }    = useReadContract({ address: TIME_TOKEN_ADDRESS,   abi: TIME_TOKEN_ABI,   functionName: "balanceOf",       args: [userAddr], query: { refetchInterval: 8000, enabled: !!address } });
  const { data: allowance,   refetch: refetchAllowance }  = useReadContract({ address: TIME_TOKEN_ADDRESS,   abi: TIME_TOKEN_ABI,   functionName: "allowance",       args: [userAddr, TIME_STAKING_ADDRESS], query: { refetchInterval: 8000, enabled: !!address } });
  const { data: wldBalance }                              = useReadContract({
    address: WLD_TOKEN_ADDRESS,
    abi: [{ inputs: [{ name: "account", type: "address" }], name: "balanceOf", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" }],
    functionName: "balanceOf", args: [userAddr], query: { refetchInterval: 8000, enabled: !!address },
  });

  const { writeContractAsync, isPending } = useMiniKitWrite();
  const [hash, setHash] = useState(null);
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash });
  const [stakeAmt, setStakeAmt]     = useState("");
  const [unstakeAmt, setUnstakeAmt] = useState("");
  const [msg, setMsg] = useState("");

  const busy = isPending || isConfirming;
  const refetchAll = () => { refetchStaked(); refetchPending(); refetchBalance(); refetchAllowance(); };

  const needsApproval = (amtStr) => {
    if (allowance === undefined || !amtStr) return false;
    try { return allowance < parseUnits(amtStr, 18); } catch { return false; }
  };

  const exec = async (fn) => {
    setMsg("");
    try {
      const tx = await fn();
      setHash(tx);
      setMsg("⏳ Transacción enviada, esperando confirmación...");
      setTimeout(() => { refetchAll(); setMsg(""); }, 6000);
    } catch (e) { setMsg(parseErr(e)); }
  };

  if (!isConnected) return <p className="staking-connect-hint">Conecta tu wallet para gestionar tu TIME stake.</p>;

  return (
    <div className="staking-card">
      <div className="staking-card-header">
        <h3>TIME Staking</h3>
        <span className="staking-label time-label">Earn WLD · Directo</span>
      </div>
      <TxMsg msg={msg} />
      <div className="staking-stats">
        <div className="staking-stat"><span>Tu TIME Stakeado</span><strong>{fmt(stakedBalance)} TIME</strong></div>
        <div className="staking-stat"><span>WLD Pendiente</span><strong className="text-accent">{fmt(pendingWLD)} WLD</strong></div>
        <div className="staking-stat"><span>Total Stakeado (global)</span><strong>{fmt(totalStaked)} TIME</strong></div>
        <div className="staking-stat"><span>Wallet TIME</span><strong>{fmt(timeBalance)} TIME</strong></div>
        <div className="staking-stat"><span>Wallet WLD</span><strong>{fmt(wldBalance)} WLD</strong></div>
      </div>
      <div className="staking-actions">
        <div className="staking-section">
          <label>Depositar TIME</label>
          <div className="staking-input-row">
            <input type="number" min="0" placeholder="Cantidad TIME" value={stakeAmt} onChange={e => setStakeAmt(e.target.value)} disabled={busy} />
            <button className="btn-sm btn-secondary" onClick={() => timeBalance && setStakeAmt(fmt(timeBalance, 18, 6))} disabled={!timeBalance}>Max</button>
          </div>
          {stakeAmt && needsApproval(stakeAmt) ? (
            <ApproveBtn tokenAddress={TIME_TOKEN_ADDRESS} spender={TIME_STAKING_ADDRESS} label="Aprobar TIME (ilimitado)" onDone={refetchAllowance} />
          ) : (
            <button className="btn-primary staking-btn" disabled={busy || !stakeAmt}
              onClick={() => exec(async () => {
                setMsg("⏳ Stakeando TIME...");
                const tx = await writeContractAsync({
                  address: TIME_STAKING_ADDRESS, abi: TIME_STAKING_ABI, functionName: "stake",
                  args: [parseUnits(stakeAmt, 18)],
                  txMeta: { label: "Depositar para Staking TIME", amount: stakeAmt, token: "TIME" },
                });
                setStakeAmt(""); return tx;
              })}>
              {busy ? "⏳ Procesando..." : "Depositar TIME"}
            </button>
          )}
        </div>

        <div className="staking-section">
          <label>Retirar TIME (Unstake)</label>
          <div className="staking-input-row">
            <input type="number" min="0" placeholder="Cantidad TIME" value={unstakeAmt} onChange={e => setUnstakeAmt(e.target.value)} disabled={busy} />
            <button className="btn-sm btn-secondary" onClick={() => stakedBalance && setUnstakeAmt(fmt(stakedBalance, 18, 6))} disabled={!stakedBalance}>Max</button>
          </div>
          <button className="btn-warning staking-btn" disabled={busy || !unstakeAmt}
            onClick={() => exec(async () => {
              setMsg("⏳ Retirando TIME...");
              const tx = await writeContractAsync({
                address: TIME_STAKING_ADDRESS, abi: TIME_STAKING_ABI, functionName: "unstake",
                args: [parseUnits(unstakeAmt, 18)],
                txMeta: { label: "Retirar del Staking TIME", amount: unstakeAmt, token: "TIME" },
              });
              setUnstakeAmt(""); return tx;
            })}>
            {busy ? "⏳ Procesando..." : "Retirar TIME"}
          </button>
        </div>

        <div className="staking-section staking-claim">
          <div className="claim-info">
            <span>WLD acumulado para reclamar</span>
            <strong className="text-success">{fmt(pendingWLD)} WLD</strong>
          </div>
          <button className="btn-success staking-claim-btn" disabled={busy || !pendingWLD || pendingWLD === 0n}
            onClick={() => exec(async () => {
              setMsg("⏳ Reclamando WLD...");
              const tx = await writeContractAsync({
                address: TIME_STAKING_ADDRESS, abi: TIME_STAKING_ABI, functionName: "claimWldReward",
                args: [],
                txMeta: { label: "Reclamar recompensas WLD de Staking TIME", amount: fmt(pendingWLD), token: "WLD" },
              });
              return tx;
            })}>
            {busy ? "⏳ ..." : "Reclamar WLD"}
          </button>
        </div>
      </div>
      <div className="staking-footer">
        <a href={`https://worldscan.org/address/${TIME_STAKING_ADDRESS}`} target="_blank" rel="noreferrer" className="staking-link">Ver contrato TIME ↗</a>
        <a href={`https://worldscan.org/token/${TIME_TOKEN_ADDRESS}`} target="_blank" rel="noreferrer" className="staking-link">Ver token TIME ↗</a>
      </div>
    </div>
  );
}

// ─── SUSHI STAKING ────────────────────────────────────────────────────────────
function SushiStakingCard() {
  const { address, isConnected } = useWallet();
  const userAddr = address ?? ZERO_ADDR;

  const { data: userInfo, refetch: refetchInfo }         = useReadContract({ address: SUSHI_STAKING_ADDRESS, abi: SUSHI_STAKING_ABI, functionName: "getUserInfo",   args: [userAddr], query: { refetchInterval: 8000, enabled: !!address } });
  const { data: currentReward, refetch: refetchReward }  = useReadContract({ address: SUSHI_STAKING_ADDRESS, abi: SUSHI_STAKING_ABI, functionName: "currentReward", args: [userAddr], query: { refetchInterval: 8000, enabled: !!address } });
  const { data: sushiBalance, refetch: refetchBalance }  = useReadContract({ address: SUSHI_TOKEN_ADDRESS, abi: SUSHI_TOKEN_ABI, functionName: "balanceOf", args: [userAddr], query: { refetchInterval: 8000, enabled: !!address } });
  const { data: allowance,   refetch: refetchAllowance } = useReadContract({ address: SUSHI_TOKEN_ADDRESS, abi: SUSHI_TOKEN_ABI, functionName: "allowance", args: [userAddr, SUSHI_STAKING_ADDRESS], query: { refetchInterval: 8000, enabled: !!address } });

  const { writeContractAsync, isPending } = useMiniKitWrite();
  const [hash, setHash] = useState(null);
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash });
  const [stakeAmt,   setStakeAmt]   = useState("");
  const [withdrawAmt, setWithdrawAmt] = useState("");
  const [msg, setMsg] = useState("");

  const busy = isPending || isConfirming;
  const refetchAll = () => { refetchInfo(); refetchReward(); refetchBalance(); refetchAllowance(); };

  const stakedBal = userInfo?.balance   ?? 0n;
  const intereses = userInfo?.intereses ?? 0n;

  const needsApprovalStake = (amtStr) => {
    if (allowance === undefined || !amtStr) return false;
    try { return allowance < parseUnits(amtStr, 18); } catch { return false; }
  };

  const exec = async (fn) => {
    setMsg("");
    try {
      const tx = await fn();
      setHash(tx);
      setMsg("⏳ Transacción enviada, esperando confirmación...");
      setTimeout(() => { refetchAll(); setMsg(""); }, 6000);
    } catch (e) { setMsg(parseErr(e)); }
  };

  if (!isConnected) return <p className="staking-connect-hint">Conecta tu wallet para gestionar tu SUSHI stake.</p>;

  return (
    <div className="staking-card sushi-card">
      <div className="staking-card-header">
        <h3>SUSHI Staking</h3>
        <span className="staking-label sushi-label">Vault de Rendimiento</span>
      </div>
      <TxMsg msg={msg} />

      <div className="staking-stats">
        <div className="staking-stat"><span>Balance Stakeado</span><strong>{fmt(stakedBal)} SUSHI</strong></div>
        <div className="staking-stat"><span>Intereses Acum.</span><strong className="text-success">{fmt(intereses)} SUSHI</strong></div>
        <div className="staking-stat"><span>Reward Actual</span><strong className="text-accent">{fmt(currentReward)} SUSHI</strong></div>
        <div className="staking-stat"><span>Wallet SUSHI</span><strong>{fmt(sushiBalance)} SUSHI</strong></div>
      </div>

      <div className="staking-actions">
        <div className="staking-section">
          <label>Depositar SUSHI (Stake)</label>
          <div className="staking-input-row">
            <input type="number" min="0" placeholder="Cantidad SUSHI" value={stakeAmt} onChange={e => setStakeAmt(e.target.value)} disabled={busy} />
            <button className="btn-sm btn-secondary" onClick={() => sushiBalance && setStakeAmt(fmt(sushiBalance, 18, 6))} disabled={!sushiBalance}>Max</button>
          </div>
          {stakeAmt && needsApprovalStake(stakeAmt) ? (
            <ApproveBtn tokenAddress={SUSHI_TOKEN_ADDRESS} spender={SUSHI_STAKING_ADDRESS} label="Aprobar SUSHI (ilimitado)" onDone={refetchAllowance} />
          ) : (
            <button className="btn-primary staking-btn" disabled={busy || !stakeAmt}
              onClick={() => exec(async () => {
                setMsg("⏳ Stakeando SUSHI...");
                const tx = await writeContractAsync({
                  address: SUSHI_STAKING_ADDRESS, abi: SUSHI_STAKING_ABI, functionName: "buyMembership",
                  args: [parseUnits(stakeAmt, 18), 0],
                  txMeta: { label: "Depositar para Staking SUSHI", amount: stakeAmt, token: "SUSHI" },
                });
                setStakeAmt(""); return tx;
              })}>
              {busy ? "⏳ Procesando..." : "Depositar SUSHI"}
            </button>
          )}
        </div>

        <div className="staking-section staking-claim">
          <div className="claim-info">
            <span>Intereses acumulados para reclamar</span>
            <strong className="text-success">{fmt(intereses)} SUSHI</strong>
          </div>
          <button className="btn-success staking-claim-btn" disabled={busy || intereses === 0n}
            onClick={() => exec(async () => {
              setMsg("⏳ Retirando intereses...");
              const tx = await writeContractAsync({
                address: SUSHI_STAKING_ADDRESS, abi: SUSHI_STAKING_ABI, functionName: "retirarIntereses",
                args: [],
                txMeta: { label: "Reclamar intereses SUSHI", amount: fmt(intereses), token: "SUSHI" },
              });
              return tx;
            })}>
            {busy ? "⏳ ..." : "Reclamar Intereses"}
          </button>
        </div>

        <div className="staking-section">
          <label>Retirar Balance Stakeado (Unstake)</label>
          <div className="staking-input-row">
            <input type="number" min="0" placeholder="Cantidad SUSHI" value={withdrawAmt} onChange={e => setWithdrawAmt(e.target.value)} disabled={busy} />
            <button className="btn-sm btn-secondary" onClick={() => stakedBal && setWithdrawAmt(fmt(stakedBal, 18, 6))} disabled={!stakedBal}>Max</button>
          </div>
          <button className="btn-warning staking-btn" disabled={busy || !withdrawAmt}
            onClick={() => exec(async () => {
              setMsg("⏳ Retirando balance...");
              const tx = await writeContractAsync({
                address: SUSHI_STAKING_ADDRESS, abi: SUSHI_STAKING_ABI, functionName: "retirarBalance",
                args: [parseUnits(withdrawAmt, 18)],
                txMeta: { label: "Retirar balance SUSHI del Staking", amount: withdrawAmt, token: "SUSHI" },
              });
              setWithdrawAmt(""); return tx;
            })}>
            {busy ? "⏳ Procesando..." : "Retirar SUSHI"}
          </button>
        </div>
      </div>
      <div className="staking-footer">
        <a href={`https://worldscan.org/address/${SUSHI_STAKING_ADDRESS}`} target="_blank" rel="noreferrer" className="staking-link">Ver contrato SUSHI ↗</a>
        <a href={`https://worldscan.org/token/${SUSHI_TOKEN_ADDRESS}`} target="_blank" rel="noreferrer" className="staking-link">Ver token SUSHI ↗</a>
      </div>
    </div>
  );
}

// ─── AIR STAKING CARD (with inline fundPool for owner2) ──────────────────────
function AirStakingCard() {
  const { address, isConnected } = useWallet();
  const userAddr = address ?? ZERO_ADDR;

  const minERC20 = [
    { inputs: [{ name: "account", type: "address" }], name: "balanceOf", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
    { inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], name: "allowance", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  ];

  const { data: aprBps }        = useReadContract({ address: AIR_STAKING_ADDRESS, abi: AIR_STAKING_ABI, functionName: "aprBps",        query: { refetchInterval: 60000 } });
  const { data: rewardPool }    = useReadContract({ address: AIR_STAKING_ADDRESS, abi: AIR_STAKING_ABI, functionName: "rewardPool",    query: { refetchInterval: 30000 } });
  const { data: totalStaked }   = useReadContract({ address: AIR_STAKING_ADDRESS, abi: AIR_STAKING_ABI, functionName: "totalStaked",   query: { refetchInterval: 30000 } });
  const { data: owner2Addr }    = useReadContract({ address: AIR_STAKING_ADDRESS, abi: AIR_STAKING_ABI, functionName: "owner2",        query: { refetchInterval: 30000 } });
  const { data: stakedBalance,  refetch: refetchStaked }   = useReadContract({ address: AIR_STAKING_ADDRESS, abi: AIR_STAKING_ABI, functionName: "stakedBalance",  args: [userAddr], query: { refetchInterval: 8000, enabled: !!address } });
  const { data: pendingRewards, refetch: refetchRewards }  = useReadContract({ address: AIR_STAKING_ADDRESS, abi: AIR_STAKING_ABI, functionName: "pendingRewards", args: [userAddr], query: { refetchInterval: 8000, enabled: !!address } });
  const { data: tokenBalance,   refetch: refetchBalance }  = useReadContract({ address: AIR_TOKEN_ADDRESS, abi: minERC20, functionName: "balanceOf",  args: [userAddr], query: { refetchInterval: 8000, enabled: !!address } });
  const { data: allowance,      refetch: refetchAllowance }= useReadContract({ address: AIR_TOKEN_ADDRESS, abi: minERC20, functionName: "allowance",  args: [userAddr, AIR_STAKING_ADDRESS], query: { refetchInterval: 8000, enabled: !!address } });

  const { writeContractAsync, isPending } = useMiniKitWrite();
  const [hash, setHash] = useState(null);
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash });
  const [stakeAmt, setStakeAmt]     = useState("");
  const [unstakeAmt, setUnstakeAmt] = useState("");
  const [fundAmt, setFundAmt]       = useState("");
  const [msg, setMsg] = useState("");

  const busy = isPending || isConfirming;
  const isOwner2 = !!(address && owner2Addr && address.toLowerCase() === owner2Addr.toLowerCase());
  const refetchAll = () => { refetchStaked(); refetchRewards(); refetchBalance(); refetchAllowance(); };

  const { apr: aprDisplay, apy: apyDisplay } = aprBpsToDisplay(aprBps);

  const needsApproval = (amtStr) => {
    if (allowance === undefined || !amtStr) return false;
    try { return allowance < parseUnits(amtStr, AIR_DECIMALS); } catch { return false; }
  };
  const fundNeedsApproval = (amtStr) => {
    if (allowance === undefined || !amtStr) return false;
    try { return allowance < parseUnits(amtStr, AIR_DECIMALS); } catch { return false; }
  };

  const exec = async (fn) => {
    setMsg("");
    try {
      const tx = await fn();
      setHash(tx);
      setMsg("⏳ Transacción enviada, esperando confirmación...");
      setTimeout(() => { refetchAll(); setMsg(""); }, 6000);
    } catch (e) { setMsg(parseErr(e)); }
  };

  if (!isConnected) return <p className="staking-connect-hint">Conecta tu wallet para gestionar tu AIR stake.</p>;

  return (
    <div className="staking-card">
      <div className="staking-card-header">
        <h3>AIR Staking</h3>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span className="staking-label air-label">Earn APR</span>
          {isOwner2 && <span className="staking-label" style={{ background: "rgba(167,139,250,0.15)", color: "#a78bfa", borderColor: "rgba(167,139,250,0.35)" }}>👑 Owner2</span>}
        </div>
      </div>
      <TxMsg msg={msg} />
      <div className="staking-stats">
        <div className="staking-stat"><span>APR</span><strong className="text-success">{aprDisplay}</strong></div>
        <div className="staking-stat"><span>Tu Stake</span><strong>{fmt(stakedBalance, AIR_DECIMALS)} AIR</strong></div>
        <div className="staking-stat"><span>Recompensas</span><strong className="text-accent">{fmt(pendingRewards, AIR_DECIMALS)} AIR</strong></div>
        <div className="staking-stat"><span>Wallet</span><strong>{fmt(tokenBalance, AIR_DECIMALS)} AIR</strong></div>
        <div className="staking-stat"><span>Pool Rewards</span><strong className="text-success">{fmt(rewardPool, AIR_DECIMALS)} AIR</strong></div>
        <div className="staking-stat"><span>Total Stakeado</span><strong>{fmt(totalStaked, AIR_DECIMALS)} AIR</strong></div>
      </div>
      <div className="staking-actions">
        <div className="staking-section">
          <label>Depositar (Stake)</label>
          <div className="staking-input-row">
            <input type="number" min="0" placeholder="Cantidad AIR" value={stakeAmt} onChange={e => setStakeAmt(e.target.value)} disabled={busy} />
            <button className="btn-sm btn-secondary" onClick={() => tokenBalance && setStakeAmt(fmt(tokenBalance, AIR_DECIMALS, 6))} disabled={!tokenBalance}>Max</button>
          </div>
          {stakeAmt && needsApproval(stakeAmt) ? (
            <ApproveBtn tokenAddress={AIR_TOKEN_ADDRESS} spender={AIR_STAKING_ADDRESS} label="Aprobar AIR (ilimitado)" onDone={refetchAllowance} />
          ) : (
            <button className="btn-primary staking-btn" disabled={busy || !stakeAmt}
              onClick={() => exec(async () => {
                setMsg("⏳ Stakeando AIR...");
                const tx = await writeContractAsync({
                  address: AIR_STAKING_ADDRESS, abi: AIR_STAKING_ABI, functionName: "stake",
                  args: [parseUnits(stakeAmt, AIR_DECIMALS)],
                  txMeta: { label: "Depositar para Staking AIR", amount: stakeAmt, token: "AIR" },
                });
                setStakeAmt(""); return tx;
              })}>
              {busy ? "⏳ Procesando..." : "Depositar AIR"}
            </button>
          )}
        </div>

        <div className="staking-section">
          <label>Retirar (Unstake)</label>
          <div className="staking-input-row">
            <input type="number" min="0" placeholder="Cantidad AIR" value={unstakeAmt} onChange={e => setUnstakeAmt(e.target.value)} disabled={busy} />
            <button className="btn-sm btn-secondary" onClick={() => stakedBalance && setUnstakeAmt(fmt(stakedBalance, AIR_DECIMALS, 6))} disabled={!stakedBalance}>Max</button>
          </div>
          <button className="btn-warning staking-btn" disabled={busy || !unstakeAmt}
            onClick={() => exec(async () => {
              setMsg("⏳ Retirando AIR...");
              const tx = await writeContractAsync({
                address: AIR_STAKING_ADDRESS, abi: AIR_STAKING_ABI, functionName: "unstake",
                args: [parseUnits(unstakeAmt, AIR_DECIMALS)],
                txMeta: { label: "Retirar del Staking AIR", amount: unstakeAmt, token: "AIR" },
              });
              setUnstakeAmt(""); return tx;
            })}>
            {busy ? "⏳ Procesando..." : "Retirar AIR"}
          </button>
        </div>

        <div className="staking-section staking-claim">
          <div className="claim-info">
            <span>Recompensas disponibles</span>
            <strong className="text-success">{fmt(pendingRewards, AIR_DECIMALS)} AIR</strong>
          </div>
          <button className="btn-success staking-claim-btn" disabled={busy || !pendingRewards || pendingRewards === 0n}
            onClick={() => exec(async () => {
              setMsg("⏳ Reclamando recompensas...");
              const tx = await writeContractAsync({
                address: AIR_STAKING_ADDRESS, abi: AIR_STAKING_ABI, functionName: "claim",
                args: [],
                txMeta: { label: "Reclamar recompensas de Staking AIR", amount: fmt(pendingRewards, AIR_DECIMALS), token: "AIR" },
              });
              return tx;
            })}>
            {busy ? "⏳ ..." : "Reclamar Recompensas"}
          </button>
        </div>

        {isOwner2 && (
          <div className="staking-section" style={{ borderTop: "1px solid rgba(167,139,250,0.3)", paddingTop: 14, marginTop: 4 }}>
            <label style={{ color: "#a78bfa" }}>👑 Fondear Pool AIR (Owner2)</label>
            <small style={{ color: "var(--text-secondary)", display: "block", marginBottom: 8 }}>
              Tu balance: {fmt(tokenBalance, AIR_DECIMALS)} AIR
            </small>
            <div className="staking-input-row">
              <input type="number" min="0" placeholder="Cantidad AIR a fondear" value={fundAmt} onChange={e => setFundAmt(e.target.value)} disabled={busy} />
              <button className="btn-sm btn-secondary" onClick={() => tokenBalance && setFundAmt(fmt(tokenBalance, AIR_DECIMALS, 6))} disabled={!tokenBalance}>Max</button>
            </div>
            {fundAmt && fundNeedsApproval(fundAmt) ? (
              <button className="btn-primary staking-btn" disabled={busy}
                onClick={() => exec(async () => {
                  setMsg("⏳ Aprobando AIR...");
                  return writeContractAsync({
                    address: AIR_TOKEN_ADDRESS, abi: AIR_TOKEN_ABI, functionName: "approve",
                    args: [AIR_STAKING_ADDRESS, MAXUINT256],
                    txMeta: { label: "Aprobar AIR para fondear pool", amount: "Ilimitado", token: "AIR" },
                  });
                })}>
                {busy ? "⏳ Aprobando..." : "Aprobar AIR para fondear"}
              </button>
            ) : (
              <button className="btn-success staking-btn" disabled={busy || !fundAmt}
                onClick={() => exec(async () => {
                  setMsg("⏳ Fondeando pool...");
                  const tx = await writeContractAsync({
                    address: AIR_STAKING_ADDRESS, abi: AIR_STAKING_ABI, functionName: "fundPool",
                    args: [parseUnits(fundAmt, AIR_DECIMALS)],
                    txMeta: { label: "Fondear Pool de Recompensas AIR", amount: fundAmt, token: "AIR" },
                  });
                  setFundAmt(""); return tx;
                })}>
                {busy ? "⏳ Fondeando..." : `Fondear ${fundAmt || "0"} AIR`}
              </button>
            )}
          </div>
        )}
      </div>
      <div className="staking-footer">
        <a href={`https://worldscan.org/address/${AIR_STAKING_ADDRESS}`} target="_blank" rel="noreferrer" className="staking-link">Ver contrato ↗</a>
        <a href={`https://worldscan.org/token/${AIR_TOKEN_ADDRESS}`} target="_blank" rel="noreferrer" className="staking-link">Ver token AIR ↗</a>
      </div>
    </div>
  );
}

// ─── GENERIC STAKE CARD (USDC / WLD / WARS / WCOP / BTCH2O) ─────────────────
function GenericStakingCard({ name, label, labelClass, tokenAddress, tokenAbi, stakingAddress, stakingAbi, decimals = 18 }) {
  const { address, isConnected } = useWallet();
  const userAddr = address ?? ZERO_ADDR;

  const minERC20 = [
    { inputs: [], name: "symbol",  outputs: [{ type: "string"  }], stateMutability: "view", type: "function" },
    { inputs: [{ name: "account", type: "address" }], name: "balanceOf", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
    { inputs: [], name: "decimals", outputs: [{ type: "uint8" }], stateMutability: "view", type: "function" },
    { inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], name: "allowance", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  ];

  const { data: aprBps }        = useReadContract({ address: stakingAddress, abi: stakingAbi, functionName: "aprBps",        query: { refetchInterval: 60000 } });
  const { data: rewardPool }    = useReadContract({ address: stakingAddress, abi: stakingAbi, functionName: "rewardPool",    query: { refetchInterval: 30000 } });
  const { data: totalStaked }   = useReadContract({ address: stakingAddress, abi: stakingAbi, functionName: "totalStaked",   query: { refetchInterval: 30000 } });
  const { data: stakedBalance,  refetch: refetchStaked }   = useReadContract({ address: stakingAddress, abi: stakingAbi, functionName: "stakedBalance",  args: [userAddr], query: { refetchInterval: 8000, enabled: !!address } });
  const { data: pendingRewards, refetch: refetchRewards }  = useReadContract({ address: stakingAddress, abi: stakingAbi, functionName: "pendingRewards", args: [userAddr], query: { refetchInterval: 8000, enabled: !!address } });
  const { data: tokenBalance,   refetch: refetchBalance }  = useReadContract({ address: tokenAddress, abi: minERC20, functionName: "balanceOf",  args: [userAddr], query: { refetchInterval: 8000, enabled: !!address } });
  const { data: allowance,      refetch: refetchAllowance }= useReadContract({ address: tokenAddress, abi: minERC20, functionName: "allowance",  args: [userAddr, stakingAddress], query: { refetchInterval: 8000, enabled: !!address } });

  const { writeContractAsync, isPending } = useMiniKitWrite();
  const [hash, setHash] = useState(null);
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash });
  const [stakeAmt, setStakeAmt]     = useState("");
  const [unstakeAmt, setUnstakeAmt] = useState("");
  const [msg, setMsg] = useState("");

  const busy = isPending || isConfirming;
  const refetchAll = () => { refetchStaked(); refetchRewards(); refetchBalance(); refetchAllowance(); };

  const aprDisplay = aprBps !== undefined ? `${(Number(aprBps) / 100).toFixed(2)}%` : "—";

  const needsApproval = (amtStr) => {
    if (allowance === undefined || !amtStr) return false;
    try { return allowance < parseUnits(amtStr, decimals); } catch { return false; }
  };

  const exec = async (fn) => {
    setMsg("");
    try {
      const tx = await fn();
      setHash(tx);
      setMsg("⏳ Transacción enviada, esperando confirmación...");
      setTimeout(() => { refetchAll(); setMsg(""); }, 6000);
    } catch (e) { setMsg(parseErr(e)); }
  };

  if (!isConnected) return <p className="staking-connect-hint">Conecta tu wallet para gestionar tu {name} stake.</p>;

  return (
    <div className="staking-card">
      <div className="staking-card-header">
        <h3>{name} Staking</h3>
        <span className={`staking-label ${labelClass ?? ""}`}>{label}</span>
      </div>
      <TxMsg msg={msg} />
      <div className="staking-stats">
        <div className="staking-stat"><span>APR</span><strong className="text-success">{aprDisplay}</strong></div>
        <div className="staking-stat"><span>Tu Stake</span><strong>{fmt(stakedBalance, decimals)} {name}</strong></div>
        <div className="staking-stat"><span>Recompensas</span><strong className="text-accent">{fmt(pendingRewards, decimals)} {name}</strong></div>
        <div className="staking-stat"><span>Wallet</span><strong>{fmt(tokenBalance, decimals)} {name}</strong></div>
        <div className="staking-stat"><span>Pool Rewards</span><strong className="text-success">{fmt(rewardPool, decimals)} {name}</strong></div>
        <div className="staking-stat"><span>Total Stakeado</span><strong>{fmt(totalStaked, decimals)} {name}</strong></div>
      </div>
      <div className="staking-actions">
        <div className="staking-section">
          <label>Depositar (Stake)</label>
          <div className="staking-input-row">
            <input type="number" min="0" placeholder={`Cantidad ${name}`} value={stakeAmt} onChange={e => setStakeAmt(e.target.value)} disabled={busy} />
            <button className="btn-sm btn-secondary" onClick={() => tokenBalance && setStakeAmt(fmt(tokenBalance, decimals, 6))} disabled={!tokenBalance}>Max</button>
          </div>
          {stakeAmt && needsApproval(stakeAmt) ? (
            <ApproveBtn tokenAddress={tokenAddress} spender={stakingAddress} label={`Aprobar ${name} (ilimitado)`} onDone={refetchAllowance} />
          ) : (
            <button className="btn-primary staking-btn" disabled={busy || !stakeAmt}
              onClick={() => exec(async () => {
                setMsg(`⏳ Stakeando ${name}...`);
                const tx = await writeContractAsync({
                  address: stakingAddress, abi: stakingAbi, functionName: "stake",
                  args: [parseUnits(stakeAmt, decimals)],
                  txMeta: { label: `Depositar para Staking ${name}`, amount: stakeAmt, token: name },
                });
                setStakeAmt(""); return tx;
              })}>
              {busy ? "⏳ Procesando..." : `Depositar ${name}`}
            </button>
          )}
        </div>

        <div className="staking-section">
          <label>Retirar (Unstake)</label>
          <div className="staking-input-row">
            <input type="number" min="0" placeholder={`Cantidad ${name}`} value={unstakeAmt} onChange={e => setUnstakeAmt(e.target.value)} disabled={busy} />
            <button className="btn-sm btn-secondary" onClick={() => stakedBalance && setUnstakeAmt(fmt(stakedBalance, decimals, 6))} disabled={!stakedBalance}>Max</button>
          </div>
          <button className="btn-warning staking-btn" disabled={busy || !unstakeAmt}
            onClick={() => exec(async () => {
              setMsg(`⏳ Retirando ${name}...`);
              const tx = await writeContractAsync({
                address: stakingAddress, abi: stakingAbi, functionName: "unstake",
                args: [parseUnits(unstakeAmt, decimals)],
                txMeta: { label: `Retirar del Staking ${name}`, amount: unstakeAmt, token: name },
              });
              setUnstakeAmt(""); return tx;
            })}>
            {busy ? "⏳ Procesando..." : `Retirar ${name}`}
          </button>
        </div>

        <div className="staking-section staking-claim">
          <div className="claim-info">
            <span>Recompensas disponibles</span>
            <strong className="text-success">{fmt(pendingRewards, decimals)} {name}</strong>
          </div>
          <button className="btn-success staking-claim-btn" disabled={busy || !pendingRewards || pendingRewards === 0n}
            onClick={() => exec(async () => {
              setMsg("⏳ Reclamando recompensas...");
              const tx = await writeContractAsync({
                address: stakingAddress, abi: stakingAbi, functionName: "claim",
                args: [],
                txMeta: { label: `Reclamar recompensas de Staking ${name}`, amount: fmt(pendingRewards, decimals), token: name },
              });
              return tx;
            })}>
            {busy ? "⏳ ..." : "Reclamar Recompensas"}
          </button>
        </div>
      </div>
      <div className="staking-footer">
        <a href={`https://worldscan.org/address/${stakingAddress}`} target="_blank" rel="noreferrer" className="staking-link">Ver contrato ↗</a>
        <a href={`https://worldscan.org/token/${tokenAddress}`} target="_blank" rel="noreferrer" className="staking-link">Ver token {name} ↗</a>
      </div>
    </div>
  );
}

// ─── TAB PANEL ────────────────────────────────────────────────────────────────
const TABS = [
  { id: "h2o",    label: "H2O"    },
  { id: "time",   label: "TIME"   },
  { id: "sushi",  label: "SUSHI"  },
  { id: "usdc",   label: "USDC"   },
  { id: "wld",    label: "WLD"    },
  { id: "wars",   label: "wARS"   },
  { id: "wcop",   label: "wCOP"   },
  { id: "air",    label: "AIR"    },
  { id: "btch2o", label: "BTCH2O" },
  { id: "fire",   label: "🔥 FIRE"  },
];

export default function StakingPanel() {
  const [tab, setTab] = useState("h2o");
  return (
    <div className="staking-panel">
      <div className="staking-tabs">
        {TABS.map(t => (
          <button key={t.id} className={`staking-tab ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === "h2o"    && <AcuaStakingCard />}
      {tab === "time"   && <TimeStakingCard />}
      {tab === "sushi"  && <SushiStakingCard />}
      {tab === "usdc"   && (
        <GenericStakingCard
          name="USDC" label="Earn APR" labelClass="usdc-label"
          tokenAddress={USDC_TOKEN_ADDRESS} tokenAbi={USDC_TOKEN_ABI}
          stakingAddress={USDC_STAKING_ADDRESS} stakingAbi={USDC_STAKING_ABI}
          decimals={USDC_DECIMALS}
        />
      )}
      {tab === "wld"    && (
        <GenericStakingCard
          name="WLD" label="Earn APR" labelClass="wld-label"
          tokenAddress={WLD_TOKEN_ADDRESS} tokenAbi={WLD_TOKEN_ABI}
          stakingAddress={WLD_STAKING_ADDRESS} stakingAbi={WLD_STAKING_ABI}
          decimals={WLD_DECIMALS}
        />
      )}
      {tab === "wars"   && (
        <GenericStakingCard
          name="wARS" label="Earn APR" labelClass="wars-label"
          tokenAddress={WARS_TOKEN_ADDRESS} tokenAbi={WARS_TOKEN_ABI}
          stakingAddress={WARS_STAKING_ADDRESS} stakingAbi={WARS_STAKING_ABI}
          decimals={WARS_DECIMALS}
        />
      )}
      {tab === "wcop"   && (
        <GenericStakingCard
          name="wCOP" label="Earn APR" labelClass="wcop-label"
          tokenAddress={WCOP_TOKEN_ADDRESS} tokenAbi={WCOP_TOKEN_ABI}
          stakingAddress={WCOP_STAKING_ADDRESS} stakingAbi={WCOP_STAKING_ABI}
          decimals={WCOP_DECIMALS}
        />
      )}
      {tab === "air"    && <AirStakingCard />}
      {tab === "btch2o" && (
        <GenericStakingCard
          name="BTCH2O" label="Earn APR" labelClass="btch2o-label"
          tokenAddress={BTCH2O_TOKEN_ADDRESS} tokenAbi={BTCH2O_TOKEN_ABI}
          stakingAddress={BTCH2O_STAKING_ADDRESS} stakingAbi={BTCH2O_STAKING_ABI}
          decimals={BTCH2O_DECIMALS}
        />
      )}
      {tab === "fire" && (
        <GenericStakingCard
          name="FIRE" label="🔥 15% APR" labelClass="fire-label"
          tokenAddress={FIRE_TOKEN_ADDRESS} tokenAbi={FIRE_TOKEN_ABI}
          stakingAddress={FIRE_STAKING_ADDRESS} stakingAbi={FIRE_STAKING_ABI}
          decimals={FIRE_DECIMALS}
        />
      )}
    </div>
  );
}
