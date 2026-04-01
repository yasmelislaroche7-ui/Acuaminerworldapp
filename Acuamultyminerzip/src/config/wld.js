import { getAddress } from "viem";
import { SIMPLE_STAKING_ABI, ERC20_ABI } from "./simple_staking_abi.js";

export const WLD_TOKEN_ADDRESS   = getAddress("0x2cFc85d8E48F8EAB294be644d9E25C3030863003");
export const WLD_STAKING_ADDRESS = getAddress("0xba3f717C83241E21e3026dBFB69ac2167f11Cf0A");
export const WLD_DECIMALS = 18;
export const WLD_SYMBOL   = "WLD";

export const WLD_STAKING_ABI = SIMPLE_STAKING_ABI;
export const WLD_TOKEN_ABI   = ERC20_ABI;
