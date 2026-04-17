// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console2} from "forge-std/Test.sol";
import {Factory} from "../../src/Factory.sol";
import {Token}   from "../../src/Token.sol";

contract FactoryIntegrationTest is Test {

    Factory factory;
    address owner    = makeAddr("owner");
    address creator  = makeAddr("creator");
    address buyer1   = makeAddr("buyer1");
    address buyer2   = makeAddr("buyer2");
    address attacker = makeAddr("attacker");

    function setUp() public {
        vm.prank(owner);
        factory = new Factory(0.01 ether);
        vm.deal(creator,  10 ether);
        vm.deal(buyer1,   200 ether);
        vm.deal(buyer2,   200 ether);
        vm.deal(attacker, 10 ether);
    }

    // ══════════════════════════════════════════════════════════
    //  FULL LIFECYCLE
    // ══════════════════════════════════════════════════════════

    function test_FullLifecycle() public {
        // 1. Token yaratish
        vm.prank(creator);
        address tokenAddr = factory.create{value: 0.01 ether}(
            "MoonCoin", "MOON", "ipfs://QmMoon", "To the moon!"
        );
        Token token = Token(tokenAddr);
        assertEq(token.balanceOf(address(factory)), 1_000_000 ether);

        // 2. Ko'p xaridor tokenlar sotib oladi
        // getSale() ishlatiladi — tokenToSale() tuple qaytaradi,
        // unga to'g'ridan .isOpen chain qilib bo'lmaydi.
        uint256 rounds = 0;
        {
            Factory.TokenSale memory s = factory.getSale(tokenAddr);
            while (s.isOpen) {
                uint256 p1 = factory.getCost(s.sold) * 10_000;
                vm.prank(buyer1);
                factory.buy{value: p1}(tokenAddr, 10_000 ether, 0);

                s = factory.getSale(tokenAddr);
                if (!s.isOpen) break;

                uint256 p2 = factory.getCost(s.sold) * 10_000;
                vm.prank(buyer2);
                factory.buy{value: p2}(tokenAddr, 10_000 ether, 0);

                s = factory.getSale(tokenAddr);
                rounds++;
                if (rounds > 100) break;
            }
        }

        // 3. Sale yopilganini tekshirish
        Factory.TokenSale memory finalSale = factory.getSale(tokenAddr);
        assertFalse(finalSale.isOpen, "sale should be closed");
        assertTrue(
            finalSale.sold >= factory.TOKEN_LIMIT() ||
            finalSale.raised >= factory.TARGET(),
            "graduation condition not met"
        );

        console2.log("Total sold:  ", finalSale.sold / 1 ether, "tokens");
        console2.log("Total raised:", finalSale.raised);

        // 4. [FIX-2] Attacker deposit qila olmaydi
        vm.prank(attacker);
        vm.expectRevert(Factory.Factory__NotAuthorized.selector);
        factory.deposit(tokenAddr);

        // 5. Creator graduation qiladi
        uint256 creatorEthBefore    = creator.balance;
        uint256 creatorTokensBefore = token.balanceOf(creator);
        uint256 raised              = finalSale.raised;

        vm.prank(creator);
        factory.deposit(tokenAddr);

        assertEq(creator.balance - creatorEthBefore, raised);
        uint256 unsold = 1_000_000 ether - finalSale.sold;
        assertEq(token.balanceOf(creator) - creatorTokensBefore, unsold);
        assertEq(token.balanceOf(address(factory)), 0);

        // 6. [FIX-1] Ikki marta deposit revert
        vm.prank(creator);
        vm.expectRevert(Factory.Factory__AlreadyDeposited.selector);
        factory.deposit(tokenAddr);

        console2.log("Creator ETH received:  ", creator.balance - creatorEthBefore);
        console2.log("Creator tokens received:", unsold / 1 ether);
    }

    // ══════════════════════════════════════════════════════════
    //  BONDING CURVE: NARX O'SISHI
    // ══════════════════════════════════════════════════════════

    function test_BondingCurve_PriceStrictlyNonDecreasing() public {
        vm.prank(creator);
        address tokenAddr = factory.create{value: 0.01 ether}("T", "T", "", "");

        uint256 lastPrice = 0;
        for (uint256 i = 0; i < 10; i++) {
            Factory.TokenSale memory s = factory.getSale(tokenAddr);
            if (!s.isOpen) break;
            uint256 price = factory.getCost(s.sold);
            assertGe(price, lastPrice, "price decreased!");
            lastPrice = price;
            uint256 buyPrice = factory.getCost(s.sold) * 10_000;
            vm.prank(buyer1);
            factory.buy{value: buyPrice}(tokenAddr, 10_000 ether, 0);
        }
    }

    // ══════════════════════════════════════════════════════════
    //  KO'P TOKEN: MUSTAQIL HOLAT
    // ══════════════════════════════════════════════════════════

    function test_MultipleTokens_IndependentState() public {
        vm.startPrank(creator);
        address tokenA = factory.create{value: 0.01 ether}("Alpha", "A", "", "");
        address tokenB = factory.create{value: 0.01 ether}("Beta",  "B", "", "");
        address tokenC = factory.create{value: 0.01 ether}("Gamma", "C", "", "");
        vm.stopPrank();

        uint256 priceA = factory.getCost(0) * 1_000;
        vm.prank(buyer1);
        factory.buy{value: priceA}(tokenA, 1_000 ether, 0);

        Factory.TokenSale memory saleB = factory.getSale(tokenB);
        Factory.TokenSale memory saleC = factory.getSale(tokenC);
        assertEq(saleB.sold, 0);
        assertEq(saleC.sold, 0);

        Factory.TokenSale memory saleA = factory.getSale(tokenA);
        assertEq(saleA.sold, 1_000 ether);
    }

    // ══════════════════════════════════════════════════════════
    //  OWNER: FEE YIG'ISH
    // ══════════════════════════════════════════════════════════

    function test_Owner_CollectsCreationFees() public {
        uint256 tokenCount = 5;
        vm.startPrank(creator);
        for (uint256 i = 0; i < tokenCount; i++) {
            factory.create{value: 0.01 ether}("T", "T", "", "");
        }
        vm.stopPrank();

        uint256 ownerBalBefore = owner.balance;
        vm.prank(owner);
        factory.withdraw(0.01 ether * tokenCount);
        assertEq(owner.balance, ownerBalBefore + 0.01 ether * tokenCount);
    }

    // ══════════════════════════════════════════════════════════
    //  SLIPPAGE: FRONTRUN SIMULATSIYASI
    // ══════════════════════════════════════════════════════════

    function test_Slippage_FrontrunProtection() public {
        vm.prank(creator);
        address tokenAddr = factory.create{value: 0.01 ether}("T", "T", "", "");

        // Bob narxni hisoblaydi (getCost(0) * 1000)
        uint256 expectedPrice = factory.getCost(0) * 1_000;

        // Carol (frontrunner) avval katta xarid qiladi → narx oshadi
        address carol = makeAddr("carol");
        vm.deal(carol, 100 ether);
        uint256 carolPrice = factory.getCost(0) * 10_000;
        vm.prank(carol);
        factory.buy{value: carolPrice}(tokenAddr, 10_000 ether, 0);

        // Bob-ning maxCost eski narx → SlippageExceeded revert
        vm.prank(buyer1);
        vm.expectRevert();
        factory.buy{value: expectedPrice}(
            tokenAddr,
            1_000 ether,
            expectedPrice
        );
    }

    // ══════════════════════════════════════════════════════════
    //  REFUND: ORTIQCHA ETH QAYTARISH
    // ══════════════════════════════════════════════════════════

    function test_Refund_MultipleOverpayers() public {
        vm.prank(creator);
        address tokenAddr = factory.create{value: 0.01 ether}("T", "T", "", "");

        uint256 b1Before = buyer1.balance;
        uint256 b2Before = buyer2.balance;

        uint256 exact1   = factory.getCost(0) * 5_000;
        uint256 overpay1 = exact1 * 150 / 100;
        vm.prank(buyer1);
        factory.buy{value: overpay1}(tokenAddr, 5_000 ether, 0);

        Factory.TokenSale memory s2 = factory.getSale(tokenAddr);
        uint256 exact2   = factory.getCost(s2.sold) * 5_000;
        uint256 overpay2 = exact2 * 300 / 100;
        vm.prank(buyer2);
        factory.buy{value: overpay2}(tokenAddr, 5_000 ether, 0);

        assertApproxEqAbs(buyer1.balance, b1Before - exact1, 1e9);
        assertApproxEqAbs(buyer2.balance, b2Before - exact2, 1e9);
    }
}
