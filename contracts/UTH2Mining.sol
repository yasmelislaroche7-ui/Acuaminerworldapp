// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/// @title UTH2Mining — 7-package UTH₂ mining contract, rewards in BTCH2O (24/7)
contract UTH2Mining {
    IERC20 public immutable uth2;
    IERC20 public immutable btch2o;
    address public owner;

    uint256 public constant YEAR = 365 days;
    uint256 public constant NUM_PKG = 7;

    struct Package {
        uint256 price;       // Cost in UTH₂ (wei)
        uint256 ratePerYear; // BTCH2O earned per year per unit (wei)
    }

    Package[7] public packages;

    struct UserInfo {
        uint256[7] counts;   // How many of each package the user holds
        uint256 lastClaim;   // Last settlement timestamp
        uint256 accrued;     // Settled but unclaimed BTCH2O
    }

    mapping(address => UserInfo) public userInfo;
    uint256 public totalUTH2Collected;

    // ── Events ───────────────────────────────────────────────────────────────
    event PackageBought(address indexed user, uint8 pkg, uint256 count, uint256 cost);
    event RewardsClaimed(address indexed user, uint256 amount);
    event PackageUpdated(uint8 pkg, uint256 price, uint256 rate);
    event PoolFunded(uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    // ── Constructor ──────────────────────────────────────────────────────────
    constructor(
        address _uth2,
        address _btch2o,
        uint256[7] memory _prices,
        uint256[7] memory _rates
    ) {
        owner  = msg.sender;
        uth2   = IERC20(_uth2);
        btch2o = IERC20(_btch2o);
        for (uint8 i = 0; i < 7; i++) {
            packages[i] = Package(_prices[i], _rates[i]);
        }
    }

    // ── Internal ─────────────────────────────────────────────────────────────
    function _settle(address user) internal {
        UserInfo storage u = userInfo[user];
        if (u.lastClaim == 0) {
            u.lastClaim = block.timestamp;
            return;
        }
        uint256 elapsed = block.timestamp - u.lastClaim;
        uint256 rate    = 0;
        for (uint8 i = 0; i < 7; i++) {
            if (u.counts[i] > 0) rate += u.counts[i] * packages[i].ratePerYear;
        }
        u.accrued  += (rate * elapsed) / YEAR;
        u.lastClaim = block.timestamp;
    }

    // ── Views ────────────────────────────────────────────────────────────────
    function pendingRewards(address user) external view returns (uint256) {
        UserInfo storage u = userInfo[user];
        if (u.lastClaim == 0) return 0;
        uint256 elapsed = block.timestamp - u.lastClaim;
        uint256 rate    = 0;
        for (uint8 i = 0; i < 7; i++) {
            if (u.counts[i] > 0) rate += u.counts[i] * packages[i].ratePerYear;
        }
        return u.accrued + (rate * elapsed) / YEAR;
    }

    function getUserCounts(address user) external view returns (uint256[7] memory) {
        return userInfo[user].counts;
    }

    function getUserRate(address user) external view returns (uint256 ratePerYear) {
        UserInfo storage u = userInfo[user];
        for (uint8 i = 0; i < 7; i++) {
            if (u.counts[i] > 0) ratePerYear += u.counts[i] * packages[i].ratePerYear;
        }
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

    function poolBalance() external view returns (uint256) {
        return btch2o.balanceOf(address(this));
    }

    // ── User Actions ─────────────────────────────────────────────────────────
    function buyPackage(uint8 pkg, uint256 count) external {
        require(pkg < 7,   "Invalid package");
        require(count > 0, "Count zero");
        _settle(msg.sender);
        uint256 cost = packages[pkg].price * count;
        require(uth2.transferFrom(msg.sender, address(this), cost), "UTH2 transfer failed");
        totalUTH2Collected             += cost;
        userInfo[msg.sender].counts[pkg] += count;
        emit PackageBought(msg.sender, pkg, count, cost);
    }

    function claimRewards() external {
        _settle(msg.sender);
        uint256 amt = userInfo[msg.sender].accrued;
        require(amt > 0, "Nothing to claim");
        require(btch2o.balanceOf(address(this)) >= amt, "Reward pool low");
        userInfo[msg.sender].accrued = 0;
        require(btch2o.transfer(msg.sender, amt), "BTCH2O transfer failed");
        emit RewardsClaimed(msg.sender, amt);
    }

    // ── Owner Actions ────────────────────────────────────────────────────────
    function setPackage(uint8 pkg, uint256 price, uint256 rate) external onlyOwner {
        require(pkg < 7, "Invalid package");
        packages[pkg] = Package(price, rate);
        emit PackageUpdated(pkg, price, rate);
    }

    function setAllPackages(uint256[7] calldata prices, uint256[7] calldata rates) external onlyOwner {
        for (uint8 i = 0; i < 7; i++) {
            packages[i] = Package(prices[i], rates[i]);
        }
    }

    function fundPool(uint256 amount) external onlyOwner {
        require(btch2o.transferFrom(msg.sender, address(this), amount), "Fund failed");
        emit PoolFunded(amount);
    }

    function withdrawUTH2() external onlyOwner {
        uint256 bal = uth2.balanceOf(address(this));
        require(bal > 0, "Nothing to withdraw");
        uth2.transfer(owner, bal);
    }

    function rescueToken(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(owner, amount);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Zero address");
        owner = newOwner;
    }
}
