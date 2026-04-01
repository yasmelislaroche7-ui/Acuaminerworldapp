const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  const [tokenSymbol, amount, to] = process.argv.slice(2);
  if (!tokenSymbol || !amount || !to) {
    throw new Error("Uso: node scripts/withdrawReserves.js <WLD|H2O|BTCH2O> <amount> <toAddress>");
  }

  const tokenMap = {
    WLD:    process.env.WLD_TOKEN,
    H2O:    process.env.H2O_TOKEN,
    BTCH2O: process.env.BTCH2O_TOKEN
  };

  const tokenAddress = tokenMap[tokenSymbol.toUpperCase()];
  if (!tokenAddress) throw new Error("Token inválido. Usa WLD, H2O o BTCH2O.");

  const address = process.env.STAKING_CONTRACT;
  const artifact = require("../artifacts/contracts/AutoReinvestBotV5.sol/AutoReinvestBotV5.json");
  const [signer] = await ethers.getSigners();
  const contract = new ethers.Contract(address, artifact.abi, signer);

  const amt = ethers.parseEther(amount);
  console.log(`Retirando ${amount} ${tokenSymbol} a ${to}...`);
  const tx = await contract.withdrawReserve(tokenAddress, amt, to);
  await tx.wait();
  console.log(`✅ Retirado. TX: ${tx.hash}`);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
