# Acua Company - AutoReinvest Bot

## Project Overview
DeFi automation platform for World Chain. Automates Uniswap V3 liquidity fee collection and reinvestment into a staking ecosystem (WLD, TIME, H2O, BTCH2O tokens).

**This is a World App MiniApp** — exclusively for World App wallet. No other wallets are supported.

## Tech Stack
- **Frontend**: React 18 + Vite (port 5000)
- **Blockchain**: Wagmi v2, Viem — World Chain (Chain ID: 480)
- **MiniKit**: @worldcoin/minikit-js v2 (App ID: app_d3ea733327ecd8ed8368a0c408815c13)
- **Contracts**: Hardhat + Solidity + OpenZeppelin

## Project Structure
```
Acuamultyminerzip/
├── src/
│   ├── App.jsx                     # Router + layout
│   ├── main.jsx                    # Entry (MiniKit.install, TxConfirmProvider)
│   ├── components/
│   │   ├── Header.jsx              # World App only connect button
│   │   ├── WorldConnectBtn.jsx     # Reusable connect button (MiniKit walletAuth)
│   │   ├── WorldAppModal.jsx       # Modal shown in browser (redirect to World App)
│   │   └── ...other panels
│   ├── config/
│   │   └── wagmi.js               # Wagmi config — injected connector only
│   ├── context/
│   │   └── TxConfirmContext.jsx   # Black/white popup before all transactions
│   ├── hooks/
│   │   ├── useBot.js              # Reinvest bot (uses confirmTx)
│   │   ├── useContract.js         # Contract write wrapper (uses confirmTx)
│   │   └── useStaking.js          # Staking hooks (uses confirmTx)
│   └── styles/
│       └── TxConfirmPopup.css     # Black/white popup styles
├── contracts/
│   └── AutoReinvestBotV6.sol
└── package.json
```

## Wallet Connection Flow
1. **Inside World App**: `MiniKit.commandsAsync.walletAuth()` → connect via injected provider
2. **In browser**: Shows WorldAppModal → guides user to open in World App
3. **Connected state**: Shows address badge + disconnect button in header

## Transaction Flow
Before every blockchain write (collectFees, claim, stake, approve):
1. `TxConfirmContext.confirmTx(label)` shows black/white popup
2. Popup shows ETH gas warning: "Necesitas ETH en tu wallet para gas"
3. User confirms or cancels
4. Transaction proceeds or is aborted

## Run Command
```bash
cd Acuamultyminerzip && npm run dev
```

## Key Contract
- Address: see `src/config/contract.js`
- Network: World Chain mainnet (ID: 480)
- RPC: Alchemy worldchain-mainnet
