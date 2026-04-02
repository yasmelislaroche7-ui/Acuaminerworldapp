const { ethers } = require("ethers");
require("dotenv").config();

const UTH2_TOKEN       = "0x9eA8653640E22A5b69887985BB75d496dc97022a";
const UTH2_MINING_ADDR = "0x8e934842EF39777d072e25c8bb67702FB7E81854";
const RPC_URL          = process.env.WORLD_CHAIN_URL || "https://worldchain-mainnet.g.alchemy.com/public";
const MAXUINT256       = BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");

const ERC20_ABI = [
  { inputs:[{name:"owner",type:"address"},{name:"spender",type:"address"}], name:"allowance", outputs:[{type:"uint256"}], stateMutability:"view", type:"function" },
  { inputs:[{name:"spender",type:"address"},{name:"amount",type:"uint256"}], name:"approve",   outputs:[{type:"bool"}],  stateMutability:"nonpayable", type:"function" },
  { inputs:[{name:"account",type:"address"}],                                name:"balanceOf", outputs:[{type:"uint256"}], stateMutability:"view", type:"function" },
  { inputs:[],                                                                name:"symbol",    outputs:[{type:"string"}], stateMutability:"view", type:"function" },
  { inputs:[],                                                                name:"decimals",  outputs:[{type:"uint8"}],  stateMutability:"view", type:"function" },
];

async function main() {
  const PRIVATE_KEY = process.env.PRIVATE_KEY;
  if (!PRIVATE_KEY) throw new Error("PRIVATE_KEY no configurado");

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet   = new ethers.Wallet(PRIVATE_KEY, provider);
  console.log(`\n👛 Wallet      : ${wallet.address}`);

  const ethBal = await provider.getBalance(wallet.address);
  console.log(`⛽ ETH Balance : ${ethers.formatEther(ethBal)} ETH`);

  const uth2 = new ethers.Contract(UTH2_TOKEN, ERC20_ABI, wallet);
  const symbol   = await uth2.symbol();
  const decimals = await uth2.decimals();
  const balance  = await uth2.balanceOf(wallet.address);
  const allowance = await uth2.allowance(wallet.address, UTH2_MINING_ADDR);

  console.log(`\n🪙 Token       : ${symbol} (decimals: ${decimals})`);
  console.log(`💰 Balance     : ${ethers.formatUnits(balance, decimals)} ${symbol}`);
  console.log(`✅ Allowance   : ${allowance === MAXUINT256 ? "∞ (ilimitado)" : ethers.formatUnits(allowance, decimals)} ${symbol}`);
  console.log(`📋 Spender     : ${UTH2_MINING_ADDR}`);

  if (allowance >= MAXUINT256 / 2n) {
    console.log("\n✅ Ya tienes allowance ilimitado — no es necesario aprobar de nuevo");
    return;
  }

  console.log("\n📤 Enviando tx de approve(MAX) para UTH₂...");
  const tx = await uth2.approve(UTH2_MINING_ADDR, MAXUINT256, {
    maxFeePerGas: ethers.parseUnits("0.005", "gwei"),
    maxPriorityFeePerGas: ethers.parseUnits("0.001", "gwei"),
    gasLimit: 80_000n,
  });
  console.log(`🔗 Tx Hash  : ${tx.hash}`);
  console.log(`🔗 Worldscan: https://worldscan.org/tx/${tx.hash}`);

  console.log("⏳ Esperando confirmación...");
  const receipt = await tx.wait();
  console.log(`✅ Confirmado en bloque ${receipt.blockNumber} — gas usado: ${receipt.gasUsed}`);

  const newAllowance = await uth2.allowance(wallet.address, UTH2_MINING_ADDR);
  console.log(`\n🎉 Nuevo allowance: ${newAllowance >= MAXUINT256 / 2n ? "∞ (ilimitado)" : ethers.formatUnits(newAllowance, decimals)} UTH₂`);
  console.log("\n✅ Approve completado — ya puedes comprar paquetes de minería.");
}

main()
  .then(() => process.exit(0))
  .catch(err => { console.error(err.message || err); process.exit(1); });
