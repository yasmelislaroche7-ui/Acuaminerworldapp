// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// ── Interfaces ────────────────────────────────────────────────────────────────

interface IUniswapV3Factory {
    function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address);
}

interface IUniswapV3Pool {
    function slot0() external view returns (
        uint160 sqrtPriceX96, int24 tick,
        uint16, uint16, uint16, uint8, bool
    );
    function token0() external view returns (address);
    function token1() external view returns (address);
}

interface INonfungiblePositionManager {
    struct CollectParams {
        uint256 tokenId;
        address recipient;
        uint128 amount0Max;
        uint128 amount1Max;
    }
    struct IncreaseLiquidityParams {
        uint256 tokenId;
        uint256 amount0Desired;
        uint256 amount1Desired;
        uint256 amount0Min;
        uint256 amount1Min;
        uint256 deadline;
    }
    function collect(CollectParams calldata params) external returns (uint256 amount0, uint256 amount1);
    function positions(uint256 tokenId) external view returns (
        uint96 nonce, address operator,
        address token0, address token1,
        uint24 fee, int24 tickLower, int24 tickUpper,
        uint128 liquidity,
        uint256 feeGrowthInside0LastX128,
        uint256 feeGrowthInside1LastX128,
        uint128 tokensOwed0, uint128 tokensOwed1
    );
    function increaseLiquidity(IncreaseLiquidityParams calldata params)
        external returns (uint128 liquidity, uint256 amount0, uint256 amount1);
}

interface ISwapRouter {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24  fee;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }
    function exactInputSingle(ExactInputSingleParams calldata params) external returns (uint256 amountOut);
}

interface ITimeStaking {
    function stake(uint256 amount) external;
    function unstake(uint256 amount) external;
    function claimWldReward() external;
    function pendingWldReward(address staker) external view returns (uint256);
    function stakedBalance(address staker) external view returns (uint256);
    function totalStaked() external view returns (uint256);
}

// ── Main contract ─────────────────────────────────────────────────────────────

