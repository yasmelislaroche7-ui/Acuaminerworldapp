const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  const WLD_TOKEN    = process.env.WLD_TOKEN;
  const H2O_TOKEN    = process.env.H2O_TOKEN;
  const BTCH2O_TOKEN = process.env.BTCH2O_TOKEN;

  // TIME token and staking contract on World Chain
  const TIME_TOKEN       = process.env.TIME_TOKEN   || "0x212d7448720852d8ad282a5d4a895b3461f9076e";
  const STAKING_CONTRACT = process.env.STAKING_ADDR || "0x17e32c9e063533529f802839b9ba93e70d8953fe";

  if (!WLD_TOKEN || !H2O_TOKEN || !BTCH2O_TOKEN) {
    throw new Error("Missing env vars: WLD_TOKEN, H2O_TOKEN, BTCH2O_TOKEN");
  }

  const [deployer] = await ethers.getSigners();
  console.log(`Deployer: ${deployer.address}`);
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Balance : ${ethers.formatEther(balance)} ETH`);

  console.log("\nConstructor params:");
  console.log(`  WLD    : ${WLD_TOKEN}`);
  console.log(`  H2O    : ${H2O_TOKEN}`);
  console.log(`  BTCH2O : ${BTCH2O_TOKEN}`);
  console.log(`  TIME   : ${TIME_TOKEN}`);
  console.log(`  Staking: ${STAKING_CONTRACT}`);

  console.log("\nDeployando AutoReinvestBotV5...");
  const Factory = await ethers.getContractFactory("AutoReinvestBotV5");
  const bot = await Factory.deploy(
    WLD_TOKEN,
    H2O_TOKEN,
    BTCH2O_TOKEN,
    TIME_TOKEN,
    STAKING_CONTRACT
  );
  await bot.waitForDeployment();

  const address = await bot.getAddress();
  console.log(`\n✅ AutoReinvestBotV5 desplegado en: ${address}`);
  console.log(`🔗 Worldscan: https://worldscan.org/address/${address}`);
  console.log(`\nActualiza el secret STAKING_CONTRACT en Replit con: ${address}`);

  const fs = require("fs");
  fs.writeFileSync(".deployed_address", address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
