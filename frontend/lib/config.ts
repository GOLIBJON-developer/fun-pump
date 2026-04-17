import { sepolia } from "wagmi/chains";
import { http } from "wagmi";

export const FACTORY_ADDRESS =
  (process.env.NEXT_PUBLIC_FACTORY_ADDRESS as `0x${string}`) ?? "0x0";

export const SUPPORTED_CHAINS = [sepolia] as const;

export const TRANSPORTS = {
  [sepolia.id]: http(process.env.NEXT_PUBLIC_RPC_URL),
};

// IPFS
// export const PINATA_GATEWAY_KEY     = process.env.NEXT_PUBLIC_PINATA_JWT ?? "";
export const PINATA_GATEWAY = "https://green-useful-dolphin-48.mypinata.cloud/ipfs/";
export const shortAddr = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
export const fmtEth    = (w: bigint, d = 4) => (Number(w) / 1e18).toFixed(d);

export function ipfsToHttp(uri: string): string {
  if (!uri) return "/placeholder.png";
  if (uri.startsWith("ipfs://")) {
    return `https://ipfs.io/ipfs/${uri.slice(7)}`;
  }
  return uri;
}

// Contract constants (mirror)
export const TARGET_ETH   = BigInt("3000000000000000000");
export const TOKEN_LIMIT  = BigInt("500000000000000000000000");
export const TOTAL_SUPPLY = BigInt("1000000000000000000000000");
export const MAX_BUY      = BigInt("10000000000000000000000");
