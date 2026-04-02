// UTH₂ Mining V2 Contract — deployed on World Chain (dual-owner, multi-reward-token)
export const UTH2_MINING_ADDRESS  = "0x15D65278b124fF544C1dcf279Cf008Ca24A99bE1";
export const UTH2_TOKEN_ADDRESS   = "0x9ea8653640e22a5b69887985bb75d496dc97022a";
export const BTCH2O_TOKEN_ADDRESS = "0xecc4dae4dc3d359a93046bd944e9ee3421a6a484";

export const OWNER1_ADDRESS = "0x54F0D557E8042eC70974d2e85331BE5D66fFe5F4";
export const OWNER2_ADDRESS = "0x5474c309e985c6b4fc623acf01ade604da781e52";

export const PACKAGE_NAMES  = ["Starter","Basic","Standard","Advanced","Pro","Elite","Master"];
export const PACKAGE_ICONS  = ["🌱","💧","⚡","🔥","💎","👑","🚀"];
export const PACKAGE_COLORS = [
  "#34d399","#38bdf8","#a78bfa","#f59e0b","#f472b6","#fb923c","#00d4ff"
];

export const ERC20_ABI = [
  { inputs:[{name:"owner",type:"address"},{name:"spender",type:"address"}], name:"allowance", outputs:[{type:"uint256"}], stateMutability:"view", type:"function" },
  { inputs:[{name:"spender",type:"address"},{name:"amount",type:"uint256"}], name:"approve",   outputs:[{type:"bool"}],    stateMutability:"nonpayable", type:"function" },
  { inputs:[{name:"account",type:"address"}],                                name:"balanceOf", outputs:[{type:"uint256"}], stateMutability:"view", type:"function" },
  { inputs:[],                                                               name:"decimals",  outputs:[{type:"uint8"}],   stateMutability:"view", type:"function" },
  { inputs:[],                                                               name:"symbol",    outputs:[{type:"string"}],  stateMutability:"view", type:"function" },
  { inputs:[],                                                               name:"name",      outputs:[{type:"string"}],  stateMutability:"view", type:"function" },
];

export const UTH2_MINING_ABI = [
  // ── Views ──────────────────────────────────────────────────────────────────
  { inputs:[{name:"user",type:"address"}], name:"pendingRewards",    outputs:[{type:"uint256"}],             stateMutability:"view", type:"function" },
  { inputs:[{name:"user",type:"address"}], name:"getUserCounts",     outputs:[{internalType:"uint256[7]",name:"",type:"uint256[7]"}], stateMutability:"view", type:"function" },
  { inputs:[{name:"user",type:"address"}], name:"getUserRate",       outputs:[{name:"",type:"uint256"}],     stateMutability:"view", type:"function" },
  { inputs:[],                             name:"getPackages",        outputs:[{internalType:"uint256[7]",name:"prices",type:"uint256[7]"},{internalType:"uint256[7]",name:"rates",type:"uint256[7]"}], stateMutability:"view", type:"function" },
  { inputs:[],                             name:"poolBalance",        outputs:[{type:"uint256"}],             stateMutability:"view", type:"function" },
  { inputs:[],                             name:"totalUTH2Collected", outputs:[{type:"uint256"}],             stateMutability:"view", type:"function" },
  { inputs:[],                             name:"owner1",             outputs:[{type:"address"}],             stateMutability:"view", type:"function" },
  { inputs:[],                             name:"owner2",             outputs:[{type:"address"}],             stateMutability:"view", type:"function" },
  { inputs:[],                             name:"primaryToken",       outputs:[{type:"address"}],             stateMutability:"view", type:"function" },
  { inputs:[],                             name:"getRewardTokens",    outputs:[{type:"address[]"}],           stateMutability:"view", type:"function" },
  { inputs:[],                             name:"getContractBalances", outputs:[{name:"tokens",type:"address[]"},{name:"balances",type:"uint256[]"}], stateMutability:"view", type:"function" },
  { inputs:[{name:"",type:"uint256"}],     name:"packages",           outputs:[{name:"price",type:"uint256"},{name:"ratePerYear",type:"uint256"}], stateMutability:"view", type:"function" },
  { inputs:[{name:"token",type:"address"}],name:"isRewardToken",      outputs:[{type:"bool"}],               stateMutability:"view", type:"function" },

  // ── User writes ────────────────────────────────────────────────────────────
  { inputs:[{name:"pkg",type:"uint8"},{name:"count",type:"uint256"}], name:"buyPackage",   outputs:[], stateMutability:"nonpayable", type:"function" },
  { inputs:[],                                                          name:"claimRewards", outputs:[], stateMutability:"nonpayable", type:"function" },

  // ── Owner1-only writes ─────────────────────────────────────────────────────
  { inputs:[{name:"pkg",type:"uint8"},{name:"price",type:"uint256"},{name:"rate",type:"uint256"}], name:"setPackage", outputs:[], stateMutability:"nonpayable", type:"function" },
  { inputs:[{internalType:"uint256[7]",name:"prices",type:"uint256[7]"},{internalType:"uint256[7]",name:"rates",type:"uint256[7]"}], name:"setAllPackages", outputs:[], stateMutability:"nonpayable", type:"function" },
  { inputs:[{name:"newOwner",type:"address"}], name:"transferOwner1", outputs:[], stateMutability:"nonpayable", type:"function" },
  { inputs:[{name:"newOwner2",type:"address"}], name:"setOwner2",     outputs:[], stateMutability:"nonpayable", type:"function" },

  // ── Both-owner writes ──────────────────────────────────────────────────────
  { inputs:[{name:"token",type:"address"},{name:"amount",type:"uint256"}], name:"fundPool",         outputs:[], stateMutability:"nonpayable", type:"function" },
  { inputs:[{name:"token",type:"address"}],                                 name:"addRewardToken",   outputs:[], stateMutability:"nonpayable", type:"function" },
  { inputs:[{name:"token",type:"address"}],                                 name:"removeRewardToken",outputs:[], stateMutability:"nonpayable", type:"function" },
  { inputs:[{name:"token",type:"address"},{name:"amount",type:"uint256"}],  name:"rescueToken",      outputs:[], stateMutability:"nonpayable", type:"function" },

  // ── Events ─────────────────────────────────────────────────────────────────
  { anonymous:false, inputs:[{indexed:true,name:"user",type:"address"},{name:"pkg",type:"uint8"},{name:"count",type:"uint256"},{name:"cost",type:"uint256"}],                  name:"PackageBought",     type:"event" },
  { anonymous:false, inputs:[{indexed:true,name:"user",type:"address"},{name:"amount",type:"uint256"},{indexed:true,name:"token",type:"address"}],                             name:"RewardsClaimed",    type:"event" },
  { anonymous:false, inputs:[{indexed:true,name:"token",type:"address"},{name:"amount",type:"uint256"},{indexed:true,name:"funder",type:"address"}],                           name:"PoolFunded",        type:"event" },
  { anonymous:false, inputs:[{indexed:true,name:"token",type:"address"}],                                                                                                      name:"RewardTokenAdded",  type:"event" },
  { anonymous:false, inputs:[{indexed:true,name:"token",type:"address"}],                                                                                                      name:"RewardTokenRemoved",type:"event" },
];
