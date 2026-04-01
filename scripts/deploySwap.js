const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying SwapProxy from:", deployer.address);

  const bal = await ethers.provider.getBalance(deployer.address);
  console.log("Balance:", ethers.formatEther(bal), "ETH/WLD");

  const OWNER = "0x54f0d557e8042ec70974d2e85331be5d66ffe5f4";

  const SwapProxy = await ethers.getContractFactory("SwapProxy");
  const proxy = await SwapProxy.deploy(OWNER, {
    maxFeePerGas: ethers.parseUnits("0.01", "gwei"),
    maxPriorityFeePerGas: ethers.parseUnits("0.001", "gwei"),
  });

  await proxy.waitForDeployment();
  const addr = await proxy.getAddress();

  console.log("SwapProxy deployed at:", addr);
  console.log("Owner:", OWNER);
  console.log("Fee: 0.1% (10 bps)");
  console.log("Worldscan:", `https://worldscan.org/address/${addr}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
