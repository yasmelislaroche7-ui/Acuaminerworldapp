const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const UTH2_TOKEN  = "0x9eA8653640E22A5b69887985BB75d496dc97022a";
const BTCH2O_TOKEN = "0xEcC4dAe4DC3D359a93046bd944e9ee3421A6A484";
const RPC_URL     = process.env.WORLD_CHAIN_URL || "https://worldchain-mainnet.g.alchemy.com/public";

// ── 7 Mining Packages ─────────────────────────────────────────────────────
// Package ID:  0=Starter  1=Basic  2=Standard  3=Advanced  4=Pro  5=Elite  6=Master
const PRICES = [
  ethers.parseUnits("10",   18),  // Starter:   10 UTH₂
  ethers.parseUnits("25",   18),  // Basic:      25 UTH₂
  ethers.parseUnits("50",   18),  // Standard:   50 UTH₂
  ethers.parseUnits("100",  18),  // Advanced:  100 UTH₂
  ethers.parseUnits("250",  18),  // Pro:        250 UTH₂
  ethers.parseUnits("500",  18),  // Elite:      500 UTH₂
  ethers.parseUnits("1000", 18),  // Master:   1,000 UTH₂
];

const RATES = [
  ethers.parseUnits("100",   18),  // Starter:       100 BTCH2O/yr
  ethers.parseUnits("300",   18),  // Basic:          300 BTCH2O/yr
  ethers.parseUnits("700",   18),  // Standard:       700 BTCH2O/yr
  ethers.parseUnits("1600",  18),  // Advanced:     1,600 BTCH2O/yr
  ethers.parseUnits("4500",  18),  // Pro:           4,500 BTCH2O/yr
  ethers.parseUnits("10000", 18),  // Elite:        10,000 BTCH2O/yr
  ethers.parseUnits("25000", 18),  // Master:       25,000 BTCH2O/yr
];

async function loadArtifact() {
  // Try hardhat artifact first
  const artifactPath = path.join(__dirname, "../artifacts/contracts/UTH2Mining.sol/UTH2Mining.json");
  if (fs.existsSync(artifactPath)) {
    const art = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
    return { abi: art.abi, bytecode: art.bytecode };
  }
  // Fallback: compile inline using solc
  const solc = require("solc");
  const source = fs.readFileSync(path.join(__dirname, "../contracts/UTH2Mining.sol"), "utf8");
  const input = {
    language: "Solidity",
    sources: { "UTH2Mining.sol": { content: source } },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      outputSelection: { "*": { "*": ["abi", "evm.bytecode"] } }
    }
  };
  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  const errs = (output.errors || []).filter(e => e.severity === "error");
  if (errs.length > 0) { errs.forEach(e => console.error(e.formattedMessage)); process.exit(1); }
  const c = output.contracts["UTH2Mining.sol"]["UTH2Mining"];
  return { abi: c.abi, bytecode: c.evm.bytecode.object };
}

async function main() {
  const PRIVATE_KEY = process.env.PRIVATE_KEY;
  if (!PRIVATE_KEY) throw new Error("PRIVATE_KEY env var not set");

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet   = new ethers.Wallet(PRIVATE_KEY, provider);
  console.log(`\nDeployer : ${wallet.address}`);
  const balance = await provider.getBalance(wallet.address);
  console.log(`Balance  : ${ethers.formatEther(balance)} ETH`);

  if (balance === 0n) throw new Error("No ETH balance — cannot pay gas");

  console.log("\n📦 Packages:");
  const names = ["Starter","Basic","Standard","Advanced","Pro","Elite","Master"];
  for (let i = 0; i < 7; i++) {
    console.log(`  [${i}] ${names[i].padEnd(10)} — ${ethers.formatUnits(PRICES[i],18)} UTH₂ → ${ethers.formatUnits(RATES[i],18)} BTCH2O/yr`);
  }

  console.log("\n🔧 Cargando artefacto...");
  const { abi, bytecode } = await loadArtifact();
  console.log("✅ Listo");

  console.log("\n🚀 Desplegando UTH2Mining...");
  const factory  = new ethers.ContractFactory(abi, bytecode, wallet);
  const contract = await factory.deploy(
    UTH2_TOKEN,
    BTCH2O_TOKEN,
    PRICES,
    RATES,
    {
      gasLimit: 3_000_000n,
      maxFeePerGas: ethers.parseUnits("0.005", "gwei"),
      maxPriorityFeePerGas: ethers.parseUnits("0.001", "gwei"),
    }
  );
  console.log(`Tx: ${contract.deploymentTransaction()?.hash}`);
  console.log("⏳ Esperando confirmación...");
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log(`\n✅ UTH2Mining desplegado en: ${address}`);
  console.log(`🔗 Worldscan: https://worldscan.org/address/${address}`);

  // Save result
  const result = { address, uth2: UTH2_TOKEN, btch2o: BTCH2O_TOKEN, abi };
  fs.writeFileSync(".uth2mining_address", JSON.stringify(result, null, 2));
  console.log("\n💾 Guardado en .uth2mining_address");
  console.log("\n📝 Actualiza src/config/uth2mining.js con:");
  console.log(`  UTH2_MINING_ADDRESS = "${address}"`);
}

main()
  .then(() => process.exit(0))
  .catch(err => { console.error(err); process.exit(1); });
