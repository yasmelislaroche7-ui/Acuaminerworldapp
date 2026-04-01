// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

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

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
    function symbol() external view returns (string memory);
}

contract SwapProxy {
    address public constant SWAP_ROUTER = 0x091AD9e2e6e5eD44c1c66dB50e49A601F9f36cF6;

    address public owner;
    uint256 public feeBps = 10;

    event Swapped(
        address indexed user,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 feeAmount
    );
    event FeeUpdated(uint256 newFeeBps);
    event OwnerUpdated(address newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor(address _owner) {
        require(_owner != address(0), "Zero owner");
        owner = _owner;
    }

    function setFeeBps(uint256 _feeBps) external onlyOwner {
        require(_feeBps <= 500, "Max 5%");
        feeBps = _feeBps;
        emit FeeUpdated(_feeBps);
    }

    function setOwner(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Zero address");
        owner = _newOwner;
        emit OwnerUpdated(_newOwner);
    }

    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOutMin,
        uint24  poolFee,
        uint256 deadline
    ) external returns (uint256 amountOut) {
        require(amountIn > 0, "Zero amount");
        require(deadline >= block.timestamp, "Expired");
        require(tokenIn != address(0) && tokenOut != address(0), "Zero token");

        uint256 feeAmount  = (amountIn * feeBps) / 10000;
        uint256 swapAmount = amountIn - feeAmount;

        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);

        if (feeAmount > 0) {
            IERC20(tokenIn).transfer(owner, feeAmount);
        }

        IERC20(tokenIn).approve(SWAP_ROUTER, swapAmount);

        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
            tokenIn:           tokenIn,
            tokenOut:          tokenOut,
            fee:               poolFee,
            recipient:         msg.sender,
            deadline:          deadline,
            amountIn:          swapAmount,
            amountOutMinimum:  amountOutMin,
            sqrtPriceLimitX96: 0
        });

        amountOut = ISwapRouter(SWAP_ROUTER).exactInputSingle(params);
        emit Swapped(msg.sender, tokenIn, tokenOut, amountIn, amountOut, feeAmount);
    }

    function getFeeBps() external view returns (uint256) {
        return feeBps;
    }

    function rescueToken(address token) external onlyOwner {
        uint256 bal = IERC20(token).balanceOf(address(this));
        require(bal > 0, "Nothing to rescue");
        IERC20(token).transfer(owner, bal);
    }
}
