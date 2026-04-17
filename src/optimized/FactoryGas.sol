// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {TokenGas} from "./TokenGas.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {SafeERC20, IERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
// ============================================================
//  FactoryGas — Gas-Optimized PumpFun-style Launchpad
// ============================================================
//
//  Regular Factory-dan GAS TEJALISHI:
//  ┌─────────────────────────────────────────────────────┐
//  │  1. Struct packing: 7+ slot → 3 slot                │
//  │     slot 0: token   (address, 20 bytes)              │
//  │     slot 1: creator (20) + isOpen (1) + deposited(1)│
//  │     slot 2: sold (uint128, 16) + raised (uint128,16)│
//  │     ⇒ buy() da bitta SSTORE (slot2) ~5k gas tejaydi │
//  │                                                      │
//  │  2. calldata string → memory string  ~3k gas/create │
//  │  3. unchecked arifmetika (xavfsiz joylarda) ~200/op │
//  │  4. Assembly ETH transfer             ~100 gas/call │
//  │  5. Storage cache → memory            ~200 gas/read │
//  │  6. name/imageURI storage yo'q        ~40k gas/create│
//  └─────────────────────────────────────────────────────┘
//
//  TUZATILGAN KAMCHILIKLAR (portfolio versiyasida):
//   [FIX-1]  deposit() ikki marta          — deposited flag (packed)
//   [FIX-2]  deposit() har kim chaqira oladi — creator/owner tekshiruvi
//   [FIX-3]  buy() refund yo'q             — assembly refund
//   [FIX-4]  slippage yo'q                 — maxCost parametri
//   [FIX-5]  zero address                  — validatsiya
//   [FIX-6]  transferOwnership yo'q        — qo'shildi
//
//  REAL WORLD PRODUCTION kodi (kommentda):
//   [PROD-1]  Uniswap V3 likvidlik pool
//   [PROD-2]  sqrtPriceX96 hisoblash
//   [PROD-3]  EIP-1167 Minimal Proxy (clone)
//   [PROD-4]  Creator royalty fee
//
// ============================================================

// ── [PROD-1] Uniswap V3 interfeyslari ─────────────────────
// interface IUniswapV3Factory {
//     function createPool(address tokenA, address tokenB, uint24 fee)
//         external returns (address pool);
// }
// interface IUniswapV3Pool {
//     function initialize(uint160 sqrtPriceX96) external;
// }
// interface INonfungiblePositionManager {
//     struct MintParams {
//         address token0; address token1; uint24 fee;
//         int24 tickLower; int24 tickUpper;
//         uint256 amount0Desired; uint256 amount1Desired;
//         uint256 amount0Min;     uint256 amount1Min;
//         address recipient; uint256 deadline;
//     }
//     function mint(MintParams calldata params)
//         external payable
//         returns (uint256 tokenId, uint128 liquidity,
//                  uint256 amount0, uint256 amount1);
//     function createAndInitializePoolIfNecessary(
//         address token0, address token1,
//         uint24 fee, uint160 sqrtPriceX96
//     ) external payable returns (address pool);
// }
// interface IWETH {
//     function deposit() external payable;
//     function approve(address spender, uint256 amount) external returns (bool);
// }
// ──────────────────────────────────────────────────────────

