const { ethers } = require("ethers");
const solc = require("solc");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const WLD_TOKEN    = "0x2cFc85d8E48F8EAB294be644d9E25C3030863003";
const H2O_STAKING  = "0x6d6D559bF261415a52c59Cb1617387B6534E5041";
const BTCH2O_TOKEN = "0xecc4dae4dc3d359a93046bd944e9ee3421a6a484";
const RPC_URL      = "https://worldchain-mainnet.g.alchemy.com/public";

async function compile() {
  const source = fs.readFileSync(path.join(__dirname, "../contracts/H2OMining.sol"), "utf8");
  const input = {
    language: "Solidity",
    sources: { "H2OMining.sol": { content: source } },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      outputSelection: { "*": { "*": ["abi", "evm.bytecode"] } }
    }
  };
  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  if (output.errors) {
    const errs = output.errors.filter(e => e.severity === "error");
    if (errs.length > 0) { errs.forEach(e => console.error(e.formattedMessage)); process.exit(1); }
  }
  const contract = output.contracts["H2OMining.sol"]["H2OMining"];
  return { abi: contract.abi, bytecode: contract.evm.bytecode.object };
}

async function main() {
  const PRIVATE_KEY = process.env.PRIVATE_KEY;
  if (!PRIVATE_KEY) throw new Error("PRIVATE_KEY not set");

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  console.log(`Deployer: ${wallet.address}`);
  const balance = await provider.getBalance(wallet.address);
  console.log(`Balance : ${ethers.formatEther(balance)} ETH`);

  // Query H2O token from staking contract
  const STAKING_ABI = [{ inputs: [], name: "stakingToken", outputs: [{ type: "address" }], stateMutability: "view", type: "function" }];
  const stakingCtx = new ethers.Contract(H2O_STAKING, STAKING_ABI, provider);
  const H2O_TOKEN = await stakingCtx.stakingToken();
  console.log(`H2O Token: ${H2O_TOKEN}`);

  // Compile
  console.log("\nCompilando H2OMining.sol...");
  const { abi, bytecode } = await compile();
  console.log("✅ Compilado");

  // Deploy params
  const packagePriceWLD   = ethers.parseUnits("1", 18);
  const h2oRatePerYear    = ethers.parseUnits("1000", 18);
  const btch2oRatePerYear = ethers.parseUnits("1000", 18);

  console.log("\nParams:");
  console.log(`  WLD     : ${WLD_TOKEN}`);
  console.log(`  H2O     : ${H2O_TOKEN}`);
  console.log(`  BTCH2O  : ${BTCH2O_TOKEN}`);
  console.log(`  Price   : ${ethers.formatEther(packagePriceWLD)} WLD`);
  console.log(`  H2O/yr  : ${ethers.formatEther(h2oRatePerYear)} H2O`);
  console.log(`  B2O/yr  : ${ethers.formatEther(btch2oRatePerYear)} BTCH2O`);

  console.log("\nDeployando...");
  const factory = new ethers.ContractFactory(abi, bytecode, wallet);
  const contract = await factory.deploy(
    WLD_TOKEN, H2O_TOKEN, BTCH2O_TOKEN,
    packagePriceWLD, h2oRatePerYear, btch2oRatePerYear,
    {
      gasLimit: 2_000_000n,
      maxFeePerGas: ethers.parseUnits("0.003", "gwei"),
      maxPriorityFeePerGas: ethers.parseUnits("0.001", "gwei")
    }
  );
  console.log("Esperando confirmación...");
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log(`\n✅ H2OMining desplegado en: ${address}`);
  console.log(`🔗 Worldscan: https://worldscan.org/address/${address}`);

  const result = { mining: address, h2oToken: H2O_TOKEN, abi };
  fs.writeFileSync(".mining_address", JSON.stringify(result, null, 2));
  console.log("\nGuardado en .mining_address");
  console.log("\nACTUALIZA src/config/mining.js con:");
  console.log(`  MINING_ADDRESS = "${address}"`);
  console.log(`  H2O_TOKEN_ADDRESS = "${H2O_TOKEN}"`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => { console.error(error); process.exit(1); });
