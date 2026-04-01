const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  const [param, value] = process.argv.slice(2);
  if (!param || value === undefined) {
    console.log("Uso: node scripts/updateConfig.js <param> <value>");
    console.log("Params: slippage, interval, reserve, distribution");
    console.log("  slippage <bps>                  - ej: 50 = 0.5%");
    console.log("  interval <seconds>               - ej: 300");
    console.log("  reserve <bps>                    - ej: 200 = 2%");
    console.log("  distribution <h2oBps> <btch2oBps> - ej: 4000 3000");
    process.exit(0);
  }

  const address = process.env.STAKING_CONTRACT;
  const artifact = require("../artifacts/contracts/AutoReinvestBotV5.sol/AutoReinvestBotV5.json");
  const [signer] = await ethers.getSigners();
  const contract = new ethers.Contract(address, artifact.abi, signer);

  let tx;
  switch (param) {
    case "slippage":
      tx = await contract.setSlippage(parseInt(value));
      break;
    case "interval":
      tx = await contract.setReinvestInterval(parseInt(value));
      break;
    case "reserve":
      tx = await contract.setReserveFeeBps(parseInt(value));
      break;
    case "distribution": {
      const btch2o = process.argv[4];
      tx = await contract.setDistribution(parseInt(value), parseInt(btch2o));
      break;
    }
    default:
      throw new Error(`Parámetro desconocido: ${param}`);
  }

  await tx.wait();
  console.log(`✅ Config actualizada. TX: ${tx.hash}`);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