contract FactoryGas is ReentrancyGuard {
    using SafeERC20 for IERC20;
    // ══════════════════════════════════════════════════════════
    //  CONSTANTS
    // ══════════════════════════════════════════════════════════

    uint256 public constant TARGET       = 3 ether;
    uint256 public constant TOKEN_LIMIT  = 500_000 ether;
    uint256 public constant MAX_BUY      = 10_000 ether;
    uint256 public constant MIN_BUY      = 1 ether;
    uint256 public constant TOTAL_SUPPLY = 1_000_000 ether;
    uint256 public constant FLOOR        = 0.0001 ether;
    uint256 public constant STEP         = 0.0001 ether;
    uint256 public constant INCREMENT    = 10_000 ether;

    // ── [PROD-1] Uniswap V3 (Sepolia manzillari) ──────────────
    // address public constant UNISWAP_V3_FACTORY =
    //     0x0227628f3F023bb0B980b67D528571c95c6DaC1;
    // address public constant POSITION_MANAGER =
    //     0x1238536071E1c677A632429e3655c799b22cDA52;
    // address public constant WETH =
    //     0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14;
    // uint24  public constant POOL_FEE = 3000;
    // int24   internal constant MIN_TICK = -887272;
    // int24   internal constant MAX_TICK =  887272;
    // ─────────────────────────────────────────────────────────

    // ══════════════════════════════════════════════════════════
    //  STATE
    // ══════════════════════════════════════════════════════════

    uint256 public immutable fee;
    address public owner;
    uint256 public totalTokens;
    address[] public tokens;
    mapping(address => TokenSale) public tokenToSale;

    // ── GAS OPTIMIZATION: Packed struct ───────────────────────
    //
    //  Regular versiyada TokenSale = 7+ storage slot:
    //    address token     → 1 slot
    //    string name       → 2+ slot (dynamic)
    //    string imageURI   → 2+ slot (dynamic)
    //    address creator   → 1 slot
    //    uint256 sold      → 1 slot
    //    uint256 raised    → 1 slot
    //    bool isOpen       → 1 slot (bool yolg'iz 1 slot egallaydi!)
    //
    //  Gas versiyasida = 3 storage slot:
    //    slot 0: token    (address 20 bytes)
    //    slot 1: creator  (address 20 bytes) +
    //            isOpen   (bool    1 byte  ) +
    //            deposited(bool    1 byte  ) → bitta slotda!
    //    slot 2: sold     (uint128 16 bytes) +
    //            raised   (uint128 16 bytes) → bitta slotda!
    //
    //  buy() da: sold va raised birgalikda yangilanadi
    //  → 1 ta SSTORE (slot2) = 5,000 gas
    //  vs regular: 2 ta SSTORE = 10,000+ gas
    //
    struct TokenSale {
        address token;      // slot 0 (20 bytes)
        address creator;    // slot 1 start (20 bytes)
        bool    isOpen;     // slot 1 +20 bytes (1 byte) ─┐ packed
        bool    deposited;  // slot 1 +21 bytes (1 byte) ─┘
        uint128 sold;       // slot 2 start (16 bytes)   ─┐ packed
        uint128 raised;     // slot 2 +16 bytes (16 bytes)─┘
    }
    // name va imageURI yo'q — TokenCreated event-dan o'qiladi

    // ══════════════════════════════════════════════════════════
    //  CUSTOM ERRORS
    // ══════════════════════════════════════════════════════════

    error Factory__InsufficientFee();
    error Factory__SaleClosed();
    error Factory__AmountTooLow();
    error Factory__AmountExceeded();
    error Factory__InsufficientETH();
    error Factory__SlippageExceeded(uint256 required, uint256 maxAllowed);
    error Factory__TargetNotReached();
    error Factory__AlreadyDeposited();
    error Factory__NotAuthorized();
    error Factory__NotOwner();
    error Factory__ETHTransferFailed();
    error Factory__ZeroAddress();
    error Factory__InvalidToken();

    // ══════════════════════════════════════════════════════════
    //  EVENTS
    // ══════════════════════════════════════════════════════════

    /// @dev name, symbol, imageURI — storage yo'q, event-da indekslanadi
    event TokenCreated(
        address indexed token,
        address indexed creator,
        string  name,
        string  symbol,
        string  imageURI
    );

    /// @dev totalSold va totalRaised olib tashlandi — gas tejash uchun
    ///      sale.sold va sale.raised-dan o'qish mumkin
    event TokenPurchased(
        address indexed token,
        address indexed buyer,
        uint256 amount,
        uint256 price
    );

    event SaleClosed(address indexed token);

    event TokenGraduated(
        address indexed token,
        address indexed creator
        // [PROD-1] pool manzili qo'shiladi: address indexed pool
    );

    event Withdrawn(address indexed owner, uint256 amount);

    // ══════════════════════════════════════════════════════════
    //  MODIFIERS
    // ══════════════════════════════════════════════════════════

    modifier onlyOwner() {
        _onlyOwner();
        _;
    }
  
    function _onlyOwner() internal view {
        if (msg.sender != owner) revert Factory__NotOwner();
    }

    // ══════════════════════════════════════════════════════════
    //  CONSTRUCTOR
    // ══════════════════════════════════════════════════════════

    constructor(uint256 _fee) {
        fee   = _fee;
        owner = msg.sender;
    }

    // ══════════════════════════════════════════════════════════
    //  VIEW FUNCTIONS
    // ══════════════════════════════════════════════════════════

    function getTokenSale(uint256 _index)
        external view returns (TokenSale memory)
    {
        return tokenToSale[tokens[_index]];
    }

    /// @notice Token manzili bo'yicha TokenSale struct qaytaradi
    /// @dev    public mapping tuple qaytaradi — named field access uchun bu kerak
    function getSale(address _token)
        external view returns (TokenSale memory)
    {
        return tokenToSale[_token];
    }

    function getAllTokens() external view returns (address[] memory) {
        return tokens;
    }

    function getTokensPaginated(uint256 _offset, uint256 _limit)
        external view returns (TokenSale[] memory result)
    {
        uint256 end = _offset + _limit;
        if (end > totalTokens) end = totalTokens;
        result = new TokenSale[](end - _offset);
        for (uint256 i = _offset; i < end; ) {
            result[i - _offset] = tokenToSale[tokens[i]];
            unchecked { i++; }
        }
    }

    /// @notice Bonding curve narxi
    /// @dev unchecked: _sold / INCREMENT hech qachon overflow bo'lmaydi
    ///      (TOKEN_LIMIT = 500k ether << uint256 max)
    function getCost(uint256 _sold) public pure returns (uint256) {
        unchecked {
            return FLOOR + STEP * (_sold / INCREMENT);
        }
    }

    function estimateCost(uint256 _sold, uint256 _amount)
        external pure returns (uint256)
    {
        unchecked {
            return getCost(_sold) * (_amount / 1 ether);
        }
    }

    // ══════════════════════════════════════════════════════════
    //  CORE: CREATE
    // ══════════════════════════════════════════════════════════

    /// @notice Yangi token va bonding curve yaratadi
    /// @dev calldata string → memory string-dan ~3k gas arzon
    ///      (calldata nusxa ko'chirmasdan to'g'ridan o'tiladi)
    function create(
        string calldata _name,       // calldata — gas optim.
        string calldata _symbol,
        string calldata _imageURI,
        string calldata _description
    ) external payable returns (address tokenAddr) {
        if (msg.value < fee) revert Factory__InsufficientFee();

        // ── [PROD-3] Clone pattern (hozir to'liq deploy) ──────
        // address tokenAddr = Clones.clone(tokenImplementation);
        // ITokenGas(tokenAddr).initialize(
        //     msg.sender, _name, _symbol,
        //     _imageURI, _description, TOTAL_SUPPLY
        // );
        // ─────────────────────────────────────────────────────

        TokenGas token = new TokenGas(
            msg.sender,
            _name,
            _symbol,
            _imageURI,
            _description,
            TOTAL_SUPPLY
        );

        tokenAddr = address(token);
        tokens.push(tokenAddr);
        unchecked { totalTokens++; }

        // Struct 3 slot — bitta SSTORE cluster
        tokenToSale[tokenAddr] = TokenSale({
            token    : tokenAddr,
            creator  : msg.sender,
            isOpen   : true,
            deposited: false,
            sold     : 0,
            raised   : 0
        });

        emit TokenCreated(tokenAddr, msg.sender, _name, _symbol, _imageURI);
    }

    // ══════════════════════════════════════════════════════════
    //  CORE: BUY
    // ══════════════════════════════════════════════════════════

    /// @notice Bonding curve orqali token sotib oladi
    /// @param _token   Token manzili
    /// @param _amount  Miqdor (wei)
    /// @param _maxCost [FIX-4] Maksimal ETH (slippage himoyasi), 0 = o'tkazib yubor
    function buy(
        address _token,
        uint256 _amount,
        uint256 _maxCost
    ) external payable nonReentrant {

        if (_token == address(0)) revert Factory__InvalidToken();

        TokenSale storage sale = tokenToSale[_token];

        // ── Storage hot-path cache → memory ───────────────────
        // Struct packed bo'lgani uchun slot1 va slot2 bittadan o'qiladi.
        // Lekin local cache qo'shimcha MLOAD tejaydi (~3 gas har biri).
        bool    isOpen = sale.isOpen;
        uint128 sold   = sale.sold;
        uint128 raised = sale.raised;

        if (!isOpen)           revert Factory__SaleClosed();
        if (_amount < MIN_BUY) revert Factory__AmountTooLow();
        if (_amount > MAX_BUY) revert Factory__AmountExceeded();

        uint256 cost;
        uint256 price;
        unchecked {
            cost  = getCost(sold);
            price = cost * (_amount / 1 ether);
        }

        // [FIX-4] Slippage tekshiruvi
        if (_maxCost > 0 && price > _maxCost) {
            revert Factory__SlippageExceeded(price, _maxCost);
        }

        if (msg.value < price) revert Factory__InsufficientETH();

        // ── State yangilash ────────────────────────────────────
        unchecked {
            // uint128 overflow imkonsiz:
            // sold max = 500_000 ether (~5e23) << uint128 max (~3.4e38)
            // raised max = 3 ether << uint128 max
            // forge-lint: disable-next-line(unsafe-typecast)
            sold   = uint128(sold   + _amount);
            // forge-lint: disable-next-line(unsafe-typecast)
            raised = uint128(raised + price);
        }

        // Bitta SSTORE: sold + raised → slot2 (packed uint128+uint128)
        sale.sold   = sold;
        sale.raised = raised;

        if (sold >= TOKEN_LIMIT || raised >= TARGET) {
            sale.isOpen = false;  // slot1 SSTORE
            emit SaleClosed(_token);
        }

        IERC20(_token).safeTransfer(msg.sender, _amount);

        // [FIX-3] Ortiqcha ETH qaytarish — assembly versiyasi
        // Assembly call() high-level .call{value}() dan ~100 gas arzon:
        // sabab: ABI encoding overhead yo'q, returndata copy yo'q
        unchecked {
            uint256 refund = msg.value - price;
            if (refund > 0) {
                bool ok;
                assembly {
                    // call(gas, to, value, argsOffset, argsLen, retOffset, retLen)
                    ok := call(gas(), caller(), refund, 0, 0, 0, 0)
                }
                if (!ok) revert Factory__ETHTransferFailed();
            }
        }

        emit TokenPurchased(_token, msg.sender, _amount, price);
    }

    // ══════════════════════════════════════════════════════════
    //  CORE: DEPOSIT (GRADUATION)
    // ══════════════════════════════════════════════════════════

    /// @notice Token graduation: bonding curve → likvidlik
    ///
    /// [FIX-1] deposited flag → ikki marta chaqirishdan himoya
    /// [FIX-2] creator yoki owner tekshiruvi
    ///
    /// PORTFOLIO: ETH + tokenlar creator-ga
    /// PRODUCTION: Uniswap V3 pool (kommentda)
    function deposit(address _token) external nonReentrant {
        TokenSale storage sale = tokenToSale[_token];

        // slot1 dan o'qish: isOpen, deposited, creator bitta SLOAD
        if (sale.deposited)  revert Factory__AlreadyDeposited();
        if (sale.isOpen)     revert Factory__TargetNotReached();

        if (msg.sender != sale.creator && msg.sender != owner) {
            revert Factory__NotAuthorized();
        }

        // [FIX-1] Lock — slot1 SSTORE
        sale.deposited = true;

        // ── Local cache ────────────────────────────────────────
        address creator      = sale.creator;
        uint256 ethRaised    = sale.raised;     // uint128 → uint256 auto-cast
        TokenGas token       = TokenGas(_token);
        uint256 tokenBalance = token.balanceOf(address(this));

        // ══════════════════════════════════════════════════════
        //  PORTFOLIO VERSIYASI
        // ══════════════════════════════════════════════════════

        IERC20(_token).safeTransfer(creator, tokenBalance);

        // Assembly ETH transfer — high-level .call-dan ~100 gas arzon
        bool ok;
        assembly {
            ok := call(gas(), creator, ethRaised, 0, 0, 0, 0)
        }
        if (!ok) revert Factory__ETHTransferFailed();

        emit TokenGraduated(_token, creator);

        // ══════════════════════════════════════════════════════
        //  [PROD-1] PRODUCTION: Uniswap V3 Likvidlik Pool
        // ══════════════════════════════════════════════════════
        // Yuqoridagi portfolio kodini o'chirib, quyidagini yoqing.
        //
        // ── 1. Approve ────────────────────────────────────────
        // token.approve(POSITION_MANAGER, tokenBalance);
        //
        // ── 2. WETH ───────────────────────────────────────────
        // IWETH(WETH).deposit{value: ethRaised}();
        // IWETH(WETH).approve(POSITION_MANAGER, ethRaised);
        //
        // ── 3. Token tartibi ──────────────────────────────────
        // (address token0, address token1) = _token < WETH
        //     ? (_token, WETH) : (WETH, _token);
        // uint256 amount0 = token0 == _token ? tokenBalance : ethRaised;
        // uint256 amount1 = token1 == _token ? tokenBalance : ethRaised;
        //
        // ── 4. sqrtPriceX96 hisoblash ─────────────────────────
        // uint256 lastCost = getCost(sale.sold);
        // uint160 sqrtPriceX96 = _computeSqrtPriceX96(
        //     lastCost, token0 == _token
        // );
        //
        // ── 5. Pool yaratish + narxni set ─────────────────────
        // INonfungiblePositionManager(POSITION_MANAGER)
        //     .createAndInitializePoolIfNecessary(
        //         token0, token1, POOL_FEE, sqrtPriceX96
        //     );
        //
        // ── 6. Likvidlik qo'shish ─────────────────────────────
        // (uint256 tokenId,,,) = INonfungiblePositionManager(POSITION_MANAGER)
        //     .mint(INonfungiblePositionManager.MintParams({
        //         token0:         token0,
        //         token1:         token1,
        //         fee:            POOL_FEE,
        //         tickLower:      MIN_TICK,
        //         tickUpper:      MAX_TICK,
        //         amount0Desired: amount0,
        //         amount1Desired: amount1,
        //         amount0Min:     0,
        //         amount1Min:     0,
        //         recipient:      creator,
        //         deadline:       block.timestamp + 300
        //     }));
        //
        // ── [PROD-4] Creator royalty (masalan 5%) ─────────────
        // uint256 creatorFee = (ethRaised * 500) / 10_000;
        // uint256 poolEth    = ethRaised - creatorFee;
        // assembly { ok := call(gas(), creator, creatorFee, 0, 0, 0, 0) }
        // require(ok, "creator fee failed");
        // // poolEth → Uniswap pool-ga ketadi
        //
        // emit TokenGraduated(_token, creator);
        // ─────────────────────────────────────────────────────
    }

    // ── [PROD-2] sqrtPriceX96 yordamchi ───────────────────────
    // Uniswap V3 narxni Q64.96 fixed-point formatida talab qiladi.
    // Bonding curve oxirgi narxi (ETH per token) dan hisoblanadi:
    //
    // function _computeSqrtPriceX96(
    //     uint256 lastCostInWei,  // getCost(sale.sold)
    //     bool    tokenIsToken0   // _token < WETH
    // ) internal pure returns (uint160) {
    //     // price = token1/token0 nisbati
    //     // Agar token0 = TOKEN, token1 = WETH:
    //     //   price = lastCost (WETH per TOKEN)
    //     // Agar token0 = WETH, token1 = TOKEN:
    //     //   price = 1/lastCost
    //     uint256 priceX192 = tokenIsToken0
    //         ? (lastCostInWei << 192) / 1 ether
    //         : (1 ether        << 192) / lastCostInWei;
    //
    //     return uint160(_sqrtUint(priceX192));
    // }
    //
    // function _sqrtUint(uint256 x) internal pure returns (uint256 y) {
    //     if (x == 0) return 0;
    //     uint256 z = (x + 1) / 2;
    //     y = x;
    //     while (z < y) { y = z; z = (x / z + z) / 2; }
    // }
    // ─────────────────────────────────────────────────────────

    // ══════════════════════════════════════════════════════════
    //  ADMIN
    // ══════════════════════════════════════════════════════════

    function withdraw(uint256 _amount) external onlyOwner {
        bool ok;
        address _owner = owner;
        // Assembly — regular .call-dan ~100 gas arzon
        assembly {
            ok := call(gas(), _owner, _amount, 0, 0, 0, 0)
        }
        if (!ok) revert Factory__ETHTransferFailed();
        emit Withdrawn(_owner, _amount);
    }

    function transferOwnership(address _newOwner) external onlyOwner {
        if (_newOwner == address(0)) revert Factory__ZeroAddress();
        owner = _newOwner;
    }

    receive() external payable {}
}
