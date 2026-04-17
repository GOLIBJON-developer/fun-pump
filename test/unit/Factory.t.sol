// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console2} from "forge-std/Test.sol";
import {Factory} from "../../src/Factory.sol";
import {Token}   from "../../src/Token.sol";

contract FactoryTest is Test {

    Factory public factory;

    address public owner    = makeAddr("owner");
    address public alice    = makeAddr("alice");
    address public bob      = makeAddr("bob");
    address public carol    = makeAddr("carol");
    address public stranger = makeAddr("stranger");

    uint256 public constant FEE = 0.01 ether;

    event TokenCreated(address indexed token, address indexed creator,
        string name, string symbol, string imageURI, uint256 timestamp);
    event TokenPurchased(address indexed token, address indexed buyer,
        uint256 amount, uint256 price, uint256 totalSold, uint256 totalRaised);
    event SaleClosed(address indexed token, uint256 totalRaised, uint256 totalSold);
    event TokenGraduated(address indexed token, address indexed creator,
        uint256 ethAmount, uint256 tokenAmount);

    function setUp() public {
        vm.prank(owner);
        factory = new Factory(FEE);
        vm.deal(alice,   10 ether);
        vm.deal(bob,     500 ether);
        vm.deal(carol,   500 ether);
        vm.deal(stranger, 10 ether);
    }

    // ══════════════════════════════════════════════════════════
    //  HELPERS
    //  getSale() named struct qaytaradi — tokenToSale() emas.
    //  tokenToSale() public mapping bo'lib, Solidity uni unnamed
    //  tuple sifatida ko'rsatadi: .sold, .isOpen kabi field
    //  nomlariga to'g'ridan zanjir qilib murojaat qilib bo'lmaydi.
    // ══════════════════════════════════════════════════════════

    function _createToken() internal returns (address tokenAddr) {
        vm.prank(alice);
        tokenAddr = factory.create{value: FEE}(
            "PumpToken", "PUMP", "ipfs://QmTest", "A test token"
        );
    }

    function _exactPrice(address _token, uint256 _amount)
        internal view returns (uint256)
    {
        Factory.TokenSale memory sale = factory.getSale(_token);
        return factory.getCost(sale.sold) * (_amount / 1 ether);
    }

    function _closeSale(address _token) internal {
        for (uint256 i = 0; i < 50; i++) {
            Factory.TokenSale memory s = factory.getSale(_token);
            if (!s.isOpen) break;
            uint256 price = factory.getCost(s.sold) * 10_000;
            vm.prank(bob);
            factory.buy{value: price}(_token, 10_000 ether, 0);
        }
    }

    // ══════════════════════════════════════════════════════════
    //  CONSTRUCTOR
    // ══════════════════════════════════════════════════════════

    function test_Constructor() public view {
        assertEq(factory.owner(), owner);
        assertEq(factory.fee(), FEE);
        assertEq(factory.totalTokens(), 0);
    }

    // ══════════════════════════════════════════════════════════
    //  CREATE
    // ══════════════════════════════════════════════════════════

    function test_Create_Success() public {
        address tokenAddr = _createToken();
        assertEq(factory.totalTokens(), 1);
        assertFalse(tokenAddr == address(0));

        Factory.TokenSale memory sale = factory.getTokenSale(0);
        assertEq(sale.token,   tokenAddr);
        assertEq(sale.creator, alice);
        assertTrue(sale.isOpen);
        assertFalse(sale.deposited);
        assertEq(sale.sold,   0);
        assertEq(sale.raised, 0);
    }

    function test_Create_MintsTotalSupplyToFactory() public {
        address tokenAddr = _createToken();
        assertEq(Token(tokenAddr).balanceOf(address(factory)), 1_000_000 ether);
        assertEq(Token(tokenAddr).totalSupply(), 1_000_000 ether);
    }

    function test_Create_RevertsOnLowFee() public {
        vm.prank(alice);
        vm.expectRevert(Factory.Factory__InsufficientFee.selector);
        factory.create{value: FEE - 1}("T", "T", "", "");
    }

    function test_Create_AcceptsExactFee() public {
        vm.prank(alice);
        factory.create{value: FEE}("T", "T", "", "");
    }

    function test_Create_AcceptsOverpay() public {
        vm.prank(alice);
        factory.create{value: FEE + 1 ether}("T", "T", "", "");
        assertEq(address(factory).balance, FEE + 1 ether);
    }

    function test_Create_MultipleTokens() public {
        vm.startPrank(alice);
        factory.create{value: FEE}("Alpha", "A", "", "");
        factory.create{value: FEE}("Beta",  "B", "", "");
        factory.create{value: FEE}("Gamma", "C", "", "");
        vm.stopPrank();
        assertEq(factory.totalTokens(), 3);
        assertEq(factory.getAllTokens().length, 3);
    }

    function test_Create_EmitsEvent() public {
        vm.prank(alice);
        vm.expectEmit(false, true, false, false);
        emit TokenCreated(address(0), alice, "PumpToken", "PUMP", "ipfs://QmTest", 0);
        factory.create{value: FEE}("PumpToken", "PUMP", "ipfs://QmTest", "");
    }

    // ══════════════════════════════════════════════════════════
    //  GET COST
    // ══════════════════════════════════════════════════════════

    function test_GetCost_AtZero() public view {
        assertEq(factory.getCost(0), 0.0001 ether);
    }

    function test_GetCost_AtOneIncrement() public view {
        assertEq(factory.getCost(10_000 ether), 0.0002 ether);
    }

    function test_GetCost_AtFiveIncrements() public view {
        assertEq(factory.getCost(50_000 ether), 0.0006 ether);
    }

    function test_GetCost_IsLinear() public view {
        uint256 c0 = factory.getCost(0);
        uint256 c1 = factory.getCost(10_000 ether);
        uint256 c2 = factory.getCost(20_000 ether);
        assertEq(c1 - c0, c2 - c1, "not linear");
    }

    function test_GetCost_AlwaysPositive() public view {
        assertGt(factory.getCost(0), 0);
        assertGt(factory.getCost(500_000 ether), 0);
    }

    // ══════════════════════════════════════════════════════════
    //  BUY
    // ══════════════════════════════════════════════════════════

    function test_Buy_Success() public {
        address token = _createToken();
        uint256 price = _exactPrice(token, 100 ether);
        vm.prank(bob);
        factory.buy{value: price}(token, 100 ether, 0);
        assertEq(Token(token).balanceOf(bob), 100 ether);
        Factory.TokenSale memory sale = factory.getSale(token);
        assertEq(sale.sold,   100 ether);
        assertEq(sale.raised, price);
        assertTrue(sale.isOpen);
    }

    function test_Buy_RevertsAmountTooLow() public {
        address token = _createToken();
        vm.prank(bob);
        vm.expectRevert(Factory.Factory__AmountTooLow.selector);
        factory.buy{value: 1}(token, 0.5 ether, 0);
    }

    function test_Buy_RevertsAmountTooHigh() public {
        address token = _createToken();
        vm.prank(bob);
        vm.expectRevert(Factory.Factory__AmountExceeded.selector);
        factory.buy{value: 100 ether}(token, 10_001 ether, 0);
    }

    function test_Buy_RevertsInsufficientETH() public {
        address token = _createToken();
        uint256 price = _exactPrice(token, 100 ether);
        vm.prank(bob);
        vm.expectRevert(Factory.Factory__InsufficientETH.selector);
        factory.buy{value: price - 1}(token, 100 ether, 0);
    }

    function test_Buy_RefundsExcessETH() public {
        address token   = _createToken();
        uint256 amount  = 100 ether;
        uint256 exact   = _exactPrice(token, amount);
        uint256 overpay = exact + 0.5 ether;
        uint256 balBefore = bob.balance;
        vm.prank(bob);
        factory.buy{value: overpay}(token, amount, 0);
        assertApproxEqAbs(bob.balance, balBefore - exact, 1e9, "refund incorrect");
    }

    function test_Buy_ExactETH_NoRefund() public {
        address token = _createToken();
        uint256 price = _exactPrice(token, 1_000 ether);
        uint256 balBefore = bob.balance;
        vm.prank(bob);
        factory.buy{value: price}(token, 1_000 ether, 0);
        assertApproxEqAbs(bob.balance, balBefore - price, 1e9);
    }

    function test_Buy_RevertsOnSlippage() public {
        address token = _createToken();
        uint256 price = _exactPrice(token, 100 ether);
        vm.prank(bob);
        vm.expectRevert(
            abi.encodeWithSelector(
                Factory.Factory__SlippageExceeded.selector,
                price, price - 1
            )
        );
        factory.buy{value: price}(token, 100 ether, price - 1);
    }

    function test_Buy_SlippageZero_Skips() public {
        address token = _createToken();
        uint256 price = _exactPrice(token, 100 ether);
        vm.prank(bob);
        factory.buy{value: price}(token, 100 ether, 0);
    }

    function test_Buy_SlippageExact_Passes() public {
        address token = _createToken();
        uint256 price = _exactPrice(token, 100 ether);
        vm.prank(bob);
        factory.buy{value: price}(token, 100 ether, price);
    }

    function test_Buy_RevertsZeroAddress() public {
        vm.prank(bob);
        vm.expectRevert(Factory.Factory__InvalidToken.selector);
        factory.buy{value: 1 ether}(address(0), 1 ether, 0);
    }

    function test_Buy_PriceIncreasesWithSold() public {
        address token  = _createToken();
        uint256 price1 = _exactPrice(token, 10_000 ether);
        vm.prank(bob);
        factory.buy{value: price1}(token, 10_000 ether, 0);
        uint256 price2 = _exactPrice(token, 10_000 ether);
        assertGt(price2, price1, "price should increase");
    }

    function test_Buy_ClosesAtTokenLimit() public {
        address token = _createToken();
        _closeSale(token);
        assertFalse(factory.getSale(token).isOpen);
    }

    function test_Buy_RevertsOnClosedSale() public {
        address token = _createToken();
        _closeSale(token);
        vm.prank(carol);
        vm.expectRevert(Factory.Factory__SaleClosed.selector);
        factory.buy{value: 1 ether}(token, 1 ether, 0);
    }

    // ══════════════════════════════════════════════════════════
    //  DEPOSIT — [FIX-1] [FIX-2]
    // ══════════════════════════════════════════════════════════

    function test_Deposit_RevertsIfSaleOpen() public {
        address token = _createToken();
        vm.expectRevert(Factory.Factory__TargetNotReached.selector);
        factory.deposit(token);
    }

    function test_Deposit_RevertsIfStranger() public {
        address token = _createToken();
        _closeSale(token);
        vm.prank(stranger);
        vm.expectRevert(Factory.Factory__NotAuthorized.selector);
        factory.deposit(token);
    }

    function test_Deposit_RevertsIfBuyer() public {
        address token = _createToken();
        _closeSale(token);
        vm.prank(carol);
        vm.expectRevert(Factory.Factory__NotAuthorized.selector);
        factory.deposit(token);
    }

    function test_Deposit_OwnerCanDeposit() public {
        address token = _createToken();
        _closeSale(token);
        vm.prank(owner);
        factory.deposit(token);
    }

    function test_Deposit_CreatorCanDeposit() public {
        address token = _createToken();
        _closeSale(token);
        uint256 ethBefore    = alice.balance;
        uint256 tokensBefore = Token(token).balanceOf(alice);
        uint256 raised       = factory.getSale(token).raised;
        vm.prank(alice);
        factory.deposit(token);
        assertEq(alice.balance - ethBefore, raised);
        assertGt(Token(token).balanceOf(alice), tokensBefore);
    }

    function test_Deposit_RevertsOnDoubleDeposit() public {
        address token = _createToken();
        _closeSale(token);
        vm.prank(alice);
        factory.deposit(token);
        vm.prank(alice);
        vm.expectRevert(Factory.Factory__AlreadyDeposited.selector);
        factory.deposit(token);
    }

    function test_Deposit_DoubleDeposit_OwnerAlsoReverts() public {
        address token = _createToken();
        _closeSale(token);
        vm.prank(alice);
        factory.deposit(token);
        vm.prank(owner);
        vm.expectRevert(Factory.Factory__AlreadyDeposited.selector);
        factory.deposit(token);
    }

    function test_Deposit_FactoryTokenBalanceZeroAfter() public {
        address token = _createToken();
        _closeSale(token);
        vm.prank(alice);
        factory.deposit(token);
        assertEq(Token(token).balanceOf(address(factory)), 0);
    }

    function test_Deposit_SetDepositedFlag() public {
        address token = _createToken();
        _closeSale(token);
        assertFalse(factory.getSale(token).deposited);
        vm.prank(alice);
        factory.deposit(token);
        assertTrue(factory.getSale(token).deposited);
    }

    // ══════════════════════════════════════════════════════════
    //  WITHDRAW
    // ══════════════════════════════════════════════════════════

    function test_Withdraw_Success() public {
        vm.deal(address(factory), 2 ether);
        uint256 balBefore = owner.balance;
        vm.prank(owner);
        factory.withdraw(1 ether);
        assertEq(owner.balance, balBefore + 1 ether);
    }

    function test_Withdraw_RevertsIfNotOwner() public {
        vm.deal(address(factory), 1 ether);
        vm.prank(alice);
        vm.expectRevert(Factory.Factory__NotOwner.selector);
        factory.withdraw(1 ether);
    }

    // ══════════════════════════════════════════════════════════
    //  TRANSFER OWNERSHIP
    // ══════════════════════════════════════════════════════════

    function test_TransferOwnership() public {
        vm.prank(owner);
        factory.transferOwnership(alice);
        assertEq(factory.owner(), alice);
    }

    function test_TransferOwnership_RevertsZeroAddress() public {
        vm.prank(owner);
        vm.expectRevert(Factory.Factory__ZeroAddress.selector);
        factory.transferOwnership(address(0));
    }

    function test_TransferOwnership_RevertsIfNotOwner() public {
        vm.prank(alice);
        vm.expectRevert(Factory.Factory__NotOwner.selector);
        factory.transferOwnership(alice);
    }

    // ══════════════════════════════════════════════════════════
    //  PAGINATION
    // ══════════════════════════════════════════════════════════

    function test_GetTokensPaginated() public {
        vm.startPrank(alice);
        for (uint256 i = 0; i < 5; i++) {
            factory.create{value: FEE}("T", "T", "", "");
        }
        vm.stopPrank();
        Factory.TokenSale[] memory page1 = factory.getTokensPaginated(0, 3);
        Factory.TokenSale[] memory page2 = factory.getTokensPaginated(3, 3);
        assertEq(page1.length, 3);
        assertEq(page2.length, 2);
    }

    function test_GetTokensPaginated_OutOfBoundsClamps() public {
        vm.prank(alice);
        factory.create{value: FEE}("T", "T", "", "");
        Factory.TokenSale[] memory page = factory.getTokensPaginated(0, 100);
        assertEq(page.length, 1);
    }

    // ══════════════════════════════════════════════════════════
    //  SUPPLY CONSERVATION
    // ══════════════════════════════════════════════════════════

    function test_TotalSupplyConserved() public {
        address token = _createToken();
        uint256 price = _exactPrice(token, 1_000 ether);
        vm.prank(bob);
        factory.buy{value: price}(token, 1_000 ether, 0);
        uint256 total = Token(token).balanceOf(address(factory))
                      + Token(token).balanceOf(bob);
        assertEq(total, 1_000_000 ether);
    }
}
