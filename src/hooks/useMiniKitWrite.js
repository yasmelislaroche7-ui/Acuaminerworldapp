import { useState } from "react";
import { MiniKit } from "@worldcoin/minikit-js";
import { encodeFunctionData } from "viem";
import { toast } from "../context/ToastContext.jsx";

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
      const isMiniKit = (() => { try { return MiniKit.isInstalled(); } catch { return false; } })();
      if (!isMiniKit) {
        throw new Error("Abre esta app dentro de World App para firmar transacciones.");
      }

      toast("Enviando transacción a World App...", "info", 10000);

      const calldata = encodeFunctionData({ abi, functionName, args });

      const txEntry = { to: address, data: calldata };
      if (value !== undefined && value !== null && value !== 0n) {
        txEntry.value = "0x" + BigInt(value).toString(16);
      }

      const response = await MiniKit.sendTransaction({
        transactions: [txEntry],
      });

      const txId = response?.result?.transaction_id;

      if (!txId) {
        throw new Error("Transacción rechazada o cancelada en World App.");
      }

      setData(txId);
      toast("Transacción enviada. Esperando confirmación...", "success", 5000);
      return txId;
    } catch (err) {
      const msg = err?.message?.includes("User rejected") || err?.message?.includes("cancelada")
        ? "Transacción cancelada por el usuario."
        : err?.shortMessage || err?.message || "Error al enviar la transacción.";

      const errObj = new Error(msg);
      errObj.shortMessage = msg;
      setError(errObj);
      toast(msg, "error", 6000);
      throw errObj;
    } finally {
      setIsPending(false);
    }
  };

  return { writeContractAsync, isPending, data, error };
}
