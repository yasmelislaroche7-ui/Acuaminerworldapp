// Test script - verifies staking, approve, and claim flows on World Chain
require("dotenv").config();
const { ethers } = require("ethers");

const RPC = "https://worldchain-mainnet.g.alchemy.com/public";
const CHAIN_ID = 480;

const ACUA_STAKING   = "0x6d6d559bf261415a52c59cb1617387b6534e5041";
const UTH2_MINING    = "0x15D65278b124fF544C1dcf279Cf008Ca24A99bE1";
const UTH2_TOKEN     = "0x9eA8653640E22A5b69887985BB75d496dc97022a";
const BTCH2O_TOKEN   = "0xEcC4dAe4DC3D359a93046bd944e9ee3421A6A484";
const MINING_H2O     = "0xb05dBb16D0b26F03D63500af89dda1da5e212645";
const WLD_TOKEN      = "0x2cFc85d8E48F8EAB294be644d9E25C3030863003";
const H2O_TOKEN      = "0x17392e5483983945dEB92e0518a8F2C4eB6bA59d";

const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
];

const STAKING_ABI = [
  "function stakingToken() view returns (address)",
  "function apr() view returns (uint256)",
  "function stakedBalance(address) view returns (uint256)",
  "function pendingRewards(address) view returns (uint256)",
  "function totalStaked() view returns (uint256)",
  "function stake(uint256 amount)",
  "function claim()",
];

const UTH2_MINING_ABI = [
  "function pendingRewards(address user) view returns (uint256)",
  "function getUserCounts(address user) view returns (uint256[7])",
  "function getUserRate(address user) view returns (uint256)",
  "function getPackages() view returns (uint256[7] prices, uint256[7] rates)",
  "function poolBalance() view returns (uint256)",
  "function totalUTH2Collected() view returns (uint256)",
  "function claimRewards()",
];

const H2O_MINING_ABI = [
  "function pendingRewards(address) view returns (uint256 h2oAmt, uint256 btch2oAmt)",
  "function users(address) view returns (uint256 power, uint256 lastClaimed, uint256 pendingH2O, uint256 pendingBTCH2O)",
  "function packagePriceWLD() view returns (uint256)",
  "function totalPower() view returns (uint256)",
  "function claimRewards()",
];

function fmt(val, dec, dp) {
  dec = (dec === undefined) ? 18 : dec;
  dp  = (dp  === undefined) ? 4  : dp;
  try { return parseFloat(ethers.formatUnits(val, dec)).toFixed(dp); } catch(e) { return "-"; }
}

