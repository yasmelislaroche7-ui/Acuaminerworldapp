import { useState } from "react";
import { MiniKit } from "@worldcoin/minikit-js";
import { encodeFunctionData } from "viem";
import { useWalletClient } from "wagmi";
import { toast } from "../context/ToastContext.jsx";
import { useTxConfirm } from "../context/TxConfirmContext.jsx";

const WORLD_CHAIN_ID = 480;

function friendlyMiniKitError(code) {
  switch (code) {
    case "disallowed_operation":
      return "Operacion no permitida en World App para este contrato. Usa una wallet externa (MetaMask).";
    case "user_rejected":
    case "user_cancelled":
      return "Transaccion cancelada por el usuario.";
    case "insufficient_balance":
      return "Balance insuficiente en tu wallet.";
    case "network_error":
      return "Error de red. Verifica tu conexion e intenta de nuevo.";
    default:
      return code ? `World App rechazo la transaccion (${code}).` : "World App rechazo la transaccion.";
  }
}

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
    // ── Show in-app confirmation dialog if txMeta is provided ──────────────────
    if (txMeta) {
      const confirmed = await confirmTx(txMeta);
      if (!confirmed) {
        const err = new Error("Transaccion cancelada por el usuario.");
        err.shortMessage = "Transaccion cancelada.";
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
        // ── World App / MiniKit path ──────────────────────────────────────────
        toast("Enviando transaccion a World App...", "info", 14000);
        const calldata = encodeFunctionData({ abi, functionName, args });
        const txEntry  = { to: address, data: calldata };
        if (value !== undefined && value !== null && value !== 0n) {
          txEntry.value = "0x" + BigInt(value).toString(16);
        }

        let response;
        try {
          response = await MiniKit.sendTransaction({
            transactions: [txEntry],
            chainId: WORLD_CHAIN_ID,
          });
        } catch (minikitErr) {
          // MiniKit can throw synchronously or reject the promise
          const code = minikitErr?.error_code || minikitErr?.code || minikitErr?.message;
          const msg  = friendlyMiniKitError(code) || minikitErr?.message || "Error al enviar en World App.";
          const err  = new Error(msg);
          err.shortMessage = msg;
          throw err;
        }

        // Check for error codes in the response object (MiniKit may not throw)
        const errorCode = response?.error_code
          || response?.data?.error_code
          || (response?.status === "error" ? "unknown" : null);

        if (errorCode) {
          const msg = friendlyMiniKitError(errorCode);
          const err = new Error(msg);
          err.shortMessage = msg;
          throw err;
        }

        txHash = response?.data?.userOpHash
          || response?.data?.transactionHash
          || response?.transactionHash
          || response?.data?.hash;

        if (!txHash) {
          const msg = "Transaccion rechazada o cancelada en World App.";
          const err = new Error(msg);
          err.shortMessage = msg;
          throw err;
        }

      } else if (walletClient) {
        // ── External wallet (MetaMask / injected) path ────────────────────────
        toast("Enviando transaccion con wallet conectada...", "info", 12000);
        txHash = await walletClient.writeContract({
          address,
          abi,
          functionName,
          args,
          ...(value !== undefined && value !== null ? { value: BigInt(value) } : {}),
        });

      } else {
        throw new Error(
          "No hay wallet conectada. Abre la app dentro de World App o conecta MetaMask."
        );
      }

      setData(txHash);
      toast("Transaccion enviada. Esperando confirmacion en blockchain...", "success", 7000);
      return txHash;

    } catch (err) {
      const isCancel =
        err?.message?.toLowerCase().includes("cancelad") ||
        err?.message?.toLowerCase().includes("user rejected") ||
        err?.error_code === "user_rejected" ||
        err?.error_code === "user_cancelled";

      const msg = err?.shortMessage || err?.message || "Error al enviar la transaccion.";
      const errObj    = new Error(msg);
      errObj.shortMessage = msg;
      setError(errObj);
      toast(msg, isCancel ? "warning" : "error", 7000);
      throw errObj;
    } finally {
      setIsPending(false);
    }
  };

  return { writeContractAsync, isPending, data, error };
}
