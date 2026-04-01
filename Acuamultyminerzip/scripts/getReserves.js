const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  const address = process.env.STAKING_CONTRACT;
  const artifact = require("../artifacts/contracts/AutoReinvestBotV5.sol/AutoReinvestBotV5.json");
  const [signer] = await ethers.getSigners();
  const contract = new ethers.Contract(address, artifact.abi, signer);

  const r = await contract.getReserves();
  console.log("\n💰 Reservas del contrato:");
  console.log(`  WLD:    ${ethers.formatEther(r.wldReserve)}`);
  console.log(`  H2O:    ${ethers.formatEther(r.h2oReserve)}`);
  console.log(`  BTCH2O: ${ethers.formatEther(r.btch2oReserve)}`);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
