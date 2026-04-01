import { useReadContract, useWaitForTransactionReceipt } from "wagmi";
import { parseGwei, getAddress } from "viem";
import { CONTRACT_ABI, CONTRACT_ADDRESS } from "../config/contract.js";
import { useTxConfirm } from "../context/TxConfirmContext.jsx";
import { useWallet } from "../context/WalletContext.jsx";
import { useMiniKitWrite } from "./useMiniKitWrite.js";

export const GAS_PARAMS = {
  gas:                    500_000n,
  maxFeePerGas:           parseGwei("0.001"),
  maxPriorityFeePerGas:   parseGwei("0.001"),
};

export function useContractRead(functionName, args = [], watch = false) {
  return useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName,
    args,
    query: { refetchInterval: watch ? 8000 : false },
  });
}

export function useContractWrite() {
  const { writeContractAsync, data: hash, isPending, error } = useMiniKitWrite();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  const { confirmTx } = useTxConfirm();

  const write = async (functionName, args = [], actionLabel) => {
    const label = actionLabel || `Ejecutar ${functionName}`;
    const ok = await confirmTx(label);
    if (!ok) return null;

    return writeContractAsync({
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName,
      args,
    });
  };

  return { write, hash, isPending, isConfirming, isSuccess, error };
}

export function useIsOwner() {
  const { address } = useWallet();
  const { data } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: "isOwner",
    args: [address ?? getAddress("0x0000000000000000000000000000000000000000")],
    query: { enabled: !!address, refetchInterval: 20000 },
  });
  return !!data;
}

export function useIsPrimaryOwner() {
  const { address } = useWallet();
  const { data } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: "primaryOwner",
  });
  return address && data && address.toLowerCase() === data.toLowerCase();
}
