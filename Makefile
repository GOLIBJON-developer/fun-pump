# ================================================================
#  PumpClone — Foundry Makefile
# ================================================================

-include .env

.PHONY: all clean install build test test-unit test-integration \
        test-fuzz test-gas snapshot coverage \
        deploy deploy-sepolia format lint slither \
        wallet-import wallet-list help

# ── Build ────────────────────────────────────────────────────────

all: clean install build

install:
	forge install OpenZeppelin/openzeppelin-contracts
	forge install foundry-rs/forge-std

build:
	forge build

clean:
	forge clean && rm -rf cache out

# ── Tests ─────────────────────────────────────────────────────────

test:
	forge test -v

test-unit:
	forge test --match-path "test/unit/*.t.sol" -vv

test-integration:
	forge test --match-path "test/integration/*.t.sol" -vv

test-fuzz:
	forge test --match-path "test/fuzz/*.t.sol" -vv --fuzz-runs 5000

test-gas:
	forge test --gas-report

snapshot:
	forge snapshot

coverage:
	forge coverage --report lcov && \
	genhtml lcov.info --branch-coverage --output-dir coverage/

# ── Deploy ────────────────────────────────────────────────────────

deploy:
	@forge script script/Deploy.s.sol \
		--rpc-url http://127.0.0.1:8545 \
		--private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
		--broadcast

deploy-sepolia:
	@forge script script/Deploy.s.sol \
		--rpc-url $(SEPOLIA_RPC_URL) \
		--account $(ACCOUNT) \
		--sender $(DEPLOYER_ADDRESS) \
		--broadcast --verify \
		--etherscan-api-key $(ETHERSCAN_API_KEY) \
		--slow -vvvv

# ── Code quality ──────────────────────────────────────────────────

format:
	forge fmt

lint:
	forge fmt --check

slither:
	slither src/ --exclude-dependencies

# ── Wallet ────────────────────────────────────────────────────────

wallet-import:
	cast wallet import $(ACCOUNT) --interactive

wallet-list:
	cast wallet list

# ── Help ──────────────────────────────────────────────────────────

help:
	@echo ""
	@echo "Usage: make <target>"
	@echo ""
	@echo "  all                    clean + install + build"
	@echo "  install                Install dependencies"
	@echo "  build                  Compile contracts"
	@echo "  clean                  Remove build artifacts"
	@echo ""
	@echo "  test                   Run all tests"
	@echo "  test-unit              Unit tests"
	@echo "  test-integration       Integration tests"
	@echo "  test-fuzz              Fuzz tests (5000 runs)"
	@echo "  test-gas               Gas report"
	@echo "  snapshot               Gas snapshot"
	@echo "  coverage               HTML coverage (needs lcov)"
	@echo ""
	@echo "  deploy                 Deploy to Anvil"
	@echo "  deploy-sepolia         Deploy to Sepolia + verify"
	@echo ""
	@echo "  wallet-import          cast wallet import ACCOUNT=<name>"
	@echo "  wallet-list            List keystores"
	@echo ""
	@echo "  format                 forge fmt"
	@echo "  lint                   forge fmt --check"
	@echo "  slither                Static analysis"
	@echo ""
	@echo "  .env:"
	@echo "    SEPOLIA_RPC_URL=..."
	@echo "    ETHERSCAN_API_KEY=..."
	@echo "    DEPLOYER_ADDRESS=0x..."
	@echo "    ACCOUNT=myWallet"
	@echo ""