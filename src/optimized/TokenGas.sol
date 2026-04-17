// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// ============================================================
//  TokenGas — Gas-Optimized ERC20
// ============================================================
//
//  Regular Token-dan farqi:
//   • imageURI / description STORAGE-DA SAQLANMAYDI
//     → Faqat constructor event orqali emit qilinadi
//     → Tejash: ~2 SSTORE = ~40,000 gas
//   • factory va creator immutable (ikkalasida ham bor)
//
//  Frontend imageURI-ni qanday o'qiydi?
//   → eth_getLogs(TokenCreated event) → imageURI fieldidan
//   → Yoki The Graph subgraph indexing
//
// ============================================================

contract TokenGas is ERC20 {
    // ── Immutables ────────────────────────────────────────────
    address public immutable factory;
    address public immutable creator;

    // ── Events ────────────────────────────────────────────────
    /// @dev Metadata bir marta emit qilinadi, storage-da saqlanmaydi
    ///      Frontend getLogs orqali o'qiydi
    event Metadata(string imageURI, string description);

    // ── Constructor ───────────────────────────────────────────
    constructor(
        address _creator,
        string memory _name,
        string memory _symbol,
        string memory _imageURI,
        string memory _description,
        uint256 _totalSupply
    ) ERC20(_name, _symbol) {
        factory = msg.sender;
        creator = _creator;

        // Butun supply Factory-ga — storage log emissiyas yo'q
        _mint(msg.sender, _totalSupply);

        // Metadata bir marta yoziladi: ~1500 gas (vs ~40k storage SSTORE)
        emit Metadata(_imageURI, _description);
    }

    // ─────────────────────────────────────────────────────────
    // [PROD-3] EIP-1167 Clone-ga moslashtirish uchun:
    //
    // Clone pattern bilan ishlash uchun constructor argumentlari
    // ishlamaydi — buning o'rniga initialize() kerak.
    //
    // import {Initializable} from
    //     "@openzeppelin/contracts/proxy/utils/Initializable.sol";
    //
    // contract TokenGas is ERC20, Initializable {
    //     address public factory;
    //     address public creator;
    //
    //     constructor() ERC20("", "") {}
    //
    //     function initialize(
    //         address _creator,
    //         string calldata _name,
    //         string calldata _symbol,
    //         string calldata _imageURI,
    //         string calldata _description,
    //         uint256 _totalSupply
    //     ) external initializer {
    //         factory = msg.sender;
    //         creator = _creator;
    //         _mint(msg.sender, _totalSupply);
    //         emit Metadata(_imageURI, _description);
    //     }
    // }
    // ─────────────────────────────────────────────────────────
}
