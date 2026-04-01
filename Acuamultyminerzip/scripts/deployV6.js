const { ethers } = require("hardhat");
require("dotenv").config();

// World Chain token addresses
const WLD_TOKEN       = process.env.WLD_TOKEN    || "0x2cFc85d8E48F8EAB294be644d9E25C3030863003";
const TIME_TOKEN      = process.env.TIME_TOKEN   || "0x212d7448720852d8ad282a5d4a895b3461f9076e";
const TIME_STAKING    = process.env.STAKING_ADDR || "0x17e32c9e063533529f802839b9ba93e70d8953fe";

// Optional: distribution tokens to add after deploy
// H2O and BTCH2O addresses — add via addDistToken() after deploy or set here
const H2O_TOKEN    = process.env.H2O_TOKEN    || null;
const BTCH2O_TOKEN = process.env.BTCH2O_TOKEN || null;

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`Deployer: ${deployer.address}`);
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Balance : ${ethers.formatEther(balance)} ETH/WLD`);

  console.log("\nConstructor params (V6):");
  console.log(`  WLD         : ${WLD_TOKEN}`);
  console.log(`  TIME Token  : ${TIME_TOKEN}`);
  console.log(`  TIME Staking: ${TIME_STAKING}`);

  console.log("\nDeployando AutoReinvestBotV6...");
  const Factory = await ethers.getContractFactory("AutoReinvestBotV6");
  const bot = await Factory.deploy(WLD_TOKEN, TIME_TOKEN, TIME_STAKING);
  await bot.waitForDeployment();

  const address = await bot.getAddress();
  console.log(`\n✅ AutoReinvestBotV6 desplegado en: ${address}`);
  console.log(`🔗 Worldscan: https://worldscan.org/address/${address}`);

  // Optionally add distribution tokens
  if (H2O_TOKEN) {
    console.log("\nAgregando H2O como token de distribución (40%, fee 3000)...");
    try {
      const tx = await bot.addDistToken(H2O_TOKEN, 4000, 3000);
      await tx.wait();
      console.log("✅ H2O agregado");
    } catch (e) { console.log("⚠️ H2O no se pudo agregar:", e.message); }
  }

  if (BTCH2O_TOKEN) {
    console.log("Agregando BTCH2O como token de distribución (30%, fee 3000)...");
    try {
      const tx = await bot.addDistToken(BTCH2O_TOKEN, 3000, 3000);
      await tx.wait();
      console.log("✅ BTCH2O agregado");
    } catch (e) { console.log("⚠️ BTCH2O no se pudo agregar:", e.message); }
  }

  const fs = require("fs");
  fs.writeFileSync(".deployed_address_v6", address);
  console.log(`\n📝 Dirección guardada en .deployed_address_v6`);
  console.log(`\n🔧 Actualiza CONTRACT_ADDRESS en src/config/contract.js con: ${address}`);
  console.log(`\n📋 Para verificar el contrato:\n  npx hardhat verify --network worldchain ${address} "${WLD_TOKEN}" "${TIME_TOKEN}" "${TIME_STAKING}"`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