contract AutoReinvestBotV6 is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ── Uniswap V3 on World Chain ─────────────────────────────────────────────
    address public constant POSITION_MANAGER = 0xec12a9F9a09f50550686363766Cc153D03c27b5e;
    address public constant SWAP_ROUTER      = 0x091AD9e2e6e5eD44c1c66dB50e49A601F9f36cF6;
    address public constant UNISWAP_FACTORY  = 0x7a5028BDa40e7B173C278C5342087826455ea25a;

    // ── Core tokens (WLD is base currency) ───────────────────────────────────
    address public immutable WLD;
    address public immutable TIME_TOKEN;
    address public immutable TIME_STAKING;

    // ── Multi-owner ───────────────────────────────────────────────────────────
    address public primaryOwner;
    mapping(address => bool) public isOwner;
    address[] public ownerList;

    // ── Config ────────────────────────────────────────────────────────────────
    uint256 public reinvestIntervalSecs = 300;
    uint256 public reserveFeeBps        = 200;   // 2% reserve from every collect
    uint256 public slippageBps          = 0;     // 0 = no min out, e.g. 100 = 1% max slippage
    uint24  public defaultSwapFeeTier   = 3000;  // default Uniswap fee tier
    bool    public paused;
    uint256 public lastReinvestAt;

    // ── Per-pair fee tier overrides ───────────────────────────────────────────
    // key = keccak256(abi.encodePacked(tokenA, tokenB)) — canonical order (lower first)
    mapping(bytes32 => uint24) public pairFeeTier;

    // ── Distribution tokens (replace hardcoded H2O/BTCH2O) ───────────────────
    struct DistToken {
        address token;
        uint256 shareBps;    // share of remaining WLD after reserve
        uint24  swapFeeTier; // fee tier for WLD → this token
    }
    DistToken[] public distTokens;
    mapping(address => bool) public isDistToken;

    // ── Positions ─────────────────────────────────────────────────────────────
    mapping(uint256 => bool) public isManaged;
    mapping(uint256 => bool) public inRange;
    uint256[] public managedPositions;

    // ── Reserves — any token ──────────────────────────────────────────────────
    mapping(address => uint256) public reserve;
    address[] public reserveTokenList;
    mapping(address => bool) public isReserveToken;

    // ── Events ────────────────────────────────────────────────────────────────
    event OwnerAdded(address indexed owner);
    event OwnerRemoved(address indexed owner);
    event PositionAdded(uint256 indexed tokenId);
    event PositionRemoved(uint256 indexed tokenId);
    event FeesCollected(uint256 indexed tokenId, address token0, address token1, uint256 amount0, uint256 amount1);
    event StakingRewardClaimed(uint256 wldAmount);
    event Swapped(address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut);
    event SwapFailed(address indexed tokenIn, address indexed tokenOut, uint256 amountIn);
    event LiquidityAdded(uint256 indexed tokenId, uint128 liquidity);
    event ReserveWithdrawn(address indexed token, address indexed to, uint256 amount);
    event ConfigUpdated(string key, uint256 value);
    event ContractPaused(bool isPaused);
    event ReinvestCompleted(uint256 timestamp, uint256 totalWLD);
    event TimeStaked(uint256 amount);
    event TimeUnstaked(uint256 amount);
    event DistTokenAdded(address indexed token, uint256 shareBps, uint24 feeTier);
    event DistTokenRemoved(address indexed token);
    event ReserveTokenAdded(address indexed token);
    event ReserveTokenRemoved(address indexed token);
    event TokenSwapped(address indexed token, uint256 amount, address indexed to);

    // ── Modifiers ─────────────────────────────────────────────────────────────

    modifier onlyOwner() {
        require(isOwner[msg.sender], "Not an owner");
        _;
    }

    modifier onlyPrimary() {
        require(msg.sender == primaryOwner, "Only primary owner");
        _;
    }

    modifier notPaused() {
        require(!paused, "Contract is paused");
        _;
    }

    // ── Constructor ───────────────────────────────────────────────────────────

    constructor(
        address _WLD,
        address _timeToken,
        address _timeStaking
    ) {
        WLD          = _WLD;
        TIME_TOKEN   = _timeToken;
        TIME_STAKING = _timeStaking;

        primaryOwner = msg.sender;
        isOwner[msg.sender] = true;
        ownerList.push(msg.sender);

        // WLD is always tracked in reserve
        _addReserveTokenInternal(_WLD);
    }

    // ── FullMath (inline, 512-bit safe) ───────────────────────────────────────

    function _mulDiv(uint256 a, uint256 b, uint256 denominator) internal pure returns (uint256 result) {
        unchecked {
            uint256 prod0 = a * b;
            uint256 prod1;
            assembly {
                let mm := mulmod(a, b, not(0))
                prod1 := sub(sub(mm, prod0), lt(mm, prod0))
            }
            if (prod1 == 0) {
                if (denominator == 0) return 0;
                return prod0 / denominator;
            }
            if (denominator <= prod1) return 0;
            uint256 remainder;
            assembly { remainder := mulmod(a, b, denominator) }
            assembly {
                prod1 := sub(prod1, gt(remainder, prod0))
                prod0 := sub(prod0, remainder)
            }
            uint256 twos = denominator & (~denominator + 1);
            assembly { denominator := div(denominator, twos) }
            assembly { prod0 := div(prod0, twos) }
            assembly { twos := add(div(sub(0, twos), twos), 1) }
            prod0 |= prod1 * twos;
            uint256 inv = (3 * denominator) ^ 2;
            inv *= 2 - denominator * inv;
            inv *= 2 - denominator * inv;
            inv *= 2 - denominator * inv;
            inv *= 2 - denominator * inv;
            inv *= 2 - denominator * inv;
            inv *= 2 - denominator * inv;
            result = prod0 * inv;
        }
    }

    // ── Owner management ──────────────────────────────────────────────────────

    function addOwner(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Zero address");
        require(!isOwner[newOwner], "Already owner");
        isOwner[newOwner] = true;
        ownerList.push(newOwner);
        emit OwnerAdded(newOwner);
    }

    function removeOwner(address owner) external onlyPrimary {
        require(owner != primaryOwner, "Cannot remove primary");
        require(isOwner[owner], "Not an owner");
        isOwner[owner] = false;
        for (uint256 i = 0; i < ownerList.length; i++) {
            if (ownerList[i] == owner) {
                ownerList[i] = ownerList[ownerList.length - 1];
                ownerList.pop();
                break;
            }
        }
        emit OwnerRemoved(owner);
    }

    function getOwners() external view returns (address[] memory) {
        return ownerList;
    }

    // ── Configuration ─────────────────────────────────────────────────────────

    function setReinvestInterval(uint256 secs) external onlyOwner {
        require(secs >= 60, "Min 60s");
        reinvestIntervalSecs = secs;
        emit ConfigUpdated("reinvestIntervalSecs", secs);
    }

    function setReserveFeeBps(uint256 bps) external onlyOwner {
        require(bps <= 3000, "Max 30%");
        reserveFeeBps = bps;
        emit ConfigUpdated("reserveFeeBps", bps);
    }

    function setSlippageBps(uint256 bps) external onlyOwner {
        require(bps < 10000, "Must be < 10000");
        slippageBps = bps;
        emit ConfigUpdated("slippageBps", bps);
    }

    function setDefaultSwapFeeTier(uint24 feeTier) external onlyOwner {
        require(feeTier == 100 || feeTier == 500 || feeTier == 3000 || feeTier == 10000, "Invalid tier");
        defaultSwapFeeTier = feeTier;
    }

    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
        emit ContractPaused(_paused);
    }

    // ── Per-pair fee tier ─────────────────────────────────────────────────────

    function setPairFeeTier(address tokenA, address tokenB, uint24 feeTier) external onlyOwner {
        require(feeTier == 100 || feeTier == 500 || feeTier == 3000 || feeTier == 10000 || feeTier == 0, "Invalid tier");
        (address t0, address t1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        pairFeeTier[keccak256(abi.encodePacked(t0, t1))] = feeTier;
    }

    function getPairFeeTier(address tokenA, address tokenB) public view returns (uint24) {
        (address t0, address t1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        uint24 tier = pairFeeTier[keccak256(abi.encodePacked(t0, t1))];
        return tier == 0 ? defaultSwapFeeTier : tier;
    }

    // ── Distribution tokens ───────────────────────────────────────────────────

    function addDistToken(address token, uint256 shareBps, uint24 feeTier) external onlyOwner {
        require(token != address(0), "Zero address");
        require(token != WLD, "Cannot distribute WLD to itself");
        require(!isDistToken[token], "Already added");
        require(_getTotalDistBps() + shareBps <= 9500, "Total dist > 95%"); // leave some for reinvest
        require(feeTier == 100 || feeTier == 500 || feeTier == 3000 || feeTier == 10000, "Invalid tier");

        isDistToken[token] = true;
        distTokens.push(DistToken(token, shareBps, feeTier));
        _addReserveTokenInternal(token);
        emit DistTokenAdded(token, shareBps, feeTier);
    }

    function removeDistToken(address token) external onlyOwner {
        require(isDistToken[token], "Not a dist token");
        isDistToken[token] = false;
        for (uint256 i = 0; i < distTokens.length; i++) {
            if (distTokens[i].token == token) {
                distTokens[i] = distTokens[distTokens.length - 1];
                distTokens.pop();
                break;
            }
        }
        emit DistTokenRemoved(token);
    }

    function setDistTokenShare(address token, uint256 shareBps, uint24 feeTier) external onlyOwner {
        require(isDistToken[token], "Not a dist token");
        require(feeTier == 100 || feeTier == 500 || feeTier == 3000 || feeTier == 10000, "Invalid tier");
        for (uint256 i = 0; i < distTokens.length; i++) {
            if (distTokens[i].token == token) {
                uint256 totalWithout = _getTotalDistBps() - distTokens[i].shareBps;
                require(totalWithout + shareBps <= 9500, "Total dist > 95%");
                distTokens[i].shareBps = shareBps;
                distTokens[i].swapFeeTier = feeTier;
                break;
            }
        }
    }

    function getDistTokens() external view returns (DistToken[] memory) {
        return distTokens;
    }

    function _getTotalDistBps() internal view returns (uint256 total) {
        for (uint256 i = 0; i < distTokens.length; i++) {
            total += distTokens[i].shareBps;
        }
    }

    // ── Reserve token management ──────────────────────────────────────────────

    function addReserveToken(address token) external onlyOwner {
        _addReserveTokenInternal(token);
    }

    function _addReserveTokenInternal(address token) internal {
        if (isReserveToken[token]) return;
        isReserveToken[token] = true;
        reserveTokenList.push(token);
        emit ReserveTokenAdded(token);
    }

    function removeReserveToken(address token) external onlyOwner {
        require(isReserveToken[token], "Not tracked");
        require(token != WLD, "Cannot remove WLD");
        isReserveToken[token] = false;
        for (uint256 i = 0; i < reserveTokenList.length; i++) {
            if (reserveTokenList[i] == token) {
                reserveTokenList[i] = reserveTokenList[reserveTokenList.length - 1];
                reserveTokenList.pop();
                break;
            }
        }
        emit ReserveTokenRemoved(token);
    }

    function getReserveTokens() external view returns (address[] memory) {
        return reserveTokenList;
    }

    function getReserveBalance(address token) external view returns (uint256) {
        return reserve[token];
    }

    function getReserveBalances() external view returns (address[] memory tokens, uint256[] memory balances) {
        tokens = reserveTokenList;
        balances = new uint256[](reserveTokenList.length);
        for (uint256 i = 0; i < reserveTokenList.length; i++) {
            balances[i] = reserve[reserveTokenList[i]];
        }
    }

    // ── TIME staking (through bot) ────────────────────────────────────────────

    function stakeTime(uint256 amount) external onlyOwner {
        require(amount > 0, "Zero amount");
        IERC20(TIME_TOKEN).forceApprove(TIME_STAKING, amount);
        ITimeStaking(TIME_STAKING).stake(amount);
        IERC20(TIME_TOKEN).forceApprove(TIME_STAKING, 0);
        emit TimeStaked(amount);
    }

    function unstakeTime(uint256 amount) external onlyOwner {
        require(amount > 0, "Zero amount");
        ITimeStaking(TIME_STAKING).unstake(amount);
        emit TimeUnstaked(amount);
    }

    function pendingStakingReward() external view returns (uint256) {
        return ITimeStaking(TIME_STAKING).pendingWldReward(address(this));
    }

    function stakedTimeBalance() external view returns (uint256) {
        return ITimeStaking(TIME_STAKING).stakedBalance(address(this));
    }

    function getStakingInfo() external view returns (
        uint256 stakedTime,
        uint256 pendingWLD,
        uint256 totalStakedInContract
    ) {
        stakedTime            = ITimeStaking(TIME_STAKING).stakedBalance(address(this));
        pendingWLD            = ITimeStaking(TIME_STAKING).pendingWldReward(address(this));
        totalStakedInContract = ITimeStaking(TIME_STAKING).totalStaked();
    }

    // ── Position management ───────────────────────────────────────────────────

    function addPosition(uint256 tokenId) external onlyOwner {
        require(!isManaged[tokenId], "Already managed");
        managedPositions.push(tokenId);
        isManaged[tokenId] = true;
        _updateRange(tokenId);
        emit PositionAdded(tokenId);
    }

    function removePosition(uint256 tokenId) external onlyOwner {
        require(isManaged[tokenId], "Not managed");
        isManaged[tokenId] = false;
        for (uint256 i = 0; i < managedPositions.length; i++) {
            if (managedPositions[i] == tokenId) {
                managedPositions[i] = managedPositions[managedPositions.length - 1];
                managedPositions.pop();
                break;
            }
        }
        emit PositionRemoved(tokenId);
    }

    function getManagedPositions() external view returns (uint256[] memory) {
        return managedPositions;
    }

    function updateRanges(uint256[] calldata tokenIds) external onlyOwner {
        for (uint256 i = 0; i < tokenIds.length; i++) {
            if (isManaged[tokenIds[i]]) _updateRange(tokenIds[i]);
        }
    }

    function updateAllRanges() external onlyOwner {
        for (uint256 i = 0; i < managedPositions.length; i++) {
            _updateRange(managedPositions[i]);
        }
    }

    function _updateRange(uint256 tokenId) internal {
        (,, address t0, address t1, uint24 fee, int24 tLower, int24 tUpper,,,,,) =
            INonfungiblePositionManager(POSITION_MANAGER).positions(tokenId);

        address pool = IUniswapV3Factory(UNISWAP_FACTORY).getPool(t0, t1, fee);
        if (pool != address(0)) {
            (uint160 sqrtPriceX96, int24 tick,,,,,) = IUniswapV3Pool(pool).slot0();
            if (sqrtPriceX96 > 0) {
                inRange[tokenId] = (tick >= tLower && tick <= tUpper);
            }
        }
    }

    // ── Slippage computation ──────────────────────────────────────────────────

    function _getMinAmountOut(
        address tokenIn,
        address tokenOut,
        uint256 amtIn,
        uint24 feeTier
    ) internal view returns (uint256 minOut) {
        if (slippageBps == 0 || amtIn == 0) return 0;

        address pool = IUniswapV3Factory(UNISWAP_FACTORY).getPool(tokenIn, tokenOut, feeTier);
        if (pool == address(0)) return 0;

        try IUniswapV3Pool(pool).slot0() returns (uint160 sqrtPriceX96, int24, uint16, uint16, uint16, uint8, bool) {
            if (sqrtPriceX96 == 0) return 0;
            uint256 sq = uint256(sqrtPriceX96);
            uint256 spotOut;

            if (tokenIn < tokenOut) {
                // tokenIn = token0 → price = sq^2 / 2^192
                spotOut = _mulDiv(_mulDiv(amtIn, sq, 1 << 96), sq, 1 << 96);
            } else {
                // tokenIn = token1 → price = 2^192 / sq^2
                uint256 step1 = _mulDiv(amtIn, 1 << 96, sq);
                spotOut = _mulDiv(step1, 1 << 96, sq);
            }

            if (spotOut == 0) return 0;
            minOut = spotOut * (10000 - slippageBps) / 10000;
        } catch {
            return 0;
        }
    }

    // ── Core: collect all managed positions ───────────────────────────────────

    /// @notice Collect fees from ALL managed positions + claim TIME rewards + distribute
    function collectAllManaged(uint256 deadline) external onlyOwner notPaused nonReentrant {
        _runCollectAndDistribute(managedPositions, deadline, true);
    }

    /// @notice Collect fees from specific positions + distribute
    function collectFees(uint256[] calldata tokenIds, uint256 deadline)
        external onlyOwner notPaused nonReentrant
    {
        _runCollectAndDistribute(_toMemory(tokenIds), deadline, false);
    }

    /// @notice Claim TIME staking rewards only
    function claimStakingRewards(uint256 deadline) external onlyOwner notPaused nonReentrant {
        uint256 before = IERC20(WLD).balanceOf(address(this));
        try ITimeStaking(TIME_STAKING).claimWldReward() {} catch { return; }
        uint256 gained = IERC20(WLD).balanceOf(address(this)) - before;
        if (gained == 0) return;
        emit StakingRewardClaimed(gained);
        _distributeWLD(gained, managedPositions, deadline);
        lastReinvestAt = block.timestamp;
        emit ReinvestCompleted(block.timestamp, gained);
    }

    /// @notice Legacy: same as collectAllManaged
    function collectAll(uint256[] calldata tokenIds, uint256 deadline)
        external onlyOwner notPaused nonReentrant
    {
        _runCollectAndDistribute(_toMemory(tokenIds), deadline, true);
    }

    // ── Internal: core collect + distribute ───────────────────────────────────

    function _runCollectAndDistribute(
        uint256[] memory tokenIds,
        uint256 deadline,
        bool claimStaking
    ) internal {
        uint256 wldBefore = IERC20(WLD).balanceOf(address(this));

        // 1. Claim TIME staking rewards
        if (claimStaking) {
            try ITimeStaking(TIME_STAKING).claimWldReward() {
                uint256 stakeGain = IERC20(WLD).balanceOf(address(this)) - wldBefore;
                if (stakeGain > 0) emit StakingRewardClaimed(stakeGain);
            } catch {}
        }

        // 2. Collect fees from all positions (ANY token pair)
        for (uint256 i = 0; i < tokenIds.length; i++) {
            uint256 id = tokenIds[i];
            if (!isManaged[id]) continue;

            (,, address token0, address token1,,,,,,,,) =
                INonfungiblePositionManager(POSITION_MANAGER).positions(id);

            try INonfungiblePositionManager(POSITION_MANAGER).collect(
                INonfungiblePositionManager.CollectParams({
                    tokenId:    id,
                    recipient:  address(this),
                    amount0Max: type(uint128).max,
                    amount1Max: type(uint128).max
                })
            ) returns (uint256 a0, uint256 a1) {
                emit FeesCollected(id, token0, token1, a0, a1);
                // Track non-WLD tokens in reserve list
                if (token0 != WLD && a0 > 0) _addReserveTokenInternal(token0);
                if (token1 != WLD && a1 > 0) _addReserveTokenInternal(token1);
            } catch {}
        }

        // 3. Swap any non-WLD tokens to WLD (multi-token support)
        for (uint256 i = 0; i < reserveTokenList.length; i++) {
            address tok = reserveTokenList[i];
            if (tok == WLD) continue;
            if (isDistToken[tok]) continue; // don't auto-swap dist tokens (they get swapped from WLD)

            uint256 bal = IERC20(tok).balanceOf(address(this));
            // Subtract what's already in reserve (don't re-swap)
            uint256 freeAmt = bal > reserve[tok] ? bal - reserve[tok] : 0;
            if (freeAmt == 0) continue;

            uint24 tier = getPairFeeTier(tok, WLD);
            uint256 minOut = _getMinAmountOut(tok, WLD, freeAmt, tier);
            _swapSafe(tok, WLD, freeAmt, minOut, tier, deadline);
        }

        // 4. Distribute all free WLD (above reserve) — includes newly collected + any stranded balance
        uint256 wldNow  = IERC20(WLD).balanceOf(address(this));
        uint256 freeWLD = wldNow > reserve[WLD] ? wldNow - reserve[WLD] : 0;
        if (freeWLD == 0) return;

        _distributeWLD(freeWLD, tokenIds, deadline);
        lastReinvestAt = block.timestamp;
        emit ReinvestCompleted(block.timestamp, freeWLD);
    }

    function _distributeWLD(
        uint256 totalWLD,
        uint256[] memory tokenIds,
        uint256 deadline
    ) internal {
        // Reserve cut
        uint256 reserveAmt = totalWLD * reserveFeeBps / 10000;
        reserve[WLD] += reserveAmt;
        uint256 remaining = totalWLD - reserveAmt;

        // Swap to each distribution token
        for (uint256 i = 0; i < distTokens.length && remaining > 0; i++) {
            uint256 distAmt = totalWLD * distTokens[i].shareBps / 10000;
            if (distAmt > remaining) distAmt = remaining;
            if (distAmt == 0) continue;

            uint256 minOut = _getMinAmountOut(WLD, distTokens[i].token, distAmt, distTokens[i].swapFeeTier);
            _swapSafe(WLD, distTokens[i].token, distAmt, minOut, distTokens[i].swapFeeTier, deadline);
            remaining -= distAmt;
        }

        // Reinvest remaining WLD into LP positions (only WLD-containing positions)
        if (remaining > 0 && tokenIds.length > 0) {
            // Count eligible positions (in range AND contain WLD)
            uint256 eligible = 0;
            for (uint256 i = 0; i < tokenIds.length; i++) {
                if (!isManaged[tokenIds[i]] || !inRange[tokenIds[i]]) continue;
                (,, address t0, address t1,,,,,,,,) =
                    INonfungiblePositionManager(POSITION_MANAGER).positions(tokenIds[i]);
                if (t0 == WLD || t1 == WLD) eligible++;
            }

            if (eligible > 0) {
                uint256 perPos = remaining / eligible;
                for (uint256 i = 0; i < tokenIds.length; i++) {
                    if (!isManaged[tokenIds[i]] || !inRange[tokenIds[i]]) continue;
                    if (perPos == 0) break;
                    (,, address t0, address t1,,,,,,,,) =
                        INonfungiblePositionManager(POSITION_MANAGER).positions(tokenIds[i]);
                    if (t0 == WLD || t1 == WLD) {
                        _addLiquiditySafe(tokenIds[i], t0, t1, perPos, deadline);
                    }
                }
            }
        }
    }

    function _swapSafe(
        address tokenIn,
        address tokenOut,
        uint256 amtIn,
        uint256 amtOutMin,
        uint24  feeTier,
        uint256 deadline
    ) internal {
        if (amtIn == 0) return;

        // Try configured tier first, then fallback tiers if configured tier fails
        uint24[4] memory tiers = [feeTier, uint24(3000), uint24(500), uint24(10000)];
        bool swapped = false;

        for (uint256 t = 0; t < tiers.length && !swapped; t++) {
            uint24 tier = tiers[t];
            if (t > 0 && tier == feeTier) continue; // skip duplicate

            // Check pool exists
            address pool = IUniswapV3Factory(UNISWAP_FACTORY).getPool(tokenIn, tokenOut, tier);
            if (pool == address(0)) continue;

            IERC20(tokenIn).forceApprove(SWAP_ROUTER, amtIn);

            try ISwapRouter(SWAP_ROUTER).exactInputSingle(
                ISwapRouter.ExactInputSingleParams({
                    tokenIn:           tokenIn,
                    tokenOut:          tokenOut,
                    fee:               tier,
                    recipient:         address(this),
                    deadline:          deadline,
                    amountIn:          amtIn,
                    amountOutMinimum:  amtOutMin,
                    sqrtPriceLimitX96: 0
                })
            ) returns (uint256 amtOut) {
                IERC20(tokenIn).forceApprove(SWAP_ROUTER, 0);
                emit Swapped(tokenIn, tokenOut, amtIn, amtOut);
                // Track output token in reserve
                if (tokenOut != WLD) _addReserveTokenInternal(tokenOut);
                swapped = true;
            } catch {
                IERC20(tokenIn).forceApprove(SWAP_ROUTER, 0);
            }
        }

        if (!swapped) {
            emit SwapFailed(tokenIn, tokenOut, amtIn);
            // Tokens remain in contract — not lost, tracked in reserve
            _addReserveTokenInternal(tokenIn);
        }
    }

    function _addLiquiditySafe(
        uint256 tokenId,
        address token0,
        address token1,
        uint256 amtWLD,
        uint256 deadline
    ) internal {
        bool wldIs0 = token0 == WLD;
        address otherToken = wldIs0 ? token1 : token0;

        // Provide WLD on the WLD side, and any available balance of the other token
        uint256 otherBal = IERC20(otherToken).balanceOf(address(this));
        uint256 otherFree = otherBal > reserve[otherToken] ? otherBal - reserve[otherToken] : 0;

        IERC20(WLD).forceApprove(POSITION_MANAGER, amtWLD);
        if (otherFree > 0) IERC20(otherToken).forceApprove(POSITION_MANAGER, otherFree);

        try INonfungiblePositionManager(POSITION_MANAGER).increaseLiquidity(
            INonfungiblePositionManager.IncreaseLiquidityParams({
                tokenId:        tokenId,
                amount0Desired: wldIs0 ? amtWLD : otherFree,
                amount1Desired: wldIs0 ? otherFree : amtWLD,
                amount0Min:     0,
                amount1Min:     0,
                deadline:       deadline
            })
        ) returns (uint128 liq, uint256, uint256) {
            emit LiquidityAdded(tokenId, liq);
        } catch {}

        IERC20(WLD).forceApprove(POSITION_MANAGER, 0);
        if (otherFree > 0) IERC20(otherToken).forceApprove(POSITION_MANAGER, 0);
    }

    // ── Manual swap (owner can manually swap any token) ────────────────────────

    function manualSwap(
        address tokenIn,
        address tokenOut,
        uint256 amtIn,
        uint256 amtOutMin,
        uint24  feeTier,
        uint256 deadline
    ) external onlyOwner nonReentrant {
        require(amtIn > 0, "Zero amount");
        uint256 bal = IERC20(tokenIn).balanceOf(address(this));
        require(bal >= amtIn, "Insufficient balance");
        _swapSafe(tokenIn, tokenOut, amtIn, amtOutMin, feeTier, deadline);
    }

    // ── Reserve & withdrawal management ──────────────────────────────────────

    function withdrawReserve(address token, uint256 amount, address to) external onlyOwner {
        require(to != address(0), "Zero address");
        require(reserve[token] >= amount, "Insufficient reserve");
        reserve[token] -= amount;
        IERC20(token).safeTransfer(to, amount);
        emit ReserveWithdrawn(token, to, amount);
    }

    function withdrawAll(address token, address to) external onlyOwner {
        require(to != address(0), "Zero address");
        uint256 bal = IERC20(token).balanceOf(address(this));
        require(bal > 0, "Nothing to withdraw");
        if (reserve[token] >= bal) reserve[token] = 0;
        else reserve[token] = 0;
        IERC20(token).safeTransfer(to, bal);
        emit ReserveWithdrawn(token, to, bal);
    }

    function withdrawFreeBalance(address token, address to) external onlyOwner {
        require(to != address(0), "Zero address");
        uint256 bal = IERC20(token).balanceOf(address(this));
        uint256 free = bal > reserve[token] ? bal - reserve[token] : 0;
        require(free > 0, "No free balance");
        IERC20(token).safeTransfer(to, free);
        emit ReserveWithdrawn(token, to, free);
    }

    // ── Views ─────────────────────────────────────────────────────────────────

    function getConfig() external view returns (
        uint256 _reinvestIntervalSecs,
        uint256 _reserveFeeBps,
        uint256 _slippageBps,
        uint24  _defaultSwapFeeTier,
        bool    _paused,
        uint256 _lastReinvestAt
    ) {
        return (reinvestIntervalSecs, reserveFeeBps, slippageBps, defaultSwapFeeTier, paused, lastReinvestAt);
    }

    function getPosition(uint256 tokenId) external view returns (
        address token0, address token1,
        uint24  fee, int24 tickLower, int24 tickUpper,
        uint128 liquidity,
        uint128 tokensOwed0, uint128 tokensOwed1,
        bool    managed, bool isInRange
    ) {
        (,, token0, token1, fee, tickLower, tickUpper, liquidity,, , tokensOwed0, tokensOwed1) =
            INonfungiblePositionManager(POSITION_MANAGER).positions(tokenId);
        managed   = isManaged[tokenId];
        isInRange = inRange[tokenId];
    }

    // ── Helper ────────────────────────────────────────────────────────────────

    function _toMemory(uint256[] calldata arr) internal pure returns (uint256[] memory mem) {
        mem = new uint256[](arr.length);
        for (uint256 i = 0; i < arr.length; i++) mem[i] = arr[i];
    }
}
