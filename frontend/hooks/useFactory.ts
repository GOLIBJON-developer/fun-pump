import {
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  usePublicClient,
} from "wagmi";
import { parseEther, formatEther } from "viem";
import { FACTORY_ABI } from "@/lib/abis";
import { FACTORY_ADDRESS } from "@/lib/config";
import { useState, useEffect } from "react";

export interface TokenSale {
  token:    `0x${string}`;
  name:     string;
  imageURI: string;
  creator:  `0x${string}`;
  sold:     bigint;
  raised:   bigint;
  isOpen:   boolean;
}

// ── Read: all tokens paginated ────────────────────────────────────
export function useAllTokenSales(page = 0, limit = 20) {
  return useReadContract({
    address: FACTORY_ADDRESS,
    abi:     FACTORY_ABI,
    functionName: "getTokensPaginated",
    args: [BigInt(page * limit), BigInt(limit)],
    query: { refetchInterval: 5000 },
  });
}

// ── Read: single token sale ───────────────────────────────────────
export function useTokenSale(tokenAddress: `0x${string}` | undefined) {
  return useReadContract({
    address: FACTORY_ADDRESS,
    abi:     FACTORY_ABI,
    functionName: "tokenToSale",
    args: tokenAddress ? [tokenAddress] : undefined,
    query: {
      enabled: !!tokenAddress,
      refetchInterval: 3000,
    },
  });
}

// ── Read: total token count ───────────────────────────────────────
export function useTotalTokens() {
  return useReadContract({
    address: FACTORY_ADDRESS,
    abi:     FACTORY_ABI,
    functionName: "totalTokens",
    query: { refetchInterval: 5000 },
  });
}

// ── Read: creation fee ────────────────────────────────────────────
export function useCreationFee() {
  return useReadContract({
    address: FACTORY_ADDRESS,
    abi:     FACTORY_ABI,
    functionName: "fee",
  });
}

// ── Read: estimate buy cost ───────────────────────────────────────
export function useEstimateCost(sold: bigint, amount: bigint) {
  return useReadContract({
    address: FACTORY_ADDRESS,
    abi:     FACTORY_ABI,
    functionName: "estimateCost",
    args: [sold, amount],
    query: { enabled: amount > 0n },
  });
}

// ── Write: create token ───────────────────────────────────────────
export function useCreateToken() {
  const { writeContractAsync, isPending, data: hash } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const create = async ({
    name,
    symbol,
    imageURI,
    description,
    fee,
  }: {
    name:        string;
    symbol:      string;
    imageURI:    string;
    description: string;
    fee:         bigint;
  }) => {
    return writeContractAsync({
      address: FACTORY_ADDRESS,
      abi:     FACTORY_ABI,
      functionName: "create",
      args: [name, symbol, imageURI, description],
      value: fee,
    });
  };

  return { create, isPending, isConfirming, isSuccess, hash };
}

// ── Write: buy tokens ─────────────────────────────────────────────
export function useBuyTokens() {
  const { writeContractAsync, isPending, data: hash } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const buy = async ({
    token,
    amount,
    value,
  }: {
    token:  `0x${string}`;
    amount: bigint;
    value:  bigint;
  }) => {
    return writeContractAsync({
      address: FACTORY_ADDRESS,
      abi:     FACTORY_ABI,
      functionName: "buy",
      args: [token, amount],
      value,
    });
  };

  return { buy, isPending, isConfirming, isSuccess, hash };
}

// ── Write: deposit (graduate token) ──────────────────────────────
export function useDepositToken() {
  const { writeContractAsync, isPending, data: hash } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const deposit = async (token: `0x${string}`) => {
    return writeContractAsync({
      address: FACTORY_ADDRESS,
      abi:     FACTORY_ABI,
      functionName: "deposit",
      args: [token],
    });
  };

  return { deposit, isPending, isConfirming, isSuccess };
}