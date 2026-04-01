import { useReadContract, useWaitForTransactionReceipt } from "wagmi";
import { ACUA_STAKING_ADDRESS, STAKING_ABI, ERC20_ABI } from "../config/staking.js";
import { maxUint256 } from "viem";
import { useTxConfirm } from "../context/TxConfirmContext.jsx";
import { useWallet } from "../context/WalletContext.jsx";
import { useMiniKitWrite } from "./useMiniKitWrite.js";

export function useStakingRead(address, functionName, args = []) {
  return useReadContract({
    address,
    abi: STAKING_ABI,
    functionName,
    args,
    query: { refetchInterval: 12000 },
  });
}

export function useERC20Read(tokenAddress, functionName, args = []) {
  return useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName,
    args,
    query: { refetchInterval: 12000, enabled: !!tokenAddress },
  });
}

export function useStakingWrite() {
  const { writeContractAsync, data: hash, isPending, error } = useMiniKitWrite();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  const { confirmTx } = useTxConfirm();

  const stakeCall = async (contractAddress, functionName, args = [], abi = STAKING_ABI, actionLabel) => {
    const label = actionLabel || `Staking: ${functionName}`;
    const ok = await confirmTx(label);
    if (!ok) return null;
    return writeContractAsync({ address: contractAddress, abi, functionName, args });
  };

  return { stakeCall, hash, isPending, isConfirming, isSuccess, error };
}

export function useApprove() {
  const { writeContractAsync, isPending } = useMiniKitWrite();
  const { confirmTx } = useTxConfirm();

  const approve = async (tokenAddress, spender, amount = maxUint256) => {
    const ok = await confirmTx("Aprobar tokens para el contrato de staking");
    if (!ok) return null;
    return writeContractAsync({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [spender, amount],
    });
  };

  return { approve, isPending };
}

export function useAcuaStaking() {
  const { address } = useWallet();
  const userAddr = address ?? "0x0000000000000000000000000000000000000000";

  const { data: stakingToken } = useStakingRead(ACUA_STAKING_ADDRESS, "stakingToken");
  const { data: apr } = useStakingRead(ACUA_STAKING_ADDRESS, "apr");
  const { data: stakedBalance, refetch: refetchStaked } = useStakingRead(ACUA_STAKING_ADDRESS, "stakedBalance", [userAddr]);
  const { data: pendingRewards, refetch: refetchRewards } = useStakingRead(ACUA_STAKING_ADDRESS, "pendingRewards", [userAddr]);

  const { data: tokenSymbol } = useERC20Read(stakingToken, "symbol");
  const { data: tokenBalance, refetch: refetchBalance } = useERC20Read(stakingToken, "balanceOf", [userAddr]);
  const { data: tokenDecimals } = useERC20Read(stakingToken, "decimals");
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: stakingToken,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [userAddr, ACUA_STAKING_ADDRESS],
    query: { refetchInterval: 12000, enabled: !!stakingToken && !!address },
  });

  const refetchAll = () => {
    refetchStaked();
    refetchRewards();
    refetchBalance();
    refetchAllowance();
  };

  return {
    stakingToken,
    tokenSymbol,
    tokenBalance,
    tokenDecimals,
    apr,
    stakedBalance,
    pendingRewards,
    allowance,
    refetchAll,
  };
}
