// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/// @title UTH2Mining V2 — Dual-owner, multi-reward-token, 7-package UTH₂ mining (permanent, per-second rewards)
contract UTH2Mining {
    IERC20 public immutable uth2;

    address public owner1;
    address public owner2;

    uint256 public constant YEAR    = 365 days;
    uint256 public constant NUM_PKG = 7;

    // ── Reward tokens list (index 0 = primary = BTCH2O) ──────────────────────
    address[] public rewardTokens;
    mapping(address => bool) public isRewardToken;

    struct Package {
        uint256 price;       // Cost in UTH₂ (wei)
        uint256 ratePerYear; // Primary reward token earned per year per unit (wei)
    }

    Package[7] public packages;

    struct UserInfo {
        uint256[7] counts; // How many of each package the user holds (additive, permanent)
        uint256 lastClaim; // Last settlement timestamp
        uint256 accrued;   // Settled but unclaimed primary reward
    }

    mapping(address => UserInfo) public userInfo;
    uint256 public totalUTH2Collected;

    // ── Events ────────────────────────────────────────────────────────────────
    event PackageBought(address indexed user, uint8 pkg, uint256 count, uint256 cost);
    event RewardsClaimed(address indexed user, uint256 amount, address indexed token);
    event PackageUpdated(uint8 pkg, uint256 price, uint256 rate);
    event PoolFunded(address indexed token, uint256 amount, address indexed funder);
    event RewardTokenAdded(address indexed token);
    event RewardTokenRemoved(address indexed token);
    event Owner2Changed(address indexed newOwner2);
    event Owner1Transferred(address indexed newOwner1);

    modifier onlyOwner1() {
        require(msg.sender == owner1, "Not owner1");
        _;
    }

    modifier onlyOwners() {
        require(msg.sender == owner1 || msg.sender == owner2, "Not an owner");
        _;
    }

    // ── Constructor ───────────────────────────────────────────────────────────
    constructor(
        address _uth2,
        address _btch2o,
        address _owner2,
        uint256[7] memory _prices,
        uint256[7] memory _rates
    ) {
        require(_owner2 != address(0), "Owner2 zero");
        owner1 = msg.sender;
        owner2 = _owner2;
        uth2   = IERC20(_uth2);

        // BTCH2O is the primary reward token
        rewardTokens.push(_btch2o);
        isRewardToken[_btch2o] = true;

        for (uint8 i = 0; i < 7; i++) {
            packages[i] = Package(_prices[i], _rates[i]);
        }
    }

    // ── Internal ──────────────────────────────────────────────────────────────
    function _settle(address user) internal {
        UserInfo storage u = userInfo[user];
        if (u.lastClaim == 0) {
            u.lastClaim = block.timestamp;
            return;
        }
        uint256 elapsed = block.timestamp - u.lastClaim;
        uint256 rate    = _userRate(user);
        u.accrued  += (rate * elapsed) / YEAR;
        u.lastClaim = block.timestamp;
    }

    function _userRate(address user) internal view returns (uint256 rate) {
        UserInfo storage u = userInfo[user];
        for (uint8 i = 0; i < 7; i++) {
            if (u.counts[i] > 0) rate += u.counts[i] * packages[i].ratePerYear;
        }
    }

    // ── Views ─────────────────────────────────────────────────────────────────
    function pendingRewards(address user) external view returns (uint256) {
        UserInfo storage u = userInfo[user];
        if (u.lastClaim == 0) return 0;
        uint256 elapsed = block.timestamp - u.lastClaim;
        return u.accrued + (_userRate(user) * elapsed) / YEAR;
    }

    function getUserCounts(address user) external view returns (uint256[7] memory) {
        return userInfo[user].counts;
    }

    function getUserRate(address user) external view returns (uint256) {
        return _userRate(user);
    }

    function getPackages() external view returns (
        uint256[7] memory prices,
        uint256[7] memory rates
    ) {
        for (uint8 i = 0; i < 7; i++) {
            prices[i] = packages[i].price;
            rates[i]  = packages[i].ratePerYear;
        }
    }

    function primaryToken() external view returns (address) {
        return rewardTokens[0];
    }

    /// @notice Balance of the primary reward token (BTCH2O) in the contract
    function poolBalance() external view returns (uint256) {
        return IERC20(rewardTokens[0]).balanceOf(address(this));
    }

    /// @notice All reward token addresses
    function getRewardTokens() external view returns (address[] memory) {
        return rewardTokens;
    }

    /// @notice Balances of ALL reward tokens in the contract
    function getContractBalances() external view returns (
        address[] memory tokens,
        uint256[] memory balances
    ) {
        tokens   = rewardTokens;
        balances = new uint256[](rewardTokens.length);
        for (uint256 i = 0; i < rewardTokens.length; i++) {
            balances[i] = IERC20(rewardTokens[i]).balanceOf(address(this));
        }
    }

    // ── User Actions ──────────────────────────────────────────────────────────

    /// @notice Buy one or more mining packages. Payment split 50/50 between owner1 & owner2.
    function buyPackage(uint8 pkg, uint256 count) external {
        require(pkg < 7,   "Invalid package");
        require(count > 0, "Count zero");
        _settle(msg.sender);

        uint256 cost  = packages[pkg].price * count;
        uint256 half  = cost / 2;
        uint256 rest  = cost - half; // handles odd amounts (rest >= half)

        require(uth2.transferFrom(msg.sender, owner1, half), "UTH2 transfer to owner1 failed");
        require(uth2.transferFrom(msg.sender, owner2, rest), "UTH2 transfer to owner2 failed");

        totalUTH2Collected              += cost;
        userInfo[msg.sender].counts[pkg] += count;

        emit PackageBought(msg.sender, pkg, count, cost);
    }

    /// @notice Claim all accumulated rewards (single claim for all packages)
    function claimRewards() external {
        _settle(msg.sender);
        uint256 amt = userInfo[msg.sender].accrued;
        require(amt > 0, "Nothing to claim");

        address pt = rewardTokens[0];
        require(IERC20(pt).balanceOf(address(this)) >= amt, "Reward pool low - contact owner");

        userInfo[msg.sender].accrued = 0;
        require(IERC20(pt).transfer(msg.sender, amt), "Reward transfer failed");

        emit RewardsClaimed(msg.sender, amt, pt);
    }

    // ── Owner1-only Admin ─────────────────────────────────────────────────────

    function setPackage(uint8 pkg, uint256 price, uint256 rate) external onlyOwner1 {
        require(pkg < 7, "Invalid package");
        packages[pkg] = Package(price, rate);
        emit PackageUpdated(pkg, price, rate);
    }

    function setAllPackages(
        uint256[7] calldata prices,
        uint256[7] calldata rates
    ) external onlyOwner1 {
        for (uint8 i = 0; i < 7; i++) {
            packages[i] = Package(prices[i], rates[i]);
        }
    }

    function transferOwner1(address newOwner) external onlyOwner1 {
        require(newOwner != address(0), "Zero address");
        owner1 = newOwner;
        emit Owner1Transferred(newOwner);
    }

    function setOwner2(address newOwner2) external onlyOwner1 {
        require(newOwner2 != address(0), "Zero address");
        owner2 = newOwner2;
        emit Owner2Changed(newOwner2);
    }

    // ── Both Owners ───────────────────────────────────────────────────────────

    /// @notice Fund the contract with any listed reward token
    function fundPool(address token, uint256 amount) external onlyOwners {
        require(isRewardToken[token], "Token not in reward list");
        require(IERC20(token).transferFrom(msg.sender, address(this), amount), "Fund transfer failed");
        emit PoolFunded(token, amount, msg.sender);
    }

    /// @notice Add a new ERC20 reward token (address must be a valid ERC20)
    function addRewardToken(address token) external onlyOwners {
        require(token != address(0), "Zero address");
        require(!isRewardToken[token], "Token already added");
        rewardTokens.push(token);
        isRewardToken[token] = true;
        emit RewardTokenAdded(token);
    }

    /// @notice Remove a reward token (cannot remove primary token at index 0)
    function removeRewardToken(address token) external onlyOwners {
        require(isRewardToken[token], "Not a reward token");
        require(rewardTokens[0] != token, "Cannot remove primary reward token");
        isRewardToken[token] = false;
        for (uint256 i = 1; i < rewardTokens.length; i++) {
            if (rewardTokens[i] == token) {
                rewardTokens[i] = rewardTokens[rewardTokens.length - 1];
                rewardTokens.pop();
                break;
            }
        }
        emit RewardTokenRemoved(token);
    }

    /// @notice Emergency rescue of any token (sends to caller)
    function rescueToken(address token, uint256 amount) external onlyOwners {
        IERC20(token).transfer(msg.sender, amount);
    }
}
