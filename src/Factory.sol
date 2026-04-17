// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Token} from "./Token.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {SafeERC20, IERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
// ============================================================
//  Factory — PumpFun-style bonding curve launchpad
//  Regular (o'qish oson, audit-friendly) versiya
// ============================================================
//
//  TUZATILGAN KAMCHILIKLAR (portfolio versiyasida):
//   [FIX-1]  deposit() ikki marta chaqirilishi — deposited flag
//   [FIX-2]  deposit() har kim chaqira olishi  — creator/owner tekshiruvi
//   [FIX-3]  buy() ortiqcha ETH qaytarilmaydi  — refund mexanizmi
//   [FIX-4]  slippage himoyasi yo'q            — maxCost parametri
//   [FIX-5]  Zero address token buy            — validatsiya
//   [FIX-6]  transferOwnership yo'q            — qo'shildi
//
//  REAL WORLD PRODUCTION kodi (kommentda):
//   [PROD-1]  Uniswap V3 likvidlik pool yaratish
//   [PROD-2]  sqrtPriceX96 hisoblash
//   [PROD-3]  EIP-1167 Minimal Proxy (clone) pattern
//   [PROD-4]  Creator royalty fee
//   [PROD-5]  Whitelist / launch delay
//
// ============================================================

// ── [PROD-1] Uniswap V3 interfeyslari ──────────────────────
// Production-da shu interfeyslarga ehtiyoj bo'ladi.
// Yoqish uchun: quyidagi kommentlarni oching va
// foundry.toml-ga uniswap v3 lib qo'shing.
//
// interface IUniswapV3Factory {
//     function createPool(address tokenA, address tokenB, uint24 fee)
//         external returns (address pool);
// }
//
// interface IUniswapV3Pool {
//     function initialize(uint160 sqrtPriceX96) external;
// }
//
// interface INonfungiblePositionManager {
//     struct MintParams {
//         address token0; address token1; uint24 fee;
//         int24 tickLower; int24 tickUpper;
//         uint256 amount0Desired; uint256 amount1Desired;
//         uint256 amount0Min; uint256 amount1Min;
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
//
// interface IWETH {
//     function deposit() external payable;
//     function approve(address spender, uint256 amount) external returns (bool);
// }
// ───────────────────────────────────────────────────────────

