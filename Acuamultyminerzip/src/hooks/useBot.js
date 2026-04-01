import { useState, useEffect, useRef, useContext } from "react";
import { usePublicClient, useWriteContract, useAccount } from "wagmi";
import { formatUnits, parseGwei } from "viem";
import { CONTRACT_ABI, CONTRACT_ADDRESS } from "../config/contract.js";
import { useTxConfirm } from "../context/TxConfirmContext.jsx";

const GAS = {
  gas:                  700_000n,
  maxFeePerGas:         parseGwei("0.001"),
  maxPriorityFeePerGas: parseGwei("0.001"),
};

const MAX_LOGS = 50;
const deadline = () => BigInt(Math.floor(Date.now() / 1000) + 600);

export function useBotStatus() {
  const [running, setRunning] = useState(false);
  const [lastRun, setLastRun] = useState(null);
  const [logs, setLogs] = useState([]);
  const [totalFees0, setTotalFees0] = useState(0);
  const [totalFees1, setTotalFees1] = useState(0);
  const [inRangeCount, setInRangeCount] = useState(0);
  const intervalRef = useRef(null);
  const client = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const { address } = useAccount();
  const { confirmTx } = useTxConfirm();

  const addLog = (msg, type = "info") => {
    setLogs(prev => [{ msg, type, ts: new Date().toLocaleTimeString() }, ...prev].slice(0, MAX_LOGS));
  };

  const readPositionFees = async (positions) => {
    if (!client || !positions?.length) return { fees0: 0, fees1: 0, inRange: 0 };
    let total0 = 0, total1 = 0, inRangeN = 0;
    for (const tokenId of positions) {
      try {
        const pos = await client.readContract({
          address: CONTRACT_ADDRESS,
          abi: CONTRACT_ABI,
          functionName: "getPosition",
          args: [BigInt(tokenId.toString())],
        });
        if (pos) {
          const f0 = parseFloat(formatUnits(pos[6] ?? 0n, 18));
          const f1 = parseFloat(formatUnits(pos[7] ?? 0n, 18));
          total0 += f0;
          total1 += f1;
          if (pos[9]) inRangeN++;
        }
      } catch (e) {
        addLog(`⚠️ Error leyendo pos #${tokenId}: ${e.shortMessage || e.message}`, "warn");
      }
    }
    return { fees0: total0, fees1: total1, inRange: inRangeN };
  };

  const runReinvest = async (positions, skipConfirm = false) => {
    try {
      addLog(`🔍 Escaneando ${positions.length} posición(es)...`);

      const { fees0, fees1, inRange } = await readPositionFees(positions);
      setTotalFees0(fees0);
      setTotalFees1(fees1);
      setInRangeCount(inRange);

      addLog(`📊 En rango: ${inRange}/${positions.length} | Fees: ${fees0.toFixed(6)} / ${fees1.toFixed(6)}`);

      if (!address) {
        addLog("⚠️ Wallet no conectada. No se puede ejecutar.", "warn");
        return;
      }

      const config = await client.readContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: "getConfig",
      });

      if (config && config[4]) {
        addLog("⏸ Contrato pausado, reinversión omitida.", "warn");
        return;
      }

      if (!skipConfirm) {
        const ok = await confirmTx("Reinversión automática de fees en Uniswap V3");
        if (!ok) {
          addLog("❌ Transacción cancelada por el usuario.", "warn");
          return;
        }
      }

      addLog("⚡ Ejecutando collectAllManaged...", "info");
      const tx = await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: "collectAllManaged",
        args: [deadline()],
        ...GAS,
      });
      addLog(`✅ Tx: ${tx.slice(0, 10)}...${tx.slice(-6)}`, "success");
      setLastRun(new Date());
    } catch (e) {
      const msg = e.shortMessage || e.message || "Error desconocido";
      addLog(`❌ Error: ${msg}`, "error");
    }
  };

  const runManualCollect = async (positions) => {
    addLog("🖐 Reinversión manual iniciada...", "info");
    await runReinvest(positions, false);
  };

  const runManualClaim = async () => {
    try {
      const ok = await confirmTx("Reclamar recompensas H2O & BTCH2O del staking");
      if (!ok) {
        addLog("❌ Claim cancelado por el usuario.", "warn");
        return;
      }
      addLog("🏆 Reclamando recompensas H2O & BTCH2O...", "info");
      const tx = await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: "claimStakingRewards",
        args: [deadline()],
        ...GAS,
      });
      addLog(`✅ Claim enviado: ${tx.slice(0, 10)}...${tx.slice(-6)}`, "success");
    } catch (e) {
      const msg = e.shortMessage || e.message || "Error desconocido";
      addLog(`❌ Claim error: ${msg}`, "error");
    }
  };

  const refreshFees = async (positions) => {
    if (!positions?.length) return;
    const { fees0, fees1, inRange } = await readPositionFees(positions);
    setTotalFees0(fees0);
    setTotalFees1(fees1);
    setInRangeCount(inRange);
  };

  const startBot = (positions, intervalSecs) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRunning(true);
    addLog(`🤖 Bot iniciado. Intervalo: ${intervalSecs}s`, "success");
    runReinvest(positions, true);
    intervalRef.current = setInterval(() => runReinvest(positions, true), intervalSecs * 1000);
  };

  const stopBot = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    setRunning(false);
    addLog("⏹ Bot detenido.", "warn");
  };

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  return {
    running, lastRun, logs,
    totalFees0, totalFees1, inRangeCount,
    startBot, stopBot,
    runManualCollect, runManualClaim, refreshFees,
  };
}
