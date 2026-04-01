import { getAddress } from "viem";
import { SIMPLE_STAKING_ABI, ERC20_ABI } from "./simple_staking_abi.js";

export const WARS_TOKEN_ADDRESS   = getAddress("0x0dc4f92879b7670e5f4e4e6e3c801d229129d90d");
export const WARS_STAKING_ADDRESS = getAddress("0x77D71AeAe97eDD49d0cA15C619fe25ED792674DA");
export const WARS_DECIMALS = 18;
export const WARS_SYMBOL   = "wARS";

export const WARS_STAKING_ABI = SIMPLE_STAKING_ABI;
export const WARS_TOKEN_ABI   = ERC20_ABI;
