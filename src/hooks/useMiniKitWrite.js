import { useState } from "react";
import { MiniKit } from "@worldcoin/minikit-js";
import { encodeFunctionData } from "viem";
import { toast } from "../context/ToastContext.jsx";

const WORLD_CHAIN_ID = 480;

export function useMiniKitWrite() {
  const [isPending, setIsPending] = useState(false);
  const [data, setData]           = useState(null);
  const [error, setError]         = useState(null);

  const writeContractAsync = async ({
    address,
    abi,
    functionName,
    args = [],
    value,
  }) => {
    setIsPending(true);
    setData(null);
    setError(null);

    try {
      const isMiniKit = (() => {
        try { return MiniKit.isInstalled(); } catch { return false; }
      })();

      if (!isMiniKit) {
        throw new Error("Abre esta app dentro de World App para firmar transacciones.");
      }

      toast("Enviando transacción a World App...", "info", 12000);

      // Encode calldata — MiniKit v2 sendTransaction requires raw { to, data }
      const calldata = encodeFunctionData({ abi, functionName, args });

      const txEntry = { to: address, data: calldata };
      if (value !== undefined && value !== null && value !== 0n) {
        txEntry.value = "0x" + BigInt(value).toString(16);
      }

      // v2 API: requires chainId: 480 (World Chain) — mandatory, throws without it
      const response = await MiniKit.sendTransaction({
        transactions: [txEntry],
        chainId: WORLD_CHAIN_ID,
      });

      // v2 API: response = { data: { userOpHash, status, from, timestamp }, executedWith }
      const txHash = response?.data?.userOpHash || response?.data?.transactionHash;

      if (!txHash) {
        throw new Error("Transacción rechazada o cancelada en World App.");
      }

      setData(txHash);
      toast("Transacción enviada. Esperando confirmación en la blockchain...", "success", 6000);
      return txHash;
    } catch (err) {
      const isCancel = err?.message?.toLowerCase().includes("user") ||
                       err?.error_code === "user_rejected" ||
                       err?.message?.toLowerCase().includes("cancel");

      const msg = isCancel
        ? "Transacción cancelada por el usuario."
        : err?.shortMessage || err?.message || "Error al enviar la transacción.";

      const errObj = new Error(msg);
      errObj.shortMessage = msg;
      setError(errObj);
      toast(msg, isCancel ? "warning" : "error", 6000);
      throw errObj;
    } finally {
      setIsPending(false);
    }
  };

  return { writeContractAsync, isPending, data, error };
}
