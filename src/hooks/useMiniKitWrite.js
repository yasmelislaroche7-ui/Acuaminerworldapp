import { useState } from "react";
import { MiniKit } from "@worldcoin/minikit-js";
import { useWalletClient } from "wagmi";
import { toast } from "../context/ToastContext.jsx";
import { useTxConfirm } from "../context/TxConfirmContext.jsx";

function friendlyMiniKitError(code) {
  switch (code) {
    case "user_rejected":
    case "user_cancelled":
      return "Transacción cancelada por el usuario.";
    case "invalid_contract":
      return "Contrato no verificado en World App. Usa una wallet externa para esta operación.";
    case "disallowed_operation":
    case "malicious_operation":
      return "Operación no permitida por World App para este contrato.";
    case "insufficient_balance":
      return "Balance insuficiente en tu wallet.";
    case "simulation_failed":
      return "La simulación de la transacción falló. Verifica que tengas fondos suficientes.";
    case "transaction_failed":
      return "La transacción falló en la blockchain. Reintenta en un momento.";
    case "daily_tx_limit_reached":
      return "Límite diario de transacciones de World App alcanzado. Intenta mañana.";
    case "validation_error":
    case "input_error":
      return "Error en los parámetros de la transacción.";
    case "network_error":
      return "Error de red. Verifica tu conexión e intenta de nuevo.";
    case "generic_error":
    default:
      return code
        ? `World App rechazó la transacción (${code}).`
        : "World App rechazó la transacción.";
  }
}

function isMK() {
  try { return MiniKit.isInstalled(); } catch { return false; }
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
      let txHash;

      if (isMK()) {
        toast("Enviando transacción a World App…", "info", 14000);

        const txEntry = {
          address,
          abi,
          functionName,
          args,
        };
        if (value !== undefined && value !== null && value !== 0n) {
          txEntry.value = "0x" + BigInt(value).toString(16);
        }

        let commandPayload, finalPayload;
        try {
          ({ commandPayload, finalPayload } = await MiniKit.commandsAsync.sendTransaction({
            transaction: [txEntry],
          }));
        } catch (mkErr) {
          const code = mkErr?.error_code || mkErr?.code || mkErr?.message;
          const msg  = friendlyMiniKitError(code) || mkErr?.message || "Error al enviar en World App.";
          const err  = new Error(msg);
          err.shortMessage = msg;
          throw err;
        }

        if (!finalPayload || finalPayload.status === "error") {
          const code = finalPayload?.error_code;
          const msg  = friendlyMiniKitError(code);
          const err  = new Error(msg);
          err.shortMessage = msg;
          throw err;
        }

        txHash = finalPayload.transaction_id
          || finalPayload.transactionHash
          || finalPayload.transaction_hash;

        if (!txHash) {
          const msg = "Transacción rechazada o cancelada en World App.";
          const err = new Error(msg);
          err.shortMessage = msg;
          throw err;
        }

      } else if (walletClient) {
        toast("Enviando transacción con wallet conectada…", "info", 12000);
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
      toast("✅ Transacción enviada — confirmando en blockchain…", "success", 7000);
      return txHash;

    } catch (err) {
      const isCancel =
        err?.message?.toLowerCase().includes("cancelad") ||
        err?.message?.toLowerCase().includes("user rejected") ||
        err?.error_code === "user_rejected" ||
        err?.error_code === "user_cancelled";

      const msg = err?.shortMessage || err?.message || "Error al enviar la transacción.";
      const errObj = new Error(msg);
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
