import { useState } from "react";
import { formatUnits } from "viem";
import { useAccount, useReadContract } from "wagmi";
import { useContractRead, useContractWrite } from "../hooks/useContract.js";
import { CONTRACT_ABI, CONTRACT_ADDRESS } from "../config/contract.js";
import { ERC20_ABI } from "../config/staking.js";
import "../styles/ReservePanel.css";

function fmt(val, dec = 18, dp = 6) {
  if (val === undefined || val === null) return "—";
  try { return parseFloat(formatUnits(BigInt(val.toString()), dec)).toFixed(dp); } catch { return "—"; }
}

function shortAddr(addr) {
  if (!addr) return "";
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function TokenSymbol({ address }) {
  const { data } = useReadContract({
    address,
    abi: ERC20_ABI,
    functionName: "symbol",
    query: { enabled: !!address, staleTime: 300000 },
  });
  return <>{data ?? shortAddr(address)}</>;
}

function TokenDecimals({ address, onDecimals }) {
  const { data } = useReadContract({
    address,
    abi: ERC20_ABI,
    functionName: "decimals",
    query: { enabled: !!address, staleTime: 300000 },
  });
  if (data !== undefined && onDecimals) onDecimals(data);
  return null;
}

export default function ReservePanel() {
  const { address } = useAccount();
  const { data: reserveData, refetch } = useContractRead("getReserveBalances", [], true);
  const { write, isPending } = useContractWrite();

  const [withdrawToken, setWithdrawToken] = useState("");
  const [withdrawAmt,   setWithdrawAmt]   = useState("");
  const [withdrawTo,    setWithdrawTo]    = useState("");
  const [decimalsMap,   setDecimalsMap]   = useState({});
  const [msg, setMsg] = useState("");

  const tokens   = reserveData?.[0] ?? [];
  const balances = reserveData?.[1] ?? [];

  const handleWithdraw = async () => {
    if (!withdrawToken || !withdrawAmt || !withdrawTo) return;
    try {
      setMsg("Enviando retiro...");
      const dec = decimalsMap[withdrawToken] ?? 18;
      const amt = BigInt(Math.floor(parseFloat(withdrawAmt) * 10 ** dec));
      await write("withdrawReserve", [withdrawToken, amt, withdrawTo]);
      setMsg("✅ Retiro completado");
      setWithdrawAmt("");
      refetch();
    } catch (e) {
      setMsg(`❌ Error: ${e.shortMessage || e.message}`);
    }
  };

  const handleWithdrawAll = async (tokenAddr) => {
    try {
      setMsg(`Retirando todo...`);
      await write("withdrawFreeBalance", [tokenAddr, address]);
      setMsg("✅ Todo retirado");
      refetch();
    } catch (e) {
      setMsg(`❌ Error: ${e.shortMessage || e.message}`);
    }
  };

  const handleWithdrawReserve = async (tokenAddr) => {
    const dec = decimalsMap[tokenAddr] ?? 18;
    const bal = balances[tokens.indexOf(tokenAddr)];
    if (!bal) return;
    try {
      setMsg("Retirando reserva...");
      await write("withdrawReserve", [tokenAddr, bal, address]);
      setMsg("✅ Reserva retirada");
      refetch();
    } catch (e) {
      setMsg(`❌ Error: ${e.shortMessage || e.message}`);
    }
  };

  return (
    <div className="reserve-panel">
      <h3>Reservas del Contrato</h3>
      {msg && <div className="reserve-msg">{msg}</div>}

      {tokens.length === 0 ? (
        <p className="reserve-empty">No hay tokens en reserva configurados.</p>
      ) : (
        <div className="reserves-grid">
          {tokens.map((tok, i) => {
            const dec = decimalsMap[tok] ?? 18;
            const bal = balances[i];
            return (
              <div key={tok} className="reserve-item">
                <TokenDecimals
                  address={tok}
                  onDecimals={d => setDecimalsMap(prev => ({ ...prev, [tok]: Number(d) }))}
                />
                <div className="reserve-token-info">
                  <span className="reserve-token"><TokenSymbol address={tok} /></span>
                  <span className="reserve-addr">{shortAddr(tok)}</span>
                </div>
                <span className="reserve-amount">{fmt(bal, dec)}</span>
                <div className="reserve-actions">
                  <button
                    className="btn-secondary btn-xs"
                    onClick={() => handleWithdrawReserve(tok)}
                    disabled={isPending || !bal || bal === 0n}
                  >
                    Retirar reserva
                  </button>
                  <button
                    className="btn-secondary btn-xs"
                    onClick={() => handleWithdrawAll(tok)}
                    disabled={isPending}
                  >
                    Retirar libre
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="withdraw-form">
        <h4>Retiro Manual por Cantidad</h4>
        <div className="form-row">
          <select
            value={withdrawToken}
            onChange={e => setWithdrawToken(e.target.value)}
          >
            <option value="">-- Seleccionar token --</option>
            {tokens.map(tok => (
              <option key={tok} value={tok}>
                {shortAddr(tok)}
              </option>
            ))}
          </select>
          <input
            type="number" placeholder="Cantidad"
            value={withdrawAmt} onChange={e => setWithdrawAmt(e.target.value)}
          />
        </div>
        <div className="form-row">
          <input
            type="text" placeholder={`Dirección destino ${address ? "(o tuya)" : ""}`}
            value={withdrawTo} onChange={e => setWithdrawTo(e.target.value)}
          />
          {address && !withdrawTo && (
            <button className="btn-sm btn-secondary" onClick={() => setWithdrawTo(address)}>
              Mi wallet
            </button>
          )}
        </div>
        <button
          className="btn-primary"
          onClick={handleWithdraw}
          disabled={isPending || !withdrawToken || !withdrawAmt || !withdrawTo}
        >
          {isPending ? "Enviando..." : "Retirar"}
        </button>
      </div>

      <div className="reserve-manage">
        <h4>Gestionar Tokens de Reserva</h4>
        <AddRemoveReserveToken refetch={refetch} />
      </div>
    </div>
  );
}

function AddRemoveReserveToken({ refetch }) {
  const { write, isPending } = useContractWrite();
  const [action, setAction]     = useState("add");
  const [tokenAddr, setToken]   = useState("");
  const [msg, setMsg]           = useState("");

  const handle = async () => {
    if (!tokenAddr) return;
    try {
      setMsg(`Enviando...`);
      if (action === "add") {
        await write("addReserveToken", [tokenAddr]);
        setMsg("✅ Token de reserva añadido");
      } else {
        await write("removeReserveToken", [tokenAddr]);
        setMsg("✅ Token de reserva eliminado");
      }
      setToken("");
      refetch();
    } catch (e) {
      setMsg(`❌ ${e.shortMessage || e.message}`);
    }
  };

  return (
    <div className="reserve-manage-form">
      {msg && <div className="reserve-msg">{msg}</div>}
      <div className="form-row">
        <select value={action} onChange={e => setAction(e.target.value)}>
          <option value="add">Añadir token</option>
          <option value="remove">Eliminar token</option>
        </select>
        <input
          type="text" placeholder="Dirección del token (0x...)"
          value={tokenAddr} onChange={e => setToken(e.target.value)}
        />
        <button
          className={action === "add" ? "btn-primary btn-sm" : "btn-warning btn-sm"}
          onClick={handle}
          disabled={isPending || !tokenAddr}
        >
          {isPending ? "..." : action === "add" ? "Añadir" : "Eliminar"}
        </button>
      </div>
    </div>
  );
}
