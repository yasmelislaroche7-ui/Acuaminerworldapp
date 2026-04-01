// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/**
 * @title H2OMining
 * @notice Permanent mining package system. Users buy units with WLD and earn H2O + BTCH2O rewards over time.
 */
contract H2OMining {
    address public owner;

    IERC20 public immutable wldToken;
    IERC20 public immutable h2oToken;
    IERC20 public immutable btch2oToken;

    uint256 public packagePriceWLD;
    uint256 public h2oRatePerYear;
    uint256 public btch2oRatePerYear;
    uint256 public constant YEAR = 365 days;

    struct UserInfo {
        uint256 power;
        uint256 lastClaimed;
        uint256 pendingH2O;
        uint256 pendingBTCH2O;
    }

    mapping(address => UserInfo) public users;

    uint256 public totalPower;
    uint256 public h2oPool;
    uint256 public btch2oPool;
    uint256 public wldCollected;

    event PackageBought(address indexed user, uint256 unitsBought, uint256 totalPower);
    event RewardsClaimed(address indexed user, uint256 h2oAmount, uint256 btch2oAmount);
    event PoolFunded(address indexed token, uint256 amount);
    event WLDWithdrawn(uint256 amount);
    event RatesUpdated(uint256 h2oRate, uint256 btch2oRate);
    event PriceUpdated(uint256 newPrice);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor(
        address _wld,
        address _h2o,
        address _btch2o,
        uint256 _packagePriceWLD,
        uint256 _h2oRatePerYear,
        uint256 _btch2oRatePerYear
    ) {
        owner = msg.sender;
        wldToken    = IERC20(_wld);
        h2oToken    = IERC20(_h2o);
        btch2oToken = IERC20(_btch2o);
        packagePriceWLD   = _packagePriceWLD;
        h2oRatePerYear    = _h2oRatePerYear;
        btch2oRatePerYear = _btch2oRatePerYear;
    }

    // ─── Internal ────────────────────────────────────────────────────────────────
    function _checkpoint(address user) internal {
        UserInfo storage u = users[user];
        if (u.power > 0 && u.lastClaimed > 0) {
            uint256 elapsed = block.timestamp - u.lastClaimed;
            u.pendingH2O    += (u.power * h2oRatePerYear * elapsed) / YEAR;
            u.pendingBTCH2O += (u.power * btch2oRatePerYear * elapsed) / YEAR;
        }
        u.lastClaimed = block.timestamp;
    }

    // ─── User Functions ──────────────────────────────────────────────────────────
    /**
     * @notice Buy one or more mining packages. Each unit costs `packagePriceWLD` WLD.
     * @param units Number of units to buy (>= 1).
     */
    function buyPackage(uint256 units) external {
        require(units >= 1, "Min 1 unit");
        _checkpoint(msg.sender);
        uint256 totalCost = packagePriceWLD * units;
        require(wldToken.transferFrom(msg.sender, address(this), totalCost), "WLD transfer failed");
        wldCollected += totalCost;
        users[msg.sender].power += units;
        totalPower += units;
        if (users[msg.sender].lastClaimed == 0) {
            users[msg.sender].lastClaimed = block.timestamp;
        }
        emit PackageBought(msg.sender, units, users[msg.sender].power);
    }

    /**
     * @notice View pending rewards for a user (live calculation).
     */
    function pendingRewards(address user) external view returns (uint256 h2oAmt, uint256 btch2oAmt) {
        UserInfo storage u = users[user];
        h2oAmt    = u.pendingH2O;
        btch2oAmt = u.pendingBTCH2O;
        if (u.power > 0 && u.lastClaimed > 0) {
            uint256 elapsed = block.timestamp - u.lastClaimed;
            h2oAmt    += (u.power * h2oRatePerYear * elapsed) / YEAR;
            btch2oAmt += (u.power * btch2oRatePerYear * elapsed) / YEAR;
        }
    }

    /**
     * @notice Claim all pending H2O and BTCH2O rewards.
     */
    function claimRewards() external {
        _checkpoint(msg.sender);
        UserInfo storage u = users[msg.sender];
        uint256 h2o    = u.pendingH2O;
        uint256 btch2o = u.pendingBTCH2O;
        require(h2o > 0 || btch2o > 0, "Nothing to claim");

        u.pendingH2O    = 0;
        u.pendingBTCH2O = 0;

        if (h2o > 0) {
            uint256 available = h2o <= h2oPool ? h2o : h2oPool;
            if (available > 0) {
                h2oPool -= available;
                require(h2oToken.transfer(msg.sender, available), "H2O transfer failed");
                h2o = available;
            } else {
                h2o = 0;
            }
        }
        if (btch2o > 0) {
            uint256 available = btch2o <= btch2oPool ? btch2o : btch2oPool;
            if (available > 0) {
                btch2oPool -= available;
                require(btch2oToken.transfer(msg.sender, available), "BTCH2O transfer failed");
                btch2o = available;
            } else {
                btch2o = 0;
            }
        }
        emit RewardsClaimed(msg.sender, h2o, btch2o);
    }

    // ─── Owner Functions ─────────────────────────────────────────────────────────
    function setPackagePrice(uint256 _price) external onlyOwner {
        require(_price > 0, "Price must be > 0");
        packagePriceWLD = _price;
        emit PriceUpdated(_price);
    }

    function setRewardRates(uint256 _h2oRate, uint256 _btch2oRate) external onlyOwner {
        h2oRatePerYear    = _h2oRate;
        btch2oRatePerYear = _btch2oRate;
        emit RatesUpdated(_h2oRate, _btch2oRate);
    }

    function fundH2O(uint256 amount) external onlyOwner {
        require(h2oToken.transferFrom(msg.sender, address(this), amount), "H2O transfer failed");
        h2oPool += amount;
        emit PoolFunded(address(h2oToken), amount);
    }

    function fundBTCH2O(uint256 amount) external onlyOwner {
        require(btch2oToken.transferFrom(msg.sender, address(this), amount), "BTCH2O transfer failed");
        btch2oPool += amount;
        emit PoolFunded(address(btch2oToken), amount);
    }

    function withdrawWLD() external onlyOwner {
        uint256 bal = wldToken.balanceOf(address(this));
        require(bal > 0, "No WLD to withdraw");
        require(wldToken.transfer(owner, bal), "Transfer failed");
        wldCollected = 0;
        emit WLDWithdrawn(bal);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Zero address");
        owner = newOwner;
    }

    function rescueToken(address token, uint256 amount) external onlyOwner {
        require(IERC20(token).transfer(owner, amount), "Transfer failed");
    }
}
