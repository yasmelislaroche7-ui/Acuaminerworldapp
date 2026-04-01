import { getAddress } from "viem";
import { SIMPLE_STAKING_ABI, ERC20_ABI } from "./simple_staking_abi.js";

export const USDC_TOKEN_ADDRESS   = getAddress("0x79A02482A880bCE3F13e09Da970dC34db4CD24d1");
export const USDC_STAKING_ADDRESS = getAddress("0x7710c8daFF98380cEAC64a1568C89Af62bBE3Fb4");
export const USDC_DECIMALS = 6;
export const USDC_SYMBOL   = "USDC";

export const USDC_STAKING_ABI = SIMPLE_STAKING_ABI;
export const USDC_TOKEN_ABI   = ERC20_ABI;
