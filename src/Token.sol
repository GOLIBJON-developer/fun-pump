// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// ============================================================
//  Token — Standard ERC20 for PumpClone bonding curve
// ============================================================
//
//  Dizayn qarorlari:
//   • Butun supply Factory-ga mintlanadi (bonding curve orqali taqsimlanadi)
//   • factory va creator immutable — deploy dan keyin o'zgartirib bo'lmaydi
//   • imageURI / description storage-da saqlanadi (gas-optimized
//     versiyada ular faqat event-da bo'ladi)
//
// ============================================================

contract Token is ERC20 {
    // ── Immutables ────────────────────────────────────────────
    /// @dev Factory manzili — deploy qilgan kontrakt
    address public immutable factory;

    /// @dev Token yaratgan foydalanuvchi manzili
    address public immutable creator;

    // ── Storage ───────────────────────────────────────────────
    /// @dev IPFS URI: "ipfs://Qm..." ko'rinishida
    string public imageURI;

    /// @dev Token tavsifi
    string public description;

    // ── Errors ────────────────────────────────────────────────
    error Token__OnlyFactory();

    // ── Constructor ───────────────────────────────────────────
    /// @param _creator     Token yaratgan foydalanuvchi
    /// @param _name        ERC20 token nomi
    /// @param _symbol      ERC20 token belgisi
    /// @param _imageURI    IPFS rasm manzili (masalan "ipfs://QmAbc...")
    /// @param _description Token tavsifi
    /// @param _totalSupply Umumiy miqdor (1_000_000 ether)
    constructor(
        address _creator,
        string memory _name,
        string memory _symbol,
        string memory _imageURI,
        string memory _description,
        uint256 _totalSupply
    ) ERC20(_name, _symbol) {
        factory     = msg.sender;   // Factory deploy qiladi
        creator     = _creator;     // Foydalanuvchi manzili saqlanadi
        imageURI    = _imageURI;
        description = _description;

        // Butun supply Factory-ga mintlanadi
        // Factory bonding curve orqali xaridorlarga o'tkazadi
        _mint(msg.sender, _totalSupply);
    }

    // ─────────────────────────────────────────────────────────
    // REAL WORLD: EIP-2612 Permit (gasless approve)
    // ─────────────────────────────────────────────────────────
    // Production-da foydalanuvchilar approve txni alohida
    // yubormaslik uchun EIP-2612 permit qo'shiladi.
    // Bu Uniswap V3 addLiquidity uchun ham kerak.
    //
    // Yoqish uchun:
    //   1. ERC20 o'rniga ERC20Permit import qiling
    //   2. Constructor-da: ERC20Permit(_name) qo'shing
    //
    // import {ERC20Permit} from
    //     "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
    //
    // contract Token is ERC20Permit {
    //     constructor(...) ERC20(_name, _symbol) ERC20Permit(_name) {
    //         ...
    //     }
    // }
    // ─────────────────────────────────────────────────────────
}
