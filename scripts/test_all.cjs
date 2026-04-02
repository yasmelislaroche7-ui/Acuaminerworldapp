// Full on-chain test: all stakes, H2O Mining buy, UTH2 setPackage/buy/fund/claim
require("dotenv").config();
const { ethers } = require("ethers");

const RPC      = "https://worldchain-mainnet.g.alchemy.com/v2/bVo646pb8L7_W_nahCoqW";
const CHAIN_ID = 480;

// ── ABIs ─────────────────────────────────────────────────────────────────────
const ERC20 = [
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address,address) view returns (uint256)",
  "function approve(address,uint256) returns (bool)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
];
const STAKING = [
  "function stakingToken() view returns (address)",
  "function stakedBalance(address) view returns (uint256)",
  "function pendingRewards(address) view returns (uint256)",
  "function stake(uint256)",
  "function claim()",
];
const MINING_ABI = [
  "function buyPackage(uint256 units)",
  "function claimRewards()",
  "function pendingRewards(address) view returns (uint256 h2o, uint256 btch2o)",
  "function users(address) view returns (uint256 power,uint256 lastClaimed,uint256 pendingH2O,uint256 pendingBTCH2O)",
  "function packagePriceWLD() view returns (uint256)",
  "function totalPower() view returns (uint256)",
  "function h2oPool() view returns (uint256)",
  "function btch2oPool() view returns (uint256)",
  "function fundH2O(uint256)",
  "function fundBTCH2O(uint256)",
];
const UTH2_ABI = [
  "function getPackages() view returns (uint256[7] prices, uint256[7] rates)",
  "function getUserCounts(address) view returns (uint256[7])",
  "function pendingRewards(address) view returns (uint256)",
  "function poolBalance() view returns (uint256)",
  "function buyPackage(uint8,uint256)",
  "function claimRewards()",
  "function setPackage(uint8,uint256,uint256)",
  "function fundPool(address,uint256)",
  "function owner1() view returns (address)",
];

// ── Addresses ─────────────────────────────────────────────────────────────────
const ADDR = {
  // Staking contracts [stakingContract, tokenAddress, decimals, symbol, stakeAmount]
  H2O:   ["0x6d6d559bf261415a52c59cb1617387b6534e5041", "0x17392e5483983945dEB92e0518a8F2C4eB6bA59d", 18, "H2O",    ethers.parseEther("1")],
  BTCH2O:["0x6d75242b5288b722c6e7f13cd706bfb8880bff4a", "0xecc4dae4dc3d359a93046bd944e9ee3421a6a484", 18, "BTCH2O", ethers.parseEther("1")],
  FIRE:  ["0x0642b285816de5393726393c55f19fab2c81b070", "0x22c40632c13a7f3cae9c343480607d886832c686", 18, "FIRE",   ethers.parseEther("1")],
  AIR:   ["0xc08af637235dce052c84819a56d1a482035940a7", "0xdba88118551d5adf16a7ab943403aea7ea06762b", 18, "AIR",    ethers.parseEther("1")],
  SUSHI: ["0x500ec550891d8f03ddd32d5854a3b15d052299ca", "0xab09a728e53d3d6bc438be95eed46da0bbe7fb38", 18, "SUSHI",  ethers.parseEther("1")],
  USDC:  ["0x7710c8daff98380ceac64a1568c89af62bbe3fb4", "0x79a02482a880bce3f13e09da970dc34db4cd24d1",  6, "USDC",   1000000n],
  WLD:   ["0xba3f717c83241e21e3026dbfb69ac2167f11cf0a", "0x2cfc85d8e48f8eab294be644d9e25c3030863003", 18, "WLD",    ethers.parseEther("0.1")],
  wARS:  ["0x77d71aeae97edd49d0ca15c619fe25ed792674da", "0x0dc4f92879b7670e5f4e4e6e3c801d229129d90d", 18, "wARS",   ethers.parseEther("1")],
  wCOP:  ["0x396f7768102878831a4a1dea65c3d198e353664f", "0x8a1d45e102e886510e891d2ec656a708991e2d76", 18, "wCOP",   ethers.parseEther("1")],
  TIME:  ["0x17e32c9e063533529f802839b9ba93e70d8953fe", "0x212d7448720852d8ad282a5d4a895b3461f9076e", 18, "TIME",   ethers.parseEther("1")],
};

