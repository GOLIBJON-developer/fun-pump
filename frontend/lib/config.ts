import { sepolia } from "wagmi/chains";
import { http } from "wagmi";

// ── Update after deploy ──────────────────────────────────────────
export const FACTORY_ADDRESS =
  (process.env.NEXT_PUBLIC_FACTORY_ADDRESS as `0x${string}`) ?? "0x0";

// ── Chains & transports ──────────────────────────────────────────
export const SUPPORTED_CHAINS = [sepolia] as const;

export const TRANSPORTS = {
  [sepolia.id]: http(process.env.NEXT_PUBLIC_RPC_URL),
};

// ── IPFS ─────────────────────────────────────────────────────────
export const PINATA_JWT       = process.env.NEXT_PUBLIC_PINATA_JWT ?? "";
export const PINATA_GATEWAY   = "https://gateway.pinata.cloud/ipfs/";

export const ipfsToHttp = (uri: string): string => {
  if (!uri) return "/placeholder-token.png";
  if (uri.startsWith("ipfs://")) {
    return `${PINATA_GATEWAY}${uri.slice(7)}`;
  }
  return uri;
};

// ── Constants (mirror contract) ──────────────────────────────────
export const TARGET_ETH    = BigInt("3000000000000000000"); // 3 ETH
export const TOKEN_LIMIT   = BigInt("500000000000000000000000"); // 500k tokens
export const MAX_BUY       = BigInt("10000000000000000000000"); // 10k tokens
export const TOTAL_SUPPLY  = BigInt("1000000000000000000000000"); // 1M tokens