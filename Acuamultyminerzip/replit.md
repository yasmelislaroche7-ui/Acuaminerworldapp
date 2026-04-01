# Acua Company — AutoReinvest Bot V6 (World Chain)

## Overview
Full-stack DeFi application on World Chain. Includes automated Uniswap V3 reinvestment, H2O + BTCH2O mining, and multi-token staking. The app is integrated with World App MiniKit (app_id: app_d3ea733327ecd8ed8368a0c408815c13) and works both in regular wallets (WalletConnect) and inside World App.

## Deployed Contracts
- **AutoReinvestBotV6**: `0xaAF4965b640730dECe37638BE429a48Fe4E0BCCE`
- **H2O Mining**: `0xb05dBb16D0b26F03D63500af89dda1da5e212645`
- **ACUA Staking**: `0x6d6D559bF261415a52c59Cb1617387B6534E5041`
- **FIREStaking**: `0x0642b285816de5393726393C55f19Fab2C81b070` (deployed and connected to frontend)
- **Network**: World Chain (Chain ID: 480)

## Key Token Addresses
- WLD: `0x2cFc85d8E48F8EAB294be644d9E25C3030863003`
- H2O: (see mining.js)
- BTCH2O: (see mining.js)
- USDC: `0x79A02482A880bCE3F13e09Da970dC34db4CD24d1`
- WARS: `0x1C94c7A2c71ECF13104c31F49d5138EDb099D25D`

## Additional Staking Contracts
- **WLD Staking**: `0x1000DB166A7B118777dc6DCC126c444E284bDE5f`
- **USDC Staking**: `0xd60ceeA0f583704B29E010735EE1112F17E7d5Ac`
- **WARS Staking**: `0xE6A16d1D4b0680059E0Db9666FA63789a006cafF`

## Project Structure
```
src/
  config/
    wagmi.js         WalletConnect + wagmi + Web3Modal setup
    contract.js      AutoReinvest V6 ABI + address
    mining.js        H2O Mining ABI + addresses
    staking.js       ACUA Staking ABI
    btch2o.js        BTCH2O staking config
    usdc.js / wld.js / wcop.js / air.js / wars.js  Multi-token staking configs
  pages/
    Dashboard.jsx    User dashboard (mining panel + positions)
    OwnerPanel.jsx   Owner admin panel (mining admin, staking admin, reserves, owners)
    StakingPage.jsx  Staking hub page
  components/
    MiningPanel.jsx  Mining UI: block log (simulated, every 5 min), live reward counter, power stats
    PositionCard.jsx Uniswap V3 position card
    StakingPanel.jsx Multi-token staking
    ReservePanel.jsx Reserve panel
    OwnersPanel.jsx  Owner management
    Header.jsx       Navigation header
  hooks/
    useBot.js        Bot logic hooks
    useContract.js   wagmi hooks for AutoReinvest contract
    useStaking.js    Staking hooks
  styles/            CSS styles
main.jsx             App entry with MiniKit.install() + WagmiProvider
vite.config.js       Vite config (port 5000, allowedHosts: true)
package.json         Dependencies
```

## Frontend Pages
- **/** Dashboard: Mining panel with block log + live reward counter, active positions
- **/staking**: Staking Hub — 9 tokens
- **/owner**: Owner admin panel — Mining admin (pool balances), Staking admin, Reserves, Owners, Contracts

## MiniKit Integration
- Installed via `@worldcoin/minikit-js`
- `MiniKit.install("app_d3ea733327ecd8ed8368a0c408815c13")` called in main.jsx
- Works in both regular browser wallets and World App

## Mining Panel Features
- **Block Log**: Shows last 10 simulated blocks, new block every 5 minutes with countdown + progress bar
- **Live reward counter**: Accumulates H2O and BTCH2O per second in real time
- **Power stats**: Shows daily income (H2O/día, BTCH2O/día) and per-second rate
- **No pool balance in dashboard**: Pool balance only visible in Owner Panel

## Owner Panel Features
- Mining admin: Pool balances (H2O + BTCH2O) prominently displayed, fund pools, set price/rates
- Staking admin: APR, fees, fund reward pools for all 6 staking contracts
- No bot configuration tab (removed)

## Available Commands
```bash
npm run dev    # Start React frontend (port 5000)
npm run build  # Build for production
```

## Key Dependencies
- React 18 + Vite 5 + wagmi v2 + viem v2
- WalletConnect Web3Modal v4
- @worldcoin/minikit-js
- Solidity 0.8.20 + OpenZeppelin v5 + Uniswap V3