contract Factory is ReentrancyGuard {
    using SafeERC20 for IERC20;
    // ══════════════════════════════════════════════════════════
    //  CONSTANTS
    // ══════════════════════════════════════════════════════════

    /// @notice Bonding curve to'yinish maqsadi (ETH)
    uint256 public constant TARGET       = 3 ether;

    /// @notice Bonding curve orqali sotiladigan maksimal token miqdori
    uint256 public constant TOKEN_LIMIT  = 500_000 ether;

    /// @notice Bir tranzaksiyada maksimal xarid miqdori
    uint256 public constant MAX_BUY      = 10_000 ether;

    /// @notice Bir tranzaksiyada minimal xarid miqdori
    uint256 public constant MIN_BUY      = 1 ether;

    /// @notice Har bir token uchun umumiy supply
    uint256 public constant TOTAL_SUPPLY = 1_000_000 ether;

    // ── Bonding curve parametrlari ────────────────────────────
    /// @dev Eng past narx (0 token sotilganda)
    uint256 public constant FLOOR     = 0.0001 ether;

    /// @dev Har INCREMENT token sotilganda narx shu miqdorga oshadi
    uint256 public constant STEP      = 0.0001 ether;

    /// @dev Narx qadami uchun bosqich (10k token)
    uint256 public constant INCREMENT = 10_000 ether;

    // ── [PROD-1] Uniswap V3 manzillari (Sepolia) ─────────────
    // Yoqish uchun quyidagi kommentlarni oching:
    //
    // address public constant UNISWAP_V3_FACTORY =
    //     0x0227628f3F023bb0B980b67D528571c95c6DaC1;  // Sepolia
    // address public constant POSITION_MANAGER =
    //     0x1238536071E1c677A632429e3655c799b22cDA52;  // Sepolia
    // address public constant WETH =
    //     0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14; // Sepolia WETH
    // uint24  public constant POOL_FEE = 3000;  // 0.3%
    //
    // int24 internal constant MIN_TICK = -887272;
    // int24 internal constant MAX_TICK =  887272;
    // ─────────────────────────────────────────────────────────

    // ══════════════════════════════════════════════════════════
    //  STATE
    // ══════════════════════════════════════════════════════════

    /// @notice Token yaratish to'lovi (owner tomonidan olinadi)
    uint256 public immutable fee;

    /// @notice Kontrakt egasi
    address public owner;

    /// @notice Jami yaratilgan tokenlar soni
    uint256 public totalTokens;

    /// @notice Barcha token manzillari (indeks bo'yicha)
    address[] public tokens;

    /// @notice Token manzilidan sotuv ma'lumotiga mapping
    mapping(address => TokenSale) public tokenToSale;

    // ── TokenSale struct ──────────────────────────────────────
    struct TokenSale {
        address token;      // Token kontrakt manzili
        string  name;       // Token nomi (frontend uchun)
        string  imageURI;   // IPFS URI (frontend uchun)
        address creator;    // Yaratuvchi manzili
        uint256 sold;       // Jami sotilgan miqdor (wei)
        uint256 raised;     // Yig'ilgan ETH (wei)
        bool    isOpen;     // Sotuv ochiqmi?
        // [FIX-1] Ikki marta deposit qilishdan himoya
        bool    deposited;  // Graduation amalga oshirilganmi?
    }

    // ══════════════════════════════════════════════════════════
    //  CUSTOM ERRORS — revert string-dan arzonroq (~50 gas)
    // ══════════════════════════════════════════════════════════

    error Factory__InsufficientFee();
    error Factory__SaleClosed();
    error Factory__AmountTooLow();
    error Factory__AmountExceeded();
    error Factory__InsufficientETH();
    // [FIX-4] Slippage: foydalanuvchi kutgan narxdan oshib ketdi
    error Factory__SlippageExceeded(uint256 required, uint256 maxAllowed);
    error Factory__TargetNotReached();
    // [FIX-1] Ikki marta deposit
    error Factory__AlreadyDeposited();
    // [FIX-2] Faqat creator yoki owner
    error Factory__NotAuthorized();
    error Factory__NotOwner();
    error Factory__ETHTransferFailed();
    error Factory__ZeroAddress();
    error Factory__InvalidToken();

    // ══════════════════════════════════════════════════════════
    //  EVENTS
    // ══════════════════════════════════════════════════════════

    event TokenCreated(
        address indexed token,
        address indexed creator,
        string  name,
        string  symbol,
        string  imageURI,
        uint256 timestamp
    );

    event TokenPurchased(
        address indexed token,
        address indexed buyer,
        uint256 amount,
        uint256 price,
        uint256 totalSold,
        uint256 totalRaised
    );

    event SaleClosed(
        address indexed token,
        uint256 totalRaised,
        uint256 totalSold
    );

    event TokenGraduated(
        address indexed token,
        address indexed creator,
        uint256 ethAmount,
        uint256 tokenAmount
        // [PROD-1] pool manzili qo'shiladi:
        // address indexed pool
    );

    event Withdrawn(address indexed owner, uint256 amount);

    event OwnershipTransferred(
        address indexed previousOwner,
        address indexed newOwner
    );

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

    /// @notice Indeks bo'yicha TokenSale qaytaradi
    function getTokenSale(uint256 _index)
        external view returns (TokenSale memory)
    {
        return tokenToSale[tokens[_index]];
    }

    /// @notice Token manzili bo'yicha TokenSale qaytaradi (struct sifatida)
    /// @dev    `tokenToSale` public mapping external chaqiruvlarda
    ///         tuple qaytaradi — named field access ishlamaydi.
    ///         Bu getter testlar va frontend uchun to'liq struct qaytaradi.
    function getSale(address _token)
        external view returns (TokenSale memory)
    {
        return tokenToSale[_token];
    }

    /// @notice Barcha token manzillarini qaytaradi
    function getAllTokens() external view returns (address[] memory) {
        return tokens;
    }

    /// @notice Sahifalangan token ro'yxati (katta to'plam uchun)
    /// @param _offset  Boshlash indeksi
    /// @param _limit   Maksimal element soni
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

    /// @notice Bonding curve narxi: berilgan sold miqdorda 1 token narxi
    /// @dev    Chiziqli bosqich: floor + step * floor(sold / increment)
    ///         sold=0      → 0.0001 ETH/token
    ///         sold=10_000 → 0.0002 ETH/token
    ///         sold=50_000 → 0.0006 ETH/token
    function getCost(uint256 _sold) public pure returns (uint256) {
        return FLOOR + STEP * (_sold / INCREMENT);
    }

    /// @notice _amount token sotib olish uchun taxminiy ETH narxi
    function estimateCost(uint256 _sold, uint256 _amount)
        external pure returns (uint256)
    {
        return getCost(_sold) * (_amount / 1 ether);
    }

    /// @notice Sotuv progressi [0, 1e18 scale]
    function getSaleProgress(address _token)
        external view
        returns (uint256 byRaised, uint256 bySold)
    {
        TokenSale memory sale = tokenToSale[_token];
        byRaised = (sale.raised * 1e18) / TARGET;
        bySold   = (sale.sold   * 1e18) / TOKEN_LIMIT;
    }

    // ══════════════════════════════════════════════════════════
    //  CORE: CREATE
    // ══════════════════════════════════════════════════════════

    /// @notice Yangi ERC20 token va bonding curve sotuv yaratadi
    /// @param _name        Token nomi
    /// @param _symbol      Token belgisi
    /// @param _imageURI    IPFS rasm URI ("ipfs://Qm...")
    /// @param _description Token tavsifi
    /// @return tokenAddr   Yangi Token kontrakt manzili
    function create(
        string memory _name,
        string memory _symbol,
        string memory _imageURI,
        string memory _description
    ) external payable returns (address tokenAddr) {
        if (msg.value < fee) revert Factory__InsufficientFee();

        // ── [PROD-3] EIP-1167 Minimal Proxy pattern ───────────
        // Hozir: yangi to'liq Token kontrakt deploy bo'ladi (~3M gas)
        // Production-da: implementation clone yaratiladi (~200k gas)
        //
        // Bu yoqish uchun:
        //   1. LibClone yoki OpenZeppelin Clones kutubxonasini o'rnating
        //   2. tokenImplementation manzilini constructor-da saqlang
        //   3. Quyidagi Token deploy-ni almashtiring:
        //
        // import {Clones} from
        //     "@openzeppelin/contracts/proxy/Clones.sol";
        //
        // address tokenAddr = Clones.clone(tokenImplementation);
        // IToken(tokenAddr).initialize(
        //     msg.sender, _name, _symbol,
        //     _imageURI, _description, TOTAL_SUPPLY
        // );
        // ─────────────────────────────────────────────────────

        Token token = new Token(
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

        tokenToSale[tokenAddr] = TokenSale({
            token    : tokenAddr,
            name     : _name,
            imageURI : _imageURI,
            creator  : msg.sender,
            sold     : 0,
            raised   : 0,
            isOpen   : true,
            deposited: false
        });

        emit TokenCreated(
            tokenAddr,
            msg.sender,
            _name,
            _symbol,
            _imageURI,
            block.timestamp
        );
    }

    // ══════════════════════════════════════════════════════════
    //  CORE: BUY
    // ══════════════════════════════════════════════════════════

    /// @notice Bonding curve orqali token sotib oladi
    /// @param _token   Token kontrakt manzili
    /// @param _amount  Sotib olinadigan token miqdori (wei, masalan 100 ether = 100 token)
    /// @param _maxCost [FIX-4] Maksimal to'lash mumkin bo'lgan ETH (slippage himoyasi)
    ///                 0 qilib yuborsangiz tekshiruv o'tkazilmaydi
    function buy(
        address _token,
        uint256 _amount,
        uint256 _maxCost  // [FIX-4] slippage protection
    ) external payable nonReentrant {

        // [FIX-5] Zero address tekshiruvi
        if (_token == address(0)) revert Factory__InvalidToken();

        TokenSale storage sale = tokenToSale[_token];

        if (!sale.isOpen)           revert Factory__SaleClosed();
        if (_amount < MIN_BUY)      revert Factory__AmountTooLow();
        if (_amount > MAX_BUY)      revert Factory__AmountExceeded();

        uint256 cost  = getCost(sale.sold);
        uint256 price = cost * (_amount / 1 ether);

        // [FIX-4] Slippage: agar narx foydalanuvchi kutganidan oshsa revert
        if (_maxCost > 0 && price > _maxCost) {
            revert Factory__SlippageExceeded(price, _maxCost);
        }

        if (msg.value < price) revert Factory__InsufficientETH();

        // ── State yangilash (CEI pattern: Checks → Effects → Interactions)
        sale.sold   += _amount;
        sale.raised += price;

        if (sale.sold >= TOKEN_LIMIT || sale.raised >= TARGET) {
            sale.isOpen = false;
            emit SaleClosed(_token, sale.raised, sale.sold);
        }

        // ── Token o'tkazish
        IERC20(_token).safeTransfer(msg.sender, _amount);

        // [FIX-3] Ortiqcha ETH qaytarish
        unchecked {
            uint256 refund = msg.value - price;
            if (refund > 0) {
                (bool ok,) = payable(msg.sender).call{value: refund}("");
                if (!ok) revert Factory__ETHTransferFailed();
            }
        }

        emit TokenPurchased(
            _token,
            msg.sender,
            _amount,
            price,
            sale.sold,
            sale.raised
        );
    }

    // ══════════════════════════════════════════════════════════
    //  CORE: DEPOSIT (GRADUATION)
    // ══════════════════════════════════════════════════════════

    /// @notice Token-ni "graduate" qiladi: bonding curve yopilgandan
    ///         keyin yig'ilgan ETH va qolgan tokenlarni ishlatadi.
    ///
    /// PORTFOLIO versiyasi:  ETH + tokenlar creator-ga o'tadi.
    /// PRODUCTION versiyasi: Uniswap V3 da likvidlik pool yaratiladi.
    ///
    /// [FIX-2] Faqat creator yoki owner chaqira oladi
    /// [FIX-1] Ikki marta chaqirishdan himoyalangan
    ///
    /// @param _token  Graduate qilinadigan token manzili
    function deposit(address _token) external nonReentrant {
        TokenSale storage sale = tokenToSale[_token];

        // [FIX-1] Ikki marta chaqirishdan himoya
        if (sale.deposited)  revert Factory__AlreadyDeposited();

        // Bonding curve hali yopilmaganmi?
        if (sale.isOpen)     revert Factory__TargetNotReached();

        // [FIX-2] Faqat creator yoki kontrakt owner
        if (msg.sender != sale.creator && msg.sender != owner) {
            revert Factory__NotAuthorized();
        }

        // ── [FIX-1] Lock: qayta kirish va ikki marta deposit imkonsiz
        sale.deposited = true;

        // ── Local cache: storage-ni bir marta o'qiymiz
        address creator      = sale.creator;
        uint256 ethRaised    = sale.raised;
        Token   token        = Token(_token);
        uint256 tokenBalance = token.balanceOf(address(this));

        // ══════════════════════════════════════════════════════
        //  PORTFOLIO VERSIYASI (hozir ishlaydi)
        // ══════════════════════════════════════════════════════

        // Qolgan tokenlarni creator-ga o'tkazish
        // (Production-da bu Uniswap pool-ga ketadi)
        IERC20(_token).safeTransfer(creator, tokenBalance);

        // Yig'ilgan ETH-ni creator-ga o'tkazish
        // (Production-da bu Uniswap pool-ga ketadi)
        (bool ok,) = payable(creator).call{value: ethRaised}("");
        if (!ok) revert Factory__ETHTransferFailed();

        emit TokenGraduated(_token, creator, ethRaised, tokenBalance);

        // ══════════════════════════════════════════════════════
        //  [PROD-1] PRODUCTION: Uniswap V3 Likvidlik Pool
        // ══════════════════════════════════════════════════════
        // Yuqoridagi portfolio kodini o'chirib, quyidagini yoqing.
        // Kerakli import va konstantalarni ham yoqishni unutmang.
        //
        // ── 1. Uniswap-ga token approve ───────────────────────
        // token.approve(POSITION_MANAGER, tokenBalance);
        //
        // ── 2. WETH qoplash ───────────────────────────────────
        // IWETH(WETH).deposit{value: ethRaised}();
        // IWETH(WETH).approve(POSITION_MANAGER, ethRaised);
        //
        // ── 3. Token juftligini tartibga solish (V3 talab qiladi) ─
        // (address token0, address token1) = _token < WETH
        //     ? (_token, WETH)
        //     : (WETH, _token);
        //
        // uint256 amount0 = token0 == _token ? tokenBalance : ethRaised;
        // uint256 amount1 = token1 == _token ? tokenBalance : ethRaised;
        //
        // ── 4. Boshlang'ich narxni bonding curve oxirgi narxidan hisoblash ─
        // uint160 sqrtPriceX96 = _computeSqrtPriceX96(
        //     sale.sold, ethRaised, token0 == _token
        // );
        //
        // ── 5. Pool yaratish va narxni boshlash ───────────────
        // INonfungiblePositionManager(POSITION_MANAGER)
        //     .createAndInitializePoolIfNecessary(
        //         token0, token1, POOL_FEE, sqrtPriceX96
        //     );
        //
        // ── 6. To'liq range-da likvidlik qo'shish ─────────────
        // (uint256 tokenId,,,) = INonfungiblePositionManager(POSITION_MANAGER)
        //     .mint(INonfungiblePositionManager.MintParams({
        //         token0:         token0,
        //         token1:         token1,
        //         fee:            POOL_FEE,
        //         tickLower:      MIN_TICK,   // to'liq range
        //         tickUpper:      MAX_TICK,
        //         amount0Desired: amount0,
        //         amount1Desired: amount1,
        //         amount0Min:     0,          // production-da slippage
        //         amount1Min:     0,
        //         recipient:      creator,    // LP NFT creator-ga
        //         deadline:       block.timestamp + 300
        //     }));
        //
        // ── [PROD-4] Creator royalty ───────────────────────────
        // Production-da creator-ga sotuv-dan % beriladi.
        // Masalan, yig'ilgan ETH-ning 5% creator-ga:
        //
        // uint256 creatorShare = (ethRaised * 500) / 10_000; // 5%
        // uint256 poolEth      = ethRaised - creatorShare;
        // (bool ok2,) = payable(creator).call{value: creatorShare}("");
        // require(ok2, "creator fee failed");
        // // Qolgan poolEth → Uniswap
        //
        // emit TokenGraduated(_token, creator, ethRaised, tokenBalance, pool);
        // ─────────────────────────────────────────────────────

        // ── [PROD-2] sqrtPriceX96 hisoblash yordamchi funksiya ─
        // Uniswap V3 narxni Q64.96 formatida talab qiladi.
        // Bonding curve-ning oxirgi narxi = price per token in ETH
        // Bu narxdan sqrtPriceX96 hisoblanadi:
        //
        // function _computeSqrtPriceX96(
        //     uint256 totalSold,
        //     uint256 totalRaised,
        //     bool tokenIsToken0
        // ) internal pure returns (uint160 sqrtPriceX96) {
        //     // price = ETH per token (wei)
        //     // Uniswap: price = token1/token0
        //     uint256 lastCost = getCost(totalSold);  // ETH per token
        //
        //     // price = lastCost (token0=TOKEN, token1=WETH)
        //     // sqrtPrice = sqrt(price) * 2^96
        //     // sqrt ni Solidity-da hisoblash uchun:
        //     uint256 priceX192 = tokenIsToken0
        //         ? (lastCost << 192) / 1 ether   // token0=TOKEN
        //         : (1 ether << 192) / lastCost;  // token0=WETH
        //
        //     sqrtPriceX96 = uint160(_sqrt(priceX192));
        // }
        //
        // function _sqrt(uint256 x) internal pure returns (uint256 y) {
        //     if (x == 0) return 0;
        //     uint256 z = (x + 1) / 2;
        //     y = x;
        //     while (z < y) { y = z; z = (x / z + z) / 2; }
        // }
        // ─────────────────────────────────────────────────────
    }

    // ══════════════════════════════════════════════════════════
    //  ADMIN
    // ══════════════════════════════════════════════════════════

    /// @notice Yig'ilgan yaratish to'lovlarini yechib olish
    /// @param _amount  Yechib olinadigan ETH miqdori (wei)
    function withdraw(uint256 _amount) external onlyOwner {
        (bool ok,) = payable(owner).call{value: _amount}("");
        if (!ok) revert Factory__ETHTransferFailed();
        emit Withdrawn(owner, _amount);
    }

    /// @notice Kontrakt egalisini o'tkazish
    /// @param _newOwner  Yangi owner manzili
    function transferOwnership(address _newOwner) external onlyOwner {
        if (_newOwner == address(0)) revert Factory__ZeroAddress();
        emit OwnershipTransferred(owner, _newOwner);
        owner = _newOwner;
    }

    /// @notice ETH qabul qilish (kontrakt to'g'ridan-to'g'ri ETH olishi mumkin)
    receive() external payable {}
}
