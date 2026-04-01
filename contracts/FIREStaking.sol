// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

/// @title FIRE Staking Contract
/// @notice Staking para el token FIRE con APR y comisiones ajustables por el owner

interface IERC20 {
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract FIREStaking {

    // ── Storage ───────────────────────────────────────────────────────────────

    address public owner;
    IERC20  public stakingToken;

    /// @notice APR en basis-points (100 bps = 1%).  Ajustable por el owner.
    uint256 public aprBps;

    /// @notice Comisión al depositar, en bps (ej. 50 = 0.5%)
    uint256 public depositFeeBps;

    /// @notice Comisión al retirar, en bps
    uint256 public withdrawFeeBps;

    /// @notice Comisión al reclamar recompensas, en bps
    uint256 public claimFeeBps;

    uint256 public constant YEAR = 365 days;

    uint256 public totalStaked;

    /// @notice Comisiones acumuladas disponibles para retirar por el owner
    uint256 public feeBalance;

    struct UserInfo {
        uint256 staked;
        uint256 lastUpdate;
        uint256 pendingReward;
    }

    mapping(address => UserInfo) private _users;

    // ── Events ────────────────────────────────────────────────────────────────

    event Staked   (address indexed user, uint256 netAmount, uint256 fee);
    event Unstaked (address indexed user, uint256 netAmount, uint256 fee);
    event Claimed  (address indexed user, uint256 netReward, uint256 fee);
    event AprSet   (uint256 newAprBps);
    event FeesSet  (uint256 deposit, uint256 withdraw, uint256 claim);
    event Funded   (address indexed from, uint256 amount);
    event FeeWithdrawn(address indexed to, uint256 amount);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    // ── Modifiers ─────────────────────────────────────────────────────────────

    modifier onlyOwner() {
        require(msg.sender == owner, "FIRE: not owner");
        _;
    }

    // ── Constructor ───────────────────────────────────────────────────────────

    /// @param _token    Dirección del token FIRE
    /// @param _aprBps   APR inicial en bps (ej. 1500 = 15%)
    constructor(address _token, uint256 _aprBps) {
        require(_token != address(0), "FIRE: zero token");
        owner        = msg.sender;
        stakingToken = IERC20(_token);
        aprBps       = _aprBps;
    }

    // ── Internal ──────────────────────────────────────────────────────────────

    function _accrueRewards(address user) internal {
        UserInfo storage u = _users[user];
        if (u.staked > 0 && u.lastUpdate > 0) {
            uint256 elapsed = block.timestamp - u.lastUpdate;
            uint256 reward  = (u.staked * aprBps * elapsed) / (YEAR * 10_000);
            u.pendingReward += reward;
        }
        u.lastUpdate = block.timestamp;
    }

    // ── User functions ────────────────────────────────────────────────────────

    /// @notice Depositar (stake) tokens FIRE
    function stake(uint256 amount) external {
        require(amount > 0, "FIRE: zero amount");
        _accrueRewards(msg.sender);

        uint256 fee       = (amount * depositFeeBps) / 10_000;
        uint256 netAmount = amount - fee;

        require(stakingToken.transferFrom(msg.sender, address(this), amount), "FIRE: transferFrom failed");

        if (fee > 0) feeBalance += fee;

        _users[msg.sender].staked += netAmount;
        totalStaked += netAmount;

        emit Staked(msg.sender, netAmount, fee);
    }

    /// @notice Retirar (unstake) tokens FIRE
    function unstake(uint256 amount) external {
        UserInfo storage u = _users[msg.sender];
        require(amount > 0,           "FIRE: zero amount");
        require(u.staked >= amount,   "FIRE: insufficient stake");

        _accrueRewards(msg.sender);

        u.staked    -= amount;
        totalStaked -= amount;

        uint256 fee       = (amount * withdrawFeeBps) / 10_000;
        uint256 netAmount = amount - fee;

        if (fee > 0) feeBalance += fee;

        require(stakingToken.transfer(msg.sender, netAmount), "FIRE: transfer failed");

        emit Unstaked(msg.sender, netAmount, fee);
    }

    /// @notice Reclamar recompensas acumuladas
    function claim() external {
        _accrueRewards(msg.sender);

        UserInfo storage u = _users[msg.sender];
        uint256 reward = u.pendingReward;
        require(reward > 0, "FIRE: nothing to claim");

        uint256 fee       = (reward * claimFeeBps) / 10_000;
        uint256 netReward = reward - fee;

        require(
            stakingToken.balanceOf(address(this)) >= totalStaked + feeBalance + netReward,
            "FIRE: insufficient reward balance - owner must fund the contract"
        );

        if (fee > 0) feeBalance += fee;
        u.pendingReward = 0;

        require(stakingToken.transfer(msg.sender, netReward), "FIRE: transfer failed");

        emit Claimed(msg.sender, netReward, fee);
    }

    // ── Views ─────────────────────────────────────────────────────────────────

    /// @notice Recompensas pendientes de un usuario (incluyendo las no liquidadas)
    function pendingRewards(address user) external view returns (uint256) {
        UserInfo storage u = _users[user];
        if (u.staked == 0) return u.pendingReward;

        uint256 elapsed   = block.timestamp - (u.lastUpdate == 0 ? block.timestamp : u.lastUpdate);
        uint256 newReward = (u.staked * aprBps * elapsed) / (YEAR * 10_000);
        return u.pendingReward + newReward;
    }

    /// @notice Balance stakeado de un usuario
    function stakedBalance(address user) external view returns (uint256) {
        return _users[user].staked;
    }

    /// @notice APR actual (alias de aprBps, para compatibilidad con el frontend)
    function apr() external view returns (uint256) {
        return aprBps;
    }

    /// @notice Balance de tokens de reward disponible en el contrato (excl. feeBalance)
    function rewardPool() external view returns (uint256) {
        uint256 bal    = stakingToken.balanceOf(address(this));
        uint256 locked = totalStaked + feeBalance;
        return bal > locked ? bal - locked : 0;
    }

    // ── Owner functions ───────────────────────────────────────────────────────

    /// @notice Cambiar el APR (en bps). 100 = 1%, 1500 = 15%.
    function setApr(uint256 _aprBps) external onlyOwner {
        require(_aprBps <= 100_000, "FIRE: APR demasiado alto");
        aprBps = _aprBps;
        emit AprSet(_aprBps);
    }

    /// @notice Cambiar comisiones de depósito, retiro y claim (en bps). Max 20% cada una.
    function setFees(uint256 _deposit, uint256 _withdraw, uint256 _claim) external onlyOwner {
        require(_deposit  <= 2_000, "FIRE: deposit fee max 20%");
        require(_withdraw <= 2_000, "FIRE: withdraw fee max 20%");
        require(_claim    <= 2_000, "FIRE: claim fee max 20%");
        depositFeeBps  = _deposit;
        withdrawFeeBps = _withdraw;
        claimFeeBps    = _claim;
        emit FeesSet(_deposit, _withdraw, _claim);
    }

    /// @notice Fondear el contrato con tokens de reward (el owner aprueba y llama esta función)
    function fundRewards(uint256 amount) external {
        require(amount > 0, "FIRE: zero amount");
        require(stakingToken.transferFrom(msg.sender, address(this), amount), "FIRE: transferFrom failed");
        emit Funded(msg.sender, amount);
    }

    /// @notice Retirar las comisiones acumuladas al owner
    function withdrawFees() external onlyOwner {
        uint256 amount = feeBalance;
        require(amount > 0, "FIRE: no fees to withdraw");
        feeBalance = 0;
        require(stakingToken.transfer(owner, amount), "FIRE: transfer failed");
        emit FeeWithdrawn(owner, amount);
    }

    /// @notice Transferir la propiedad del contrato
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "FIRE: zero address");
        emit OwnershipTransferred(owner, _newOwner);
        owner = _newOwner;
    }

    /// @notice Recuperar tokens atascados (emergencia, no aplica al token de staking si hay usuarios)
    function rescueToken(address token, uint256 amount) external onlyOwner {
        require(
            token != address(stakingToken) || totalStaked == 0,
            "FIRE: cannot rescue staking token while users are staked"
        );
        IERC20(token).transfer(owner, amount);
    }
}
