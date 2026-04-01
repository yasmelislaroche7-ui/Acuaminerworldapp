const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  const tokenId = process.argv[2];
  if (!tokenId) throw new Error("Uso: node scripts/removePosition.js <tokenId>");

  const address = process.env.STAKING_CONTRACT;
  const artifact = require("../artifacts/contracts/AutoReinvestBotV5.sol/AutoReinvestBotV5.json");
  const [signer] = await ethers.getSigners();
  const contract = new ethers.Contract(address, artifact.abi, signer);

  console.log(`Eliminando posición ${tokenId}...`);
  const tx = await contract.removePosition(tokenId);
  await tx.wait();
  console.log(`✅ Posición ${tokenId} eliminada. TX: ${tx.hash}`);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
