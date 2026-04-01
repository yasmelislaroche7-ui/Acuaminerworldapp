const { ethers } = require("./node_modules/ethers");
const fs = require("fs");
require("./node_modules/dotenv").config();

async function main() {
  const FIRE_TOKEN = "0x22c40632C13A7F3cAE9c343480607d886832c686";
  const FIRE_APR_BPS = 1500;

  const artifact = JSON.parse(
    fs.readFileSync("./AcuamultyPoP-1zip/artifacts/contracts/FIREStaking.sol/FIREStaking.json", "utf8")
  );

  const provider = new ethers.JsonRpcProvider(
    process.env.WORLD_CHAIN_URL || "https://worldchain-mainnet.g.alchemy.com/public"
  );

  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  console.log("Deployer:", wallet.address);

  const balance = await provider.getBalance(wallet.address);
  console.log("Balance:", ethers.formatEther(balance), "ETH");

  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
  console.log("Deploying FIREStaking...");

  const contract = await factory.deploy(FIRE_TOKEN, FIRE_APR_BPS, {
    gasLimit: 1_500_000n,
    maxFeePerGas: ethers.parseUnits("0.003", "gwei"),
    maxPriorityFeePerGas: ethers.parseUnits("0.001", "gwei"),
  });

  console.log("Tx hash:", contract.deploymentTransaction()?.hash);
  await contract.waitForDeployment();
  const address = await contract.getAddress();

  console.log("\n✅ FIREStaking deployed at:", address);
  console.log("🔗 Worldscan:", `https://worldscan.org/address/${address}`);

  fs.writeFileSync(".fire_staking_address", address);
  return address;
}

main().then(addr => {
  console.log("\nDone. Update src/config/fire.js FIRE_STAKING_ADDRESS =", addr);
  process.exit(0);
}).catch(e => {
  console.error("Deploy failed:", e.message);
  process.exit(1);
});
