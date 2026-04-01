import { useState } from "react";
import { MiniKit } from "@worldcoin/minikit-js";

function serializeArgs(args) {
  if (!args || !Array.isArray(args)) return [];
  return args.map((arg) => {
    if (typeof arg === "bigint") return arg.toString();
    if (Array.isArray(arg)) return serializeArgs(arg);
    return arg;
  });
}

export function useMiniKitWrite() {
  const [isPending, setIsPending] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const writeContractAsync = async ({ address, abi, functionName, args = [] }) => {
    setIsPending(true);
    setData(null);
    setError(null);
    try {
      const { finalPayload } = await MiniKit.commandsAsync.sendTransaction({
        transaction: [
          {
            address,
            abi,
            functionName,
            args: serializeArgs(args),
          },
        ],
      });

      if (!finalPayload || finalPayload.status === "error") {
        const msg = finalPayload?.message || "Transacción rechazada";
        const err = new Error(msg);
        err.shortMessage = msg;
        setError(err);
        throw err;
      }

      const txHash = finalPayload?.transaction_id;
      if (!txHash) {
        const err = new Error("No se recibió el hash de transacción");
        err.shortMessage = "No se recibió el hash de transacción";
        setError(err);
        throw err;
      }

      setData(txHash);
      return txHash;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setIsPending(false);
    }
  };

  return { writeContractAsync, isPending, data, error };
}
