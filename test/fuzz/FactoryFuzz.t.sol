// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {Factory} from "../../src/Factory.sol";
import {Token}   from "../../src/Token.sol";

contract FactoryFuzzTest is Test {

    Factory factory;
    address owner   = makeAddr("owner");
    address creator = makeAddr("creator");
    address buyer   = makeAddr("buyer");

    function setUp() public {
        vm.prank(owner);
        factory = new Factory(0.01 ether);
        vm.deal(creator, 10 ether);
        vm.deal(buyer,   1000 ether);
    }

    // ══════════════════════════════════════════════════════════
    //  HELPER
    //  getSale() ishlatiladi — tokenToSale() public mapping
    //  tuple qaytaradi, .isOpen/.sold kabi fieldlarga to'g'ridan
    //  zanjir qilib murojaat qilib bo'lmaydi.
    // ══════════════════════════════════════════════════════════

    function _createAndClose() internal returns (address tokenAddr) {
        vm.prank(creator);
        tokenAddr = factory.create{value: 0.01 ether}("T", "T", "", "");

        for (uint256 i = 0; i < 50; i++) {
            Factory.TokenSale memory s = factory.getSale(tokenAddr);
            if (!s.isOpen) break;
            uint256 price = factory.getCost(s.sold) * 10_000;
            vm.prank(buyer);
            factory.buy{value: price}(tokenAddr, 10_000 ether, 0);
        }
    }

    // ══════════════════════════════════════════════════════════
    //  BONDING CURVE
    // ══════════════════════════════════════════════════════════

    function testFuzz_GetCost_AlwaysAboveFloor(uint256 sold) public view {
        sold = bound(sold, 0, 1_000_000 ether);
        assertGe(factory.getCost(sold), 0.0001 ether);
    }

    function testFuzz_GetCost_Monotone(uint256 a, uint256 b) public view {
        a = bound(a, 0, 500_000 ether);
        b = bound(b, a, 1_000_000 ether);
        assertGe(factory.getCost(b), factory.getCost(a));
    }

    // ══════════════════════════════════════════════════════════
    //  BUY
    // ══════════════════════════════════════════════════════════

    function testFuzz_Buy_ReceivesCorrectTokens(uint256 amount) public {
        vm.prank(creator);
        address tokenAddr = factory.create{value: 0.01 ether}("T", "T", "", "");

        amount = bound(amount, 1 ether, 10_000 ether);
        uint256 tokenAmount = amount / 1 ether;   // butun token soni
        amount = tokenAmount * 1 ether;           // aniq 1 ether karrali qilamiz

        uint256 price = factory.getCost(0) * tokenAmount;


        vm.prank(buyer);
        factory.buy{value: price}(tokenAddr, amount, 0);
        assertEq(Token(tokenAddr).balanceOf(buyer), amount);
    }

    function testFuzz_Buy_RevertsIfUnderpaidByOne(uint256 amount) public {
        vm.prank(creator);
        address tokenAddr = factory.create{value: 0.01 ether}("T", "T", "", "");

        amount = bound(amount, 1 ether, 10_000 ether);
        uint256 tokenAmount = amount / 1 ether;   // butun token soni
        amount = tokenAmount * 1 ether;           // aniq 1 ether karrali qilamiz

        uint256 price = factory.getCost(0) * tokenAmount;
        if (price == 0) return;

        vm.prank(buyer);
        vm.expectRevert(Factory.Factory__InsufficientETH.selector);
        factory.buy{value: price - 1}(tokenAddr, amount, 0);
    }

    function testFuzz_Buy_RefundIsExact(uint256 amount, uint256 extra) public {
        vm.prank(creator);
        address tokenAddr = factory.create{value: 0.01 ether}("T", "T", "", "");

        amount = bound(amount, 1 ether, 10_000 ether);
        uint256 tokenAmount = amount / 1 ether;   // butun token soni
        amount = tokenAmount * 1 ether;           // aniq 1 ether karrali qilamiz

        uint256 price = factory.getCost(0) * tokenAmount;
        extra = bound(extra, 0, buyer.balance - price);
        uint256 balBefore = buyer.balance;

        vm.prank(buyer);
        factory.buy{value: price + extra}(tokenAddr, amount, 0);

        assertApproxEqAbs(buyer.balance, balBefore - price, 1e9);
    }

    function testFuzz_Buy_SlippageReverts(uint256 amount) public {
        vm.prank(creator);
        address tokenAddr = factory.create{value: 0.01 ether}("T", "T", "", "");

        amount = bound(amount, 1 ether, 10_000 ether);
        uint256 tokenAmount = amount / 1 ether;   // butun token soni
        amount = tokenAmount * 1 ether;           // aniq 1 ether karrali qilamiz

        uint256 price = factory.getCost(0) * tokenAmount;
        if (price == 0) return;

        vm.prank(buyer);
        vm.expectRevert(
            abi.encodeWithSelector(
                Factory.Factory__SlippageExceeded.selector,
                price, price - 1
            )
        );
        factory.buy{value: price}(tokenAddr, amount, price - 1);
    }

    function testFuzz_Buy_RevertsOnTinyAmount(uint256 amount) public {
        vm.prank(creator);
        address tokenAddr = factory.create{value: 0.01 ether}("T", "T", "", "");
        amount = bound(amount, 1, 1 ether - 1);
        vm.prank(buyer);
        vm.expectRevert(Factory.Factory__AmountTooLow.selector);
        factory.buy{value: 1 ether}(tokenAddr, amount, 0);
    }

    function testFuzz_Buy_RevertsOnLargeAmount(uint256 amount) public {
        vm.prank(creator);
        address tokenAddr = factory.create{value: 0.01 ether}("T", "T", "", "");
        amount = bound(amount, 10_001 ether, type(uint128).max);
        vm.prank(buyer);
        vm.expectRevert(Factory.Factory__AmountExceeded.selector);
        factory.buy{value: 100 ether}(tokenAddr, amount, 0);
    }

    // ══════════════════════════════════════════════════════════
    //  CREATE
    // ══════════════════════════════════════════════════════════

    function testFuzz_Create_RevertsOnLowFee(uint256 feeSent) public {
        feeSent = bound(feeSent, 0, 0.01 ether - 1);
        vm.prank(creator);
        vm.expectRevert(Factory.Factory__InsufficientFee.selector);
        factory.create{value: feeSent}("T", "T", "", "");
    }

    // ══════════════════════════════════════════════════════════
    //  CONSERVATION
    // ══════════════════════════════════════════════════════════

    function testFuzz_Conservation_TotalSupply(uint256 amount) public {
        vm.prank(creator);
        address tokenAddr = factory.create{value: 0.01 ether}("T", "T", "", "");

        amount = bound(amount, 1 ether, 10_000 ether);
        uint256 tokenAmount = amount / 1 ether;   // butun token soni
        amount = tokenAmount * 1 ether;           // aniq 1 ether karrali qilamiz

        uint256 price = factory.getCost(0) * tokenAmount;
        vm.prank(buyer);
        factory.buy{value: price}(tokenAddr, amount, 0);

        Token token = Token(tokenAddr);
        uint256 total = token.balanceOf(address(factory))
                      + token.balanceOf(buyer);
        assertEq(total, 1_000_000 ether, "supply not conserved");
    }

    function testFuzz_SaleState_Consistency(uint256 amount) public {
        vm.prank(creator);
        address tokenAddr = factory.create{value: 0.01 ether}("T", "T", "", "");

        amount = bound(amount, 1 ether, 10_000 ether);
        uint256 tokenAmount = amount / 1 ether;   // butun token soni
        amount = tokenAmount * 1 ether;           // aniq 1 ether karrali qilamiz

        uint256 expectedPrice = factory.getCost(0) * tokenAmount;
        vm.prank(buyer);
        factory.buy{value: expectedPrice}(tokenAddr, amount, 0);

        Factory.TokenSale memory sale = factory.getSale(tokenAddr);
        assertEq(sale.sold,   amount);
        assertEq(sale.raised, expectedPrice);
    }

    // ══════════════════════════════════════════════════════════
    //  DEPOSIT — [FIX-1] [FIX-2]
    // ══════════════════════════════════════════════════════════

    function testFuzz_Deposit_RevertsForUnauthorized(address attacker) public {
        vm.assume(attacker != creator);
        vm.assume(attacker != owner);
        vm.assume(attacker != address(0));

        address tokenAddr = _createAndClose();

        vm.prank(attacker);
        vm.expectRevert(Factory.Factory__NotAuthorized.selector);
        factory.deposit(tokenAddr);
    }

    function testFuzz_Deposit_DoubleCallAlwaysReverts(address caller) public {
        vm.assume(caller != address(0));
        vm.deal(caller, 10 ether);

        address tokenAddr = _createAndClose();

        vm.prank(creator);
        factory.deposit(tokenAddr);

        vm.prank(caller);
        vm.expectRevert(Factory.Factory__AlreadyDeposited.selector);
        factory.deposit(tokenAddr);
    }
}
