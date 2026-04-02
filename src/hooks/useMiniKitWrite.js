import { useState } from "react";
import { MiniKit } from "@worldcoin/minikit-js";
import { encodeFunctionData } from "viem";
import { useWalletClient } from "wagmi";
import { toast } from "../context/ToastContext.jsx";
import { useTxConfirm } from "../context/TxConfirmContext.jsx";

const WORLD_CHAIN_ID = 480;

export function useMiniKitWrite() {
  const [isPending, setIsPending] = useState(false);
  const [data, setData]           = useState(null);
  const [error, setError]         = useState(null);
  const { confirmTx }             = useTxConfirm();
  const { data: walletClient }    = useWalletClient();

  const writeContractAsync = async ({
    address,
    abi,
    functionName,
    args = [],
    value,
    txMeta,
    gas: _gas,
    maxFeePerGas: _maxFee,
    maxPriorityFeePerGas: _maxPrio,
  }) => {
    if (txMeta) {
      const confirmed = await confirmTx(txMeta);
      if (!confirmed) {
        const err = new Error("Transacción cancelada por el usuario.");
        err.shortMessage = "Transacción cancelada.";
        throw err;
      }
    }

    setIsPending(true);
    setData(null);
    setError(null);

    try {
      const isMiniKit = (() => {
        try { return MiniKit.isInstalled(); } catch { return false; }
      })();

      let txHash;

      if (isMiniKit) {
        toast("Enviando transacción a World App...", "info", 12000);
        const calldata = encodeFunctionData({ abi, functionName, args });
        const txEntry  = { to: address, data: calldata };
        if (value !== undefined && value !== null && value !== 0n) {
          txEntry.value = "0x" + BigInt(value).toString(16);
        }
        const response = await MiniKit.sendTransaction({
          transactions: [txEntry],
          chainId: WORLD_CHAIN_ID,
        });
        txHash = response?.data?.userOpHash || response?.data?.transactionHash;
        if (!txHash) throw new Error("Transacción rechazada o cancelada en World App.");

      } else if (walletClient) {
        toast("Enviando transacción con wallet conectada...", "info", 12000);
        txHash = await walletClient.writeContract({
          address,
          abi,
          functionName,
          args,
          ...(value !== undefined && value !== null ? { value: BigInt(value) } : {}),
        });

      } else {
        throw new Error("Conecta una wallet (MetaMask o World App) para firmar transacciones.");
      }

      setData(txHash);
      toast("Transacción enviada — esperando confirmación en la blockchain...", "success", 6000);
      return txHash;

    } catch (err) {
      const isCancel =
        err?.message?.toLowerCase().includes("cancelad") ||
        err?.message?.toLowerCase().includes("user rejected") ||
        err?.error_code === "user_rejected";

      const msg = isCancel
        ? "Transacción cancelada."
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
