const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const UTH2_TOKEN   = "0x9eA8653640E22A5b69887985BB75d496dc97022a";
const BTCH2O_TOKEN = "0xEcC4dAe4DC3D359a93046bd944e9ee3421A6A484";
const OWNER2       = "0x5474c309e985c6b4fc623acf01ade604da781e52";
const RPC_URL      = process.env.WORLD_CHAIN_URL || "https://worldchain-mainnet.g.alchemy.com/public";

// ── 7 Mining Packages ──────────────────────────────────────────────────────
const PRICES = [
  ethers.parseUnits("10",   18), // Starter
  ethers.parseUnits("25",   18), // Basic
  ethers.parseUnits("50",   18), // Standard
  ethers.parseUnits("100",  18), // Advanced
  ethers.parseUnits("250",  18), // Pro
  ethers.parseUnits("500",  18), // Elite
  ethers.parseUnits("1000", 18), // Master
];

const RATES = [
  ethers.parseUnits("100",   18), // Starter   100 BTCH2O/yr
  ethers.parseUnits("300",   18), // Basic     300 BTCH2O/yr
  ethers.parseUnits("700",   18), // Standard  700 BTCH2O/yr
  ethers.parseUnits("1600",  18), // Advanced 1600 BTCH2O/yr
  ethers.parseUnits("4500",  18), // Pro      4500 BTCH2O/yr
  ethers.parseUnits("10000", 18), // Elite   10000 BTCH2O/yr
  ethers.parseUnits("25000", 18), // Master  25000 BTCH2O/yr
];

async function loadArtifact() {
  const artifactPath = path.join(__dirname, "../artifacts/contracts/UTH2Mining.sol/UTH2Mining.json");
  if (fs.existsSync(artifactPath)) {
    const art = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
    return { abi: art.abi, bytecode: art.bytecode };
  }
  throw new Error("Artifact not found. Run: npx hardhat compile");
}

async function main() {
  const PRIVATE_KEY = process.env.PRIVATE_KEY;
  if (!PRIVATE_KEY) throw new Error("PRIVATE_KEY env var not set");

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet   = new ethers.Wallet(PRIVATE_KEY, provider);
  console.log(`\nDeployer (Owner1): ${wallet.address}`);
  console.log(`Owner2           : ${OWNER2}`);

  const balance = await provider.getBalance(wallet.address);
  console.log(`Balance          : ${ethers.formatEther(balance)} ETH`);
  if (balance === 0n) throw new Error("No ETH balance — cannot pay gas");

  console.log("\n📦 Packages:");
  const names = ["Starter","Basic","Standard","Advanced","Pro","Elite","Master"];
  for (let i = 0; i < 7; i++) {
    console.log(`  [${i}] ${names[i].padEnd(10)} — ${ethers.formatUnits(PRICES[i],18)} UTH₂ → ${ethers.formatUnits(RATES[i],18)} BTCH2O/yr`);
  }

  console.log("\n🔧 Cargando artefacto...");
  const { abi, bytecode } = await loadArtifact();
  console.log("✅ Listo");

  console.log("\n🚀 Desplegando UTH2Mining V2 (dual-owner)...");
  const factory  = new ethers.ContractFactory(abi, bytecode, wallet);
  const contract = await factory.deploy(
    UTH2_TOKEN,
    BTCH2O_TOKEN,
    OWNER2,
    PRICES,
    RATES,
    {
      gasLimit: 3_500_000n,
      maxFeePerGas:         ethers.parseUnits("0.005", "gwei"),
      maxPriorityFeePerGas: ethers.parseUnits("0.001", "gwei"),
    }
  );
  console.log(`Tx: ${contract.deploymentTransaction()?.hash}`);
  console.log("⏳ Esperando confirmación...");
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log(`\n✅ UTH2Mining V2 desplegado en: ${address}`);
  console.log(`🔗 Worldscan: https://worldscan.org/address/${address}`);

  // Save result
  const result = { address, uth2: UTH2_TOKEN, btch2o: BTCH2O_TOKEN, owner2: OWNER2, abi };
  fs.writeFileSync(".uth2mining_address", JSON.stringify(result, null, 2));
  console.log("\n💾 Guardado en .uth2mining_address");
  console.log("\n📝 Actualiza src/config/uth2mining.js con:");
  console.log(`  UTH2_MINING_ADDRESS = "${address}"`);
}

main()
  .then(() => process.exit(0))
  .catch(err => { console.error(err); process.exit(1); });
