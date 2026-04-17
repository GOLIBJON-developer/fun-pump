import {
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { FACTORY_ABI, type TokenSale } from "@/lib/abis";
import { FACTORY_ADDRESS } from "@/lib/config";

export type { TokenSale };

// ── Read: paginated token list ────────────────────────────────
export function useTokensPaginated(page = 0, limit = 20) {
  return useReadContract({
    address: FACTORY_ADDRESS,
    abi: FACTORY_ABI,
    functionName: "getTokensPaginated",
    args: [BigInt(page * limit), BigInt(limit)],
    query: { refetchInterval: 15_000 },
  });
}

// ── Read: single sale ─────────────────────────────────────────
export function useTokenSale(tokenAddress: `0x${string}` | undefined) {
  return useReadContract({
    address: FACTORY_ADDRESS,
    abi: FACTORY_ABI,
    functionName: "getSale",
    args: tokenAddress ? [tokenAddress] : undefined,
    query: {
      enabled: !!tokenAddress,
      refetchInterval: 13_000,
    },
  });
}

// ── Read: total count ─────────────────────────────────────────
export function useTotalTokens() {
  return useReadContract({
    address: FACTORY_ADDRESS,
    abi: FACTORY_ABI,
    functionName: "totalTokens",
    query: { refetchInterval: 15_000 },
  });
}

// ── Read: creation fee ────────────────────────────────────────
export function useCreationFee() {
  return useReadContract({
    address: FACTORY_ADDRESS,
    abi: FACTORY_ABI,
    functionName: "fee",
  });
}

// ── Read: estimate buy cost ───────────────────────────────────
export function useEstimateCost(sold: bigint, amount: bigint) {
  return useReadContract({
    address: FACTORY_ADDRESS,
    abi: FACTORY_ABI,
    functionName: "estimateCost",
    args: [sold, amount],
    query: { enabled: amount > 0n },
  });
}

// ── Write: create token ───────────────────────────────────────
export function useCreateToken() {
  const { writeContractAsync, isPending, data: hash } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } =
    useWaitForTransactionReceipt({ hash });

  const create = (params: {
    name: string;
    symbol: string;
    imageURI: string;
    description: string;
    fee: bigint;
  }) =>
    writeContractAsync({
      address: FACTORY_ADDRESS,
      abi: FACTORY_ABI,
      functionName: "create",
      args: [params.name, params.symbol, params.imageURI, params.description],
      value: params.fee,
    });

  return { create, isPending, isConfirming, isSuccess, hash };
}

// ── Write: buy tokens ─────────────────────────────────────────
export function useBuyTokens() {
  const { writeContractAsync, isPending, data: hash } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } =
    useWaitForTransactionReceipt({ hash });

  const buy = (params: {
    token: `0x${string}`;
    amount: bigint;
    value: bigint;
    maxCost?: bigint;
  }) =>
    writeContractAsync({
      address: FACTORY_ADDRESS,
      abi: FACTORY_ABI,
      functionName: "buy",
      args: [params.token, params.amount, params.maxCost ?? 0n],
      value: params.value,
    });

  return { buy, isPending, isConfirming, isSuccess, hash };
}

// ── Write: deposit (graduate) ─────────────────────────────────
export function useDepositToken() {
  const { writeContractAsync, isPending, data: hash } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } =
    useWaitForTransactionReceipt({ hash });

  const deposit = (token: `0x${string}`) =>
    writeContractAsync({
      address: FACTORY_ADDRESS,
      abi: FACTORY_ABI,
      functionName: "deposit",
      args: [token],
    });

  return { deposit, isPending, isConfirming, isSuccess };
}


export function useFee() {
  return useReadContract({
    address: FACTORY_ADDRESS,
    abi: FACTORY_ABI,
    functionName: "fee",
  });
}
export function useSale(token: `0x${string}` | undefined) {
  return useReadContract({
    address: FACTORY_ADDRESS,
    abi: FACTORY_ABI,
    functionName: "getSale",
    args: token ? [token] : undefined,
    query: {
      enabled: !!token,
      refetchInterval: 15000,
    },
  });
}