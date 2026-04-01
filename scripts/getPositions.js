const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  const address = process.env.STAKING_CONTRACT;
  const artifact = require("../artifacts/contracts/AutoReinvestBotV5.sol/AutoReinvestBotV5.json");
  const [signer] = await ethers.getSigners();
  const contract = new ethers.Contract(address, artifact.abi, signer);

  const positions = await contract.getManagedPositions();
  console.log(`\n📋 Posiciones gestionadas (${positions.length}):`);
  for (const id of positions) {
    const pos = await contract.getPosition(id);
    const fees0 = ethers.formatUnits(pos.tokensOwed0, 18);
    const fees1 = ethers.formatUnits(pos.tokensOwed1, 18);
    console.log(`  - ID: ${id} | ${pos.inRange ? "✅ en rango" : "❌ fuera de rango"} | Fees: ${fees0} / ${fees1}`);
  }

  const config = await contract.getConfig();
  console.log(`\n⚙️  Config:`);
  console.log(`  Slippage:   ${config._slippageBps} bps`);
  console.log(`  Intervalo:  ${config._reinvestIntervalSecs}s`);
  console.log(`  Reserva:    ${config._reserveFeeBps} bps`);
  console.log(`  H2O share:  ${config._h2oShareBps} bps`);
  console.log(`  BTCH2O:     ${config._btch2oShareBps} bps`);
  console.log(`  Pausado:    ${config._paused}`);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
