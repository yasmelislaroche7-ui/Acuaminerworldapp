const { ethers } = require("hardhat");
require("dotenv").config();

const INTERVAL_MS = (parseInt(process.env.REINVEST_INTERVAL_SECS) || 300) * 1000;

async function run(contract) {
  try {
    const isPaused = await contract.paused();
    if (isPaused) {
      console.log("[Bot] Contrato pausado, saltando...");
      return;
    }

    const positions = await contract.getManagedPositions();
    const deadline  = Math.floor(Date.now() / 1000) + 600;

    // Staking info
    const info = await contract.getStakingInfo();
    const stakedTime  = ethers.formatEther(info.stakedTime);
    const pendingWLD  = ethers.formatEther(info.pendingWLD);
    console.log(`[Bot] TIME stakeado: ${stakedTime} | WLD pendiente: ${pendingWLD}`);

    if (positions.length === 0 && info.pendingWLD === 0n) {
      console.log("[Bot] Sin posiciones ni rewards de staking. Saltando.");
      return;
    }

    if (positions.length > 0) {
      await contract.updateRanges(positions);
    }

    // collectAll: reclama staking + fees de Uniswap V3 + distribuye WLD
    const ids = positions.length > 0 ? positions : [];
    console.log(`[Bot] Ejecutando collectAll con ${ids.length} posicion(es)...`);
    const tx = await contract.collectAll(ids, deadline);
    const receipt = await tx.wait();
    console.log(`[Bot] ✅ collectAll completado. TX: ${tx.hash}`);

    // Log events de interés
    for (const log of receipt.logs) {
      try {
        const parsed = contract.interface.parseLog(log);
        if (!parsed) continue;
        if (parsed.name === "StakingRewardClaimed") {
          console.log(`[Bot]   → Staking reward: ${ethers.formatEther(parsed.args.wldAmount)} WLD`);
        }
        if (parsed.name === "FeesCollected") {
          console.log(`[Bot]   → Fees tokenId ${parsed.args.tokenId}: ${parsed.args.amount0} / ${parsed.args.amount1}`);
        }
        if (parsed.name === "Swapped") {
          console.log(`[Bot]   → Swap ${parsed.args.tokenIn.slice(0,8)}→${parsed.args.tokenOut.slice(0,8)}: ${ethers.formatEther(parsed.args.amountIn)} in / ${ethers.formatEther(parsed.args.amountOut)} out`);
        }
        if (parsed.name === "SwapFailed") {
          console.warn(`[Bot]   ⚠️ SwapFailed ${parsed.args.tokenIn.slice(0,8)}→${parsed.args.tokenOut.slice(0,8)}: ${ethers.formatEther(parsed.args.amountIn)} WLD retenido`);
        }
        if (parsed.name === "ReinvestCompleted") {
          console.log(`[Bot]   → Total WLD procesado: ${ethers.formatEther(parsed.args.totalWLD)}`);
        }
      } catch { }
    }

  } catch (err) {
    console.error("[Bot] ❌ Error:", err.message);
  }
}

async function main() {
  const address = process.env.STAKING_CONTRACT;
  if (!address) throw new Error("STAKING_CONTRACT no configurado (dirección del bot).");

  const [signer] = await ethers.getSigners();
  console.log(`[Bot] Cuenta  : ${signer.address}`);
  console.log(`[Bot] Contrato: ${address}`);

  const artifact = require("../artifacts/contracts/AutoReinvestBotV5.sol/AutoReinvestBotV5.json");
  const contract = new ethers.Contract(address, artifact.abi, signer);

  const config = await contract.getConfig();
  const interval = Number(config._reinvestIntervalSecs) * 1000 || INTERVAL_MS;
  console.log(`[Bot] Intervalo: ${interval / 1000}s`);
  console.log("[Bot] Iniciando primera ejecución...\n");

  await run(contract);
  setInterval(() => run(contract), interval);
}

main().catch(e => { console.error(e); process.exit(1); });