const H2O_MINING   = "0xb05dBb16D0b26F03D63500af89dda1da5e212645";
const UTH2_MINING  = "0x15D65278b124fF544C1dcf279Cf008Ca24A99bE1";
const UTH2_TOKEN   = "0x9eA8653640E22A5b69887985BB75d496dc97022a";
const BTCH2O_TOKEN = "0xecc4dae4dc3d359a93046bd944e9ee3421a6a484";
const WLD_TOKEN    = "0x2cfc85d8e48f8eab294be644d9e25c3030863003";

const fmt = function(v, d) {
  try { return parseFloat(ethers.formatUnits(v, d === undefined ? 18 : d)).toFixed(4); }
  catch(e) { return "-"; }
};

async function tx(label, fn) {
  try {
    process.stdout.write("  " + label + "... ");
    const t = await fn();
    const r = await t.wait();
    console.log("OK bloque=" + r.blockNumber + " gas=" + r.gasUsed.toString() + " tx=" + r.hash.slice(0,16) + "...");
    return r;
  } catch(e) {
    console.log("ERROR: " + e.message.slice(0, 100));
    return null;
  }
}

async function main() {
  const pk = process.env.PRIVATE_KEY;
  if (!pk) { console.error("No PRIVATE_KEY"); process.exit(1); }

  const provider = new ethers.JsonRpcProvider(RPC, CHAIN_ID);
  const signer   = new ethers.Wallet(pk, provider);
  const addr     = signer.address;

  const ethBal0 = await provider.getBalance(addr);
  console.log("\n========================================");
  console.log("  ACUA COMPANY — Test Completo");
  console.log("========================================");
  console.log("Wallet:", addr);
  console.log("ETH al inicio:", fmt(ethBal0), "ETH\n");

  // ══════════════════════════════════════════════════════════════════════
  // 1. TODOS LOS STAKINGS
  // ══════════════════════════════════════════════════════════════════════
  console.log("─── STAKINGS ─────────────────────────────");
  for (var key in ADDR) {
    var info = ADDR[key];
    var stakingAddr = info[0];
    var tokenAddr   = info[1];
    var dec         = info[2];
    var sym         = info[3];
    var stakeAmt    = info[4];

    console.log("\n[" + sym + " Staking] " + stakingAddr.slice(0,12) + "...");
    try {
      var token   = new ethers.Contract(tokenAddr,   ERC20,   provider);
      var staking = new ethers.Contract(stakingAddr, STAKING, provider);

      var [bal, staked, rewards, allw] = await Promise.allSettled([
        token.balanceOf(addr),
        staking.stakedBalance(addr),
        staking.pendingRewards(addr),
        token.allowance(addr, stakingAddr),
      ]).then(function(res) {
        return res.map(function(r) { return r.status === "fulfilled" ? r.value : 0n; });
      });

      console.log("  Bal=" + fmt(bal, dec) + " staked=" + fmt(staked, dec) + " rewards=" + fmt(rewards, dec) + " allowance=" + fmt(allw, dec));

      if (bal < stakeAmt) {
        console.log("  SKIP: balance insuficiente (" + fmt(bal, dec) + " < " + fmt(stakeAmt, dec) + " " + sym + ")");
        continue;
      }

      // Approve si necesario
      if (allw < stakeAmt) {
        await tx("Approve " + sym, function() {
          return token.connect(signer).approve(stakingAddr, ethers.MaxUint256, { gasLimit: 100000n });
        });
      } else {
        console.log("  Approve: ya aprobado");
      }

      // Claim si hay rewards
      if (rewards > 0n) {
        await tx("Claim " + sym, function() {
          return staking.connect(signer).claim({ gasLimit: 200000n });
        });
      }

      // Stake
      await tx("Stake " + fmt(stakeAmt, dec) + " " + sym, function() {
        return staking.connect(signer).stake(stakeAmt, { gasLimit: 350000n });
      });

    } catch(e) {
      console.log("  ERROR general: " + e.message.slice(0, 120));
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  // 2. H2O MINING — comprar 1 paquete con 1 WLD
  // ══════════════════════════════════════════════════════════════════════
  console.log("\n─── H2O MINING ───────────────────────────");
  try {
    var wld     = new ethers.Contract(WLD_TOKEN,  ERC20,      provider);
    var h2oMine = new ethers.Contract(H2O_MINING, MINING_ABI, provider);

    var [wldBal, wldAllw, pkgPrice, userPow, h2oPool, btch2oPool] = await Promise.all([
      wld.balanceOf(addr),
      wld.allowance(addr, H2O_MINING),
      h2oMine.packagePriceWLD(),
      h2oMine.totalPower(),
      h2oMine.h2oPool(),
      h2oMine.btch2oPool(),
    ]);

    console.log("WLD wallet: " + fmt(wldBal) + " | Precio paquete: " + fmt(pkgPrice) + " WLD");
    console.log("H2O pool: " + fmt(h2oPool) + " | BTCH2O pool: " + fmt(btch2oPool) + " | Total power: " + userPow.toString());

    var cost1pkg = pkgPrice; // 1 paquete = pkgPrice WLD
    if (wldBal < cost1pkg) {
      console.log("SKIP: WLD insuficiente (" + fmt(wldBal) + " < " + fmt(cost1pkg) + ")");
    } else {
      if (wldAllw < cost1pkg) {
        await tx("Approve WLD->H2O Mining", function() {
          return wld.connect(signer).approve(H2O_MINING, ethers.MaxUint256, { gasLimit: 100000n });
        });
      } else {
        console.log("  WLD ya aprobado");
      }
      await tx("Comprar 1 paquete H2O Mining (1 WLD)", function() {
        return h2oMine.connect(signer).buyPackage(1n, { gasLimit: 350000n });
      });
    }

    // Claim si hay rewards
    var pend = await h2oMine.pendingRewards(addr);
    console.log("Rewards pendientes: " + fmt(pend[0]) + " H2O | " + fmt(pend[1]) + " BTCH2O");
    if (pend[0] > 0n || pend[1] > 0n) {
      await tx("Claim H2O Mining", function() {
        return h2oMine.connect(signer).claimRewards({ gasLimit: 300000n });
      });
    }
  } catch(e) {
    console.log("ERROR H2O Mining: " + e.message.slice(0, 120));
  }

  // ══════════════════════════════════════════════════════════════════════
  // 3. UTH2 MINING — setPackage(0, 1 UTH2), buy, fund BTCH2O, claim
  // ══════════════════════════════════════════════════════════════════════
  console.log("\n─── UTH2 MINING ──────────────────────────");
  try {
    var uth2    = new ethers.Contract(UTH2_TOKEN,  ERC20,    provider);
    var btch2o2 = new ethers.Contract(BTCH2O_TOKEN,ERC20,    provider);
    var utMine  = new ethers.Contract(UTH2_MINING, UTH2_ABI, provider);

    var [pkgs, owner1, uth2Bal, uth2All, btch2oBal, btch2oAll2, poolBal, pending] = await Promise.all([
      utMine.getPackages(),
      utMine.owner1(),
      uth2.balanceOf(addr),
      uth2.allowance(addr, UTH2_MINING),
      btch2o2.balanceOf(addr),
      btch2o2.allowance(addr, UTH2_MINING),
      utMine.poolBalance(),
      utMine.pendingRewards(addr),
    ]);

    var currentPrice = pkgs[0][0];
    var currentRate  = pkgs[1][0];
    console.log("Owner1: " + owner1 + " | Es owner: " + (owner1.toLowerCase() === addr.toLowerCase()));
    console.log("Pkg[0] precio actual: " + fmt(currentPrice) + " UTH2 | rate: " + currentRate.toString());
    console.log("UTH2 wallet: " + fmt(uth2Bal) + " | Allowance: " + fmt(uth2All));
    console.log("BTCH2O wallet: " + fmt(btch2oBal) + " | Allowance: " + fmt(btch2oAll2));
    console.log("Pool BTCH2O: " + fmt(poolBal) + " | Pending rewards: " + fmt(pending));

    var NEW_PRICE = ethers.parseEther("1"); // 1 UTH2

    // 3a. Cambiar precio a 1 UTH2 si es distinto
    if (currentPrice !== NEW_PRICE && owner1.toLowerCase() === addr.toLowerCase()) {
      await tx("setPackage(0, 1 UTH2, rate=" + currentRate + ")", function() {
        return utMine.connect(signer).setPackage(0, NEW_PRICE, currentRate, { gasLimit: 150000n });
      });
    } else if (currentPrice === NEW_PRICE) {
      console.log("  Precio ya es 1 UTH2, sin cambio necesario");
    } else {
      console.log("  SKIP setPackage: no eres owner1");
    }

    // 3b. Approve UTH2 si necesario
    if (uth2All < NEW_PRICE) {
      await tx("Approve UTH2->UTH2Mining", function() {
        return uth2.connect(signer).approve(UTH2_MINING, ethers.MaxUint256, { gasLimit: 100000n });
      });
    } else {
      console.log("  UTH2 ya aprobado");
    }

    // 3c. Comprar 1 paquete
    await tx("buyPackage(0, 1) — 1 UTH2", function() {
      return utMine.connect(signer).buyPackage(0, 1n, { gasLimit: 400000n });
    });

    // 3d. Fund pool con BTCH2O (1000 BTCH2O)
    var FUND_AMT = ethers.parseEther("1000");
    if (btch2oBal >= FUND_AMT) {
      if (btch2oAll2 < FUND_AMT) {
        await tx("Approve BTCH2O->UTH2Mining", function() {
          return btch2o2.connect(signer).approve(UTH2_MINING, ethers.MaxUint256, { gasLimit: 100000n });
        });
      } else {
        console.log("  BTCH2O ya aprobado");
      }
      await tx("fundPool(BTCH2O, 1000)", function() {
        return utMine.connect(signer).fundPool(BTCH2O_TOKEN, FUND_AMT, { gasLimit: 200000n });
      });
    } else {
      console.log("  SKIP fund: BTCH2O insuficiente");
    }

    // 3e. Claim rewards (esperar un poco para que pending > 0 aunque sea mínimo)
    var pending2 = await utMine.pendingRewards(addr);
    console.log("Pending rewards tras compra: " + fmt(pending2) + " BTCH2O");
    await tx("claimRewards UTH2 Mining", function() {
      return utMine.connect(signer).claimRewards({ gasLimit: 300000n });
    });

  } catch(e) {
    console.log("ERROR UTH2 Mining: " + e.message.slice(0, 120));
  }

  // ══════════════════════════════════════════════════════════════════════
  // RESUMEN FINAL
  // ══════════════════════════════════════════════════════════════════════
  var ethBalF = await provider.getBalance(addr);
  console.log("\n========================================");
  console.log("  RESUMEN FINAL");
  console.log("========================================");
  console.log("ETH inicio:  " + fmt(ethBal0) + " ETH");
  console.log("ETH final:   " + fmt(ethBalF) + " ETH");
  console.log("Gas gastado: " + fmt(ethBal0 - ethBalF) + " ETH");
  console.log("========================================\n");
}

main().catch(function(e) { console.error("Fatal:", e.message); process.exit(1); });
