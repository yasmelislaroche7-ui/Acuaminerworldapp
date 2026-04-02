// UTH₂ Mining Contract — deployed on World Chain
export const UTH2_MINING_ADDRESS = "0x8e934842ef39777d072e25c8bb67702fb7e81854";
export const UTH2_TOKEN_ADDRESS  = "0x9ea8653640e22a5b69887985bb75d496dc97022a";
export const BTCH2O_TOKEN_ADDRESS = "0xecc4dae4dc3d359a93046bd944e9ee3421a6a484";

// Package definitions (mirrors on-chain data; updated via owner setPackage)
export const PACKAGE_NAMES = [
  "Starter", "Basic", "Standard", "Advanced", "Pro", "Elite", "Master"
];

export const PACKAGE_ICONS = ["🌱","💧","⚡","🔥","💎","👑","🚀"];
export const PACKAGE_COLORS = [
  "#34d399","#38bdf8","#a78bfa","#f59e0b","#f472b6","#fb923c","#00d4ff"
];

export const ERC20_ABI = [
  { inputs:[{name:"owner",type:"address"},{name:"spender",type:"address"}], name:"allowance", outputs:[{type:"uint256"}], stateMutability:"view", type:"function" },
  { inputs:[{name:"spender",type:"address"},{name:"amount",type:"uint256"}], name:"approve", outputs:[{type:"bool"}], stateMutability:"nonpayable", type:"function" },
  { inputs:[{name:"account",type:"address"}], name:"balanceOf", outputs:[{type:"uint256"}], stateMutability:"view", type:"function" },
  { inputs:[], name:"decimals", outputs:[{type:"uint8"}], stateMutability:"view", type:"function" },
];

export const UTH2_MINING_ABI = [
  // views
  { inputs:[{name:"user",type:"address"}], name:"pendingRewards",  outputs:[{type:"uint256"}], stateMutability:"view", type:"function" },
  { inputs:[{name:"user",type:"address"}], name:"getUserCounts",   outputs:[{internalType:"uint256[7]",name:"",type:"uint256[7]"}], stateMutability:"view", type:"function" },
  { inputs:[{name:"user",type:"address"}], name:"getUserRate",     outputs:[{name:"ratePerYear",type:"uint256"}], stateMutability:"view", type:"function" },
  { inputs:[], name:"getPackages", outputs:[{internalType:"uint256[7]",name:"prices",type:"uint256[7]"},{internalType:"uint256[7]",name:"rates",type:"uint256[7]"}], stateMutability:"view", type:"function" },
  { inputs:[], name:"poolBalance",  outputs:[{type:"uint256"}], stateMutability:"view", type:"function" },
  { inputs:[], name:"totalUTH2Collected", outputs:[{type:"uint256"}], stateMutability:"view", type:"function" },
  { inputs:[], name:"owner",        outputs:[{type:"address"}], stateMutability:"view", type:"function" },
  { inputs:[{name:"",type:"uint256"}], name:"packages", outputs:[{name:"price",type:"uint256"},{name:"ratePerYear",type:"uint256"}], stateMutability:"view", type:"function" },
  // user writes
  { inputs:[{name:"pkg",type:"uint8"},{name:"count",type:"uint256"}], name:"buyPackage", outputs:[], stateMutability:"nonpayable", type:"function" },
  { inputs:[], name:"claimRewards", outputs:[], stateMutability:"nonpayable", type:"function" },
  // owner writes
  { inputs:[{name:"pkg",type:"uint8"},{name:"price",type:"uint256"},{name:"rate",type:"uint256"}], name:"setPackage", outputs:[], stateMutability:"nonpayable", type:"function" },
  { inputs:[{internalType:"uint256[7]",name:"prices",type:"uint256[7]"},{internalType:"uint256[7]",name:"rates",type:"uint256[7]"}], name:"setAllPackages", outputs:[], stateMutability:"nonpayable", type:"function" },
  { inputs:[{name:"amount",type:"uint256"}], name:"fundPool", outputs:[], stateMutability:"nonpayable", type:"function" },
  { inputs:[], name:"withdrawUTH2", outputs:[], stateMutability:"nonpayable", type:"function" },
  { inputs:[{name:"newOwner",type:"address"}], name:"transferOwnership", outputs:[], stateMutability:"nonpayable", type:"function" },
  // events
  { anonymous:false, inputs:[{indexed:true,name:"user",type:"address"},{name:"pkg",type:"uint8"},{name:"count",type:"uint256"},{name:"cost",type:"uint256"}], name:"PackageBought", type:"event" },
  { anonymous:false, inputs:[{indexed:true,name:"user",type:"address"},{name:"amount",type:"uint256"}], name:"RewardsClaimed", type:"event" },
];
