export const SUSHI_TOKEN_ADDRESS   = "0xab09a728e53d3d6bc438be95eed46da0bbe7fb38";
export const SUSHI_STAKING_ADDRESS = "0x500ec550891d8f03ddd32d5854a3b15d052299ca";

export const SUSHI_TOKEN_ABI = [
  { inputs: [], name: "claim", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ internalType: "uint256", name: "amount", type: "uint256" }], name: "burn", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ internalType: "address", name: "account", type: "address" }], name: "balanceOf", outputs: [{ internalType: "uint256", name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "decimals", outputs: [{ internalType: "uint8", name: "", type: "uint8" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "name", outputs: [{ internalType: "string", name: "", type: "string" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "symbol", outputs: [{ internalType: "string", name: "", type: "string" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "totalSupply", outputs: [{ internalType: "uint256", name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "address", name: "owner", type: "address" }, { internalType: "address", name: "spender", type: "address" }], name: "allowance", outputs: [{ internalType: "uint256", name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "address", name: "spender", type: "address" }, { internalType: "uint256", name: "amount", type: "uint256" }], name: "approve", outputs: [{ internalType: "bool", name: "", type: "bool" }], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ internalType: "address", name: "user", type: "address" }], name: "viewBlocksUntilClaim", outputs: [{ internalType: "uint256", name: "", type: "uint256" }], stateMutability: "view", type: "function" }
];

export const SUSHI_STAKING_ABI = [
  {
    inputs: [
      { internalType: "uint256", name: "amount", type: "uint256" },
      { internalType: "uint8", name: "membership_id", type: "uint8" }
    ],
    name: "buyMembership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "retirarIntereses",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ internalType: "uint256", name: "amount", type: "uint256" }],
    name: "retirarBalance",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ internalType: "address", name: "user", type: "address" }],
    name: "currentReward",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ internalType: "address", name: "user", type: "address" }],
    name: "getUserInfo",
    outputs: [
      {
        components: [
          { internalType: "uint256", name: "intereses", type: "uint256" },
          { internalType: "uint256", name: "balance", type: "uint256" },
          { internalType: "uint256", name: "startBlock", type: "uint256" },
          { internalType: "uint256", name: "lastClaimIntereses", type: "uint256" },
          { internalType: "uint256", name: "lastClaimBalance", type: "uint256" },
          { internalType: "uint8",   name: "membership", type: "uint8" }
        ],
        internalType: "struct IStaking.UserInfo",
        name: "",
        type: "tuple"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ internalType: "uint8", name: "id", type: "uint8" }],
    name: "MembershipTable",
    outputs: [
      {
        components: [
          { internalType: "uint16",  name: "APY",      type: "uint16" },
          { internalType: "uint256", name: "cost",     type: "uint256" },
          { internalType: "uint256", name: "APY_Block", type: "uint256" },
          { internalType: "uint256", name: "cantidad", type: "uint256" }
        ],
        internalType: "struct IStaking.MembershipInfo",
        name: "",
        type: "tuple"
      }
    ],
    stateMutability: "view",
    type: "function"
  }
];
