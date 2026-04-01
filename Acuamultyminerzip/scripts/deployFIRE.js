const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  const FIRE_TOKEN = process.env.FIRE_TOKEN || "0x22c40632C13A7F3cAE9c343480607d886832c686";
  const FIRE_APR_BPS = 1500; // 15% APR inicial

  const [deployer] = await ethers.getSigners();
  console.log(`Deployer: ${deployer.address}`);
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Balance : ${ethers.formatEther(balance)} ETH`);

  console.log("\nConstructor params:");
  console.log(`  FIRE Token : ${FIRE_TOKEN}`);
  console.log(`  APR (bps)  : ${FIRE_APR_BPS} (${FIRE_APR_BPS / 100}%)`);

  console.log("\nDeployando FIREStaking...");
  const Factory = await ethers.getContractFactory("FIREStaking");
  const staking = await Factory.deploy(FIRE_TOKEN, FIRE_APR_BPS);
  await staking.waitForDeployment();

  const address = await staking.getAddress();
  console.log(`\n✅ FIREStaking desplegado en: ${address}`);
  console.log(`🔗 Worldscan: https://worldscan.org/address/${address}`);
  console.log(`\nActualiza src/config/fire.js con FIRE_STAKING_ADDRESS = "${address}"`);

  const fs = require("fs");
  fs.writeFileSync(".fire_staking_address", address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
