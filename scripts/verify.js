const { run } = require("hardhat");
require("dotenv").config();

async function main() {
  const fs = require("fs");

  let address = process.env.STAKING_CONTRACT;
  if (!address && fs.existsSync(".deployed_address")) {
    address = fs.readFileSync(".deployed_address", "utf8").trim();
  }
  if (!address) throw new Error("Set STAKING_CONTRACT or deploy first.");

  const WLD_TOKEN    = process.env.WLD_TOKEN;
  const H2O_TOKEN    = process.env.H2O_TOKEN;
  const BTCH2O_TOKEN = process.env.BTCH2O_TOKEN;

  console.log(`Verificando: ${address}`);
  await run("verify:verify", {
    address,
    constructorArguments: [WLD_TOKEN, H2O_TOKEN, BTCH2O_TOKEN],
    contract: "contracts/AutoReinvestBotV5.sol:AutoReinvestBotV5"
  });
  console.log("✅ Verificado en Worldscan.");
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