async function main() {
  const pk = process.env.PRIVATE_KEY;
  if (!pk) { console.error("No PRIVATE_KEY in env"); process.exit(1); }

  const provider = new ethers.JsonRpcProvider(RPC, CHAIN_ID);
  const signer   = new ethers.Wallet(pk, provider);
  const addr     = signer.address;

  console.log("\n=============================================");
  console.log("  Acua Company - On-Chain Flow Test");
  console.log("=============================================");
  console.log("  Wallet: " + addr);

  const ethBal = await provider.getBalance(addr);
  console.log("\n[ETH] Balance: " + fmt(ethBal) + " ETH (World Chain " + CHAIN_ID + ")");
  if (ethBal < ethers.parseEther("0.0001")) console.log("  WARNING: ETH bajo");

  // Token balances
  const tokens = [
    { name: "UTH2",   addr: UTH2_TOKEN   },
    { name: "BTCH2O", addr: BTCH2O_TOKEN },
    { name: "WLD",    addr: WLD_TOKEN    },
    { name: "H2O",    addr: H2O_TOKEN    },
  ];
  console.log("\n[Tokens]");
  for (var i = 0; i < tokens.length; i++) {
    var t = tokens[i];
    try {
      var c   = new ethers.Contract(t.addr, ERC20_ABI, provider);
      var bal = await c.balanceOf(addr);
      var dec = await c.decimals();
      console.log("  " + t.name + ": " + fmt(bal, Number(dec)));
    } catch(e) { console.log("  " + t.name + ": ERROR " + e.message.slice(0,80)); }
  }

  // ACUA Staking
  console.log("\n[ACUA Staking]");
  try {
    var staking = new ethers.Contract(ACUA_STAKING, STAKING_ABI, provider);
    var tkAddr  = await staking.stakingToken();
    var tkC     = new ethers.Contract(tkAddr, ERC20_ABI, provider);
    var sym     = await tkC.symbol().catch(function(){ return "TOKEN"; });
    var dec2    = Number(await tkC.decimals().catch(function(){ return 18n; }));
    var apr     = await staking.apr();
    var staked  = await staking.stakedBalance(addr);
    var rewards = await staking.pendingRewards(addr);
    var total   = await staking.totalStaked();
    var walBal  = await tkC.balanceOf(addr);
    var allw    = await tkC.allowance(addr, ACUA_STAKING);

    console.log("  Token staking: " + sym + " " + tkAddr);
    console.log("  APR: " + (Number(apr)/100).toFixed(2) + "%");
    console.log("  Tu stake: " + fmt(staked, dec2) + " " + sym);
    console.log("  Rewards pendientes: " + fmt(rewards, dec2) + " " + sym);
    console.log("  Total global: " + fmt(total, dec2));
    console.log("  Tu wallet: " + fmt(walBal, dec2) + " " + sym);
    console.log("  Allowance->staking: " + fmt(allw, dec2));

    if (rewards > 0n) {
      console.log("\n  -> Reclamando rewards ACUA staking...");
      var clTx = await staking.connect(signer).claim({ gasLimit: 200000n });
      console.log("  -> TX: " + clTx.hash);
      var cr = await clTx.wait();
      console.log("  OK bloque=" + cr.blockNumber + " gas=" + cr.gasUsed.toString());
    } else {
      console.log("  (sin rewards ahora)");
    }

    if (walBal > 0n && staked === 0n) {
      var stakeAmt = walBal / 1000n;
      if (allw < stakeAmt) {
        console.log("\n  -> Aprobando " + sym + "...");
        var appTx = await tkC.connect(signer).approve(ACUA_STAKING, ethers.MaxUint256, { gasLimit: 100000n });
        console.log("  -> Approve TX: " + appTx.hash);
        await appTx.wait();
        console.log("  OK Approve");
      }
      console.log("  -> Stakeando " + fmt(stakeAmt, dec2) + " " + sym + "...");
      var stTx = await staking.connect(signer).stake(stakeAmt, { gasLimit: 300000n });
      console.log("  -> Stake TX: " + stTx.hash);
      var sr = await stTx.wait();
      console.log("  OK Stake bloque=" + sr.blockNumber + " gas=" + sr.gasUsed.toString());
    }
  } catch(e) { console.log("  ERROR: " + e.message.slice(0,120)); }

  // UTH2 Mining
  console.log("\n[UTH2 Mining]");
  try {
    var utM     = new ethers.Contract(UTH2_MINING, UTH2_MINING_ABI, provider);
    var pkgs    = await utM.getPackages();
    var counts  = await utM.getUserCounts(addr);
    var utPend  = await utM.pendingRewards(addr);
    var pool    = await utM.poolBalance();
    var coll    = await utM.totalUTH2Collected();

    console.log("  Pool BTCH2O: " + fmt(pool));
    console.log("  UTH2 recaudado: " + fmt(coll));
    console.log("  Tus rewards: " + fmt(utPend) + " BTCH2O");
    console.log("  Paquetes: [" + counts.map(function(c){return c.toString();}).join(", ") + "]");
    console.log("  Precios[0-2]: " + [0,1,2].map(function(j){return fmt(pkgs[0][j]);}).join(", ") + " UTH2");

    var uth2c = new ethers.Contract(UTH2_TOKEN, ERC20_ABI, provider);
    console.log("  Tu UTH2: " + fmt(await uth2c.balanceOf(addr)));
    console.log("  Allowance->mining: " + fmt(await uth2c.allowance(addr, UTH2_MINING)));

    if (utPend > 0n) {
      console.log("\n  -> Reclamando " + fmt(utPend) + " BTCH2O de UTH2 Mining...");
      var utTx = await utM.connect(signer).claimRewards({ gasLimit: 300000n });
      console.log("  -> TX: " + utTx.hash);
      var ur = await utTx.wait();
      console.log("  OK bloque=" + ur.blockNumber + " gas=" + ur.gasUsed.toString());
    } else {
      console.log("  (sin rewards en UTH2 Mining)");
    }
  } catch(e) { console.log("  ERROR: " + e.message.slice(0,120)); }

  // H2O Mining
  console.log("\n[H2O Mining]");
  try {
    var hM     = new ethers.Contract(MINING_H2O, H2O_MINING_ABI, provider);
    var hUser  = await hM.users(addr);
    var hPend  = await hM.pendingRewards(addr);
    var hPrice = await hM.packagePriceWLD();
    var hTotal = await hM.totalPower();

    console.log("  Tu poder: " + hUser[0].toString());
    console.log("  Precio paquete: " + fmt(hPrice) + " WLD");
    console.log("  Total poder red: " + hTotal.toString());
    console.log("  Rewards: " + fmt(hPend[0]) + " H2O | " + fmt(hPend[1]) + " BTCH2O");

    var wld2 = new ethers.Contract(WLD_TOKEN, ERC20_ABI, provider);
    console.log("  Tu WLD: " + fmt(await wld2.balanceOf(addr)));

    if (hPend[0] > 0n || hPend[1] > 0n) {
      console.log("\n  -> Reclamando rewards H2O Mining...");
      var hTx = await hM.connect(signer).claimRewards({ gasLimit: 300000n });
      console.log("  -> TX: " + hTx.hash);
      var hr = await hTx.wait();
      console.log("  OK bloque=" + hr.blockNumber + " gas=" + hr.gasUsed.toString());
    } else {
      console.log("  (sin rewards en H2O Mining)");
    }
  } catch(e) { console.log("  ERROR: " + e.message.slice(0,120)); }

  console.log("\n=============================================");
  console.log("  Prueba completada OK");
  console.log("=============================================\n");
}

main().catch(function(e){ console.error("Fatal: " + e.message); process.exit(1); });
