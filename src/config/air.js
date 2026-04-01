import { getAddress } from "viem";
import { AIR_STAKING_ABI, ERC20_ABI } from "./simple_staking_abi.js";

export const AIR_TOKEN_ADDRESS   = getAddress("0xDBA88118551d5Adf16a7AB943403Aea7ea06762b");
export const AIR_STAKING_ADDRESS = getAddress("0xc08aF637235dCe052C84819a56D1A482035940A7");
export const AIR_DECIMALS = 18;
export const AIR_SYMBOL   = "AIR";

export { AIR_STAKING_ABI };
export const AIR_TOKEN_ABI = ERC20_ABI;
