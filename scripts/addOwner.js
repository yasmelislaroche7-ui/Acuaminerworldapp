const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  const newOwner = process.argv[2];
  if (!newOwner) throw new Error("Uso: node scripts/addOwner.js <address>");

  const address = process.env.STAKING_CONTRACT;
  const artifact = require("../artifacts/contracts/AutoReinvestBotV5.sol/AutoReinvestBotV5.json");
  const [signer] = await ethers.getSigners();
  const contract = new ethers.Contract(address, artifact.abi, signer);

  console.log(`Agregando owner: ${newOwner}...`);
  const tx = await contract.addOwner(newOwner);
  await tx.wait();
  console.log(`✅ Owner ${newOwner} agregado. TX: ${tx.hash}`);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
