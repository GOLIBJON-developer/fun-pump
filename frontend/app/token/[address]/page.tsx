"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { formatEther, parseEther } from "viem";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useSale, useEstimateCost, useBuyTokens, useDepositToken } from "@/hooks/useFactory";
import { BondingCurveChart } from "@/components/BondingCurveChart";
import { ipfsToHttp, TARGET_ETH, TOKEN_LIMIT } from "@/lib/config";

const QUICK_AMOUNTS = ["100", "500", "1000", "5000"];

export default function TokenPage() {
  const { address }            = useParams<{ address: string }>();
  const tokenAddr              = address as `0x${string}`;
  const { isConnected, address: userAddr } = useAccount();

  const { data: sale, refetch } = useSale(tokenAddr);

  const [amountInput, setAmountInput] = useState("100");
  const [buyError,    setBuyError]    = useState("");
  const [buySuccess,  setBuySuccess]  = useState(false);

  const amountBigInt = (() => {
    try { return parseEther(amountInput); }
    catch { return 0n; }
  })();

  const { data: estimatedCost } = useEstimateCost(
    sale?.sold ?? 0n,
    amountBigInt
  );

  const { buy,     isPending: isBuying,     isConfirming: isBuyConfirm }     = useBuyTokens();
  const { deposit, isPending: isDepositing, isConfirming: isDepositConfirm } = useDepositToken();

  if (!sale) {
    return (
      <div className="flex items-center justify-center h-64 text-[#333] text-sm">
        loading...
      </div>
    );
  }

  const progressRaised = Number((sale.raised * 10000n) / TARGET_ETH)  / 100;
  const progressSold   = Number((sale.sold   * 10000n) / TOKEN_LIMIT) / 100;
  const progress       = Math.min(Math.max(progressRaised, progressSold), 100);
  const isCreator      = userAddr?.toLowerCase() === sale.creator.toLowerCase();
  const canDeposit     = !sale.isOpen && !sale.deposited && isCreator;

  const handleBuy = async () => {
    if (!estimatedCost || amountBigInt === 0n) return;
    setBuyError("");
    setBuySuccess(false);
    try {
      await buy({ token: tokenAddr, amount: amountBigInt, value: estimatedCost });
      setBuySuccess(true);
      refetch();
    } catch (e) {
      setBuyError(e instanceof Error ? e.message.slice(0, 120) : "buy failed");
    }
  };

  const handleDeposit = async () => {
    try {
      await deposit(tokenAddr);
      refetch();
    } catch {}
  };

  const costEth = estimatedCost
    ? parseFloat(formatEther(estimatedCost)).toFixed(6)
    : "...";

  return (
    <div className="max-w-4xl mx-auto">
      <div className="grid md:grid-cols-[1fr_320px] gap-6">
        {/* Left */}
        <div className="space-y-4">
          {/* Token header */}
          <div className="bg-[#111] border border-[#1e1e1e] rounded-lg overflow-hidden">
            <img
              src={ipfsToHttp(sale.imageURI)}
              alt={sale.name}
              className="w-full aspect-video object-cover"
              onError={(e) => {
                const img = e.target as HTMLImageElement;
                img.onerror = null;
                img.src = "/placeholder.png";
              }}
            />
            <div className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-xl font-bold">{sale.name}</h1>
                {sale.isOpen ? (
                  <span className="text-[10px] bg-[#00ff94]/10 text-[#00ff94] border border-[#00ff94]/20 px-2 py-0.5 rounded">
                    LIVE
                  </span>
                ) : (
                  <span className="text-[10px] bg-[#ffd700]/10 text-[#ffd700] border border-[#ffd700]/20 px-2 py-0.5 rounded">
                    {sale.deposited ? "GRADUATED" : "CLOSED"}
                  </span>
                )}
              </div>
              <div className="text-[11px] text-[#444] space-y-0.5">
                <p>creator: {sale.creator}</p>
                <p>contract: {tokenAddr}</p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="bg-[#111] border border-[#1e1e1e] rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-[11px] text-[#444] mb-1">raised</p>
                <p className="text-[#00ff94] text-xl font-bold">
                  {parseFloat(formatEther(sale.raised)).toFixed(4)} ETH
                </p>
                <p className="text-[10px] text-[#333]">of 3 ETH target</p>
              </div>
              <div>
                <p className="text-[11px] text-[#444] mb-1">sold</p>
                <p className="text-white text-xl font-bold">
                  {(Number(sale.sold) / 1e18).toLocaleString()}
                </p>
                <p className="text-[10px] text-[#333]">of 500,000 tokens</p>
              </div>
            </div>
            {/* Progress */}
            <div>
              <div className="flex justify-between text-[10px] text-[#444] mb-1">
                <span>graduation progress</span>
                <span className="text-[#00ff94]">{progress.toFixed(2)}%</span>
              </div>
              <div className="h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#00ff94] rounded-full transition-all duration-700"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>

          {/* Chart */}
          <BondingCurveChart currentSold={sale.sold} />
        </div>

        {/* Right: Buy panel */}
        <div>
          <div className="bg-[#111] border border-[#1e1e1e] rounded-lg p-5 sticky top-20">
            {!isConnected ? (
              <div className="text-center py-6">
                <p className="text-[#444] text-xs mb-4">connect to trade</p>
                <ConnectButton />
              </div>
            ) : sale.isOpen ? (
              <div className="space-y-4">
                <p className="text-[11px] text-[#555]">[ buy tokens ]</p>

                {/* Amount input */}
                <div>
                  <label className="text-[11px] text-[#444] block mb-1.5">
                    amount
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={amountInput}
                      onChange={(e) => setAmountInput(e.target.value)}
                      min="1"
                      max="10000"
                      className="w-full bg-[#0d0d0d] border border-[#222] rounded px-3 py-2.5 text-sm text-white focus:border-[#00ff94] transition-colors pr-14"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-[#444]">
                      tokens
                    </span>
                  </div>

                  {/* Quick select */}
                  <div className="flex gap-1.5 mt-2">
                    {QUICK_AMOUNTS.map((v) => (
                      <button
                        key={v}
                        onClick={() => setAmountInput(v)}
                        className="flex-1 text-[10px] text-[#444] bg-[#1a1a1a] border border-[#222] py-1 rounded hover:border-[#00ff94]/30 hover:text-[#00ff94] transition-colors"
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cost breakdown */}
                <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded p-3 text-[11px] space-y-1">
                  <div className="flex justify-between text-[#444]">
                    <span>total cost</span>
                    <span className="text-[#00ff94] font-bold">
                      {costEth} ETH
                    </span>
                  </div>
                  <div className="flex justify-between text-[#333]">
                    <span>excess ETH</span>
                    <span>auto-refunded</span>
                  </div>
                </div>

                {buyError && (
                  <p className="text-[#ff4444] text-[11px] bg-[#ff4444]/10 border border-[#ff4444]/20 rounded px-3 py-2">
                    {buyError}
                  </p>
                )}

                {buySuccess && (
                  <p className="text-[#00ff94] text-[11px] bg-[#00ff94]/10 border border-[#00ff94]/20 rounded px-3 py-2">
                    ✓ tokens purchased!
                  </p>
                )}

                <button
                  onClick={handleBuy}
                  disabled={isBuying || isBuyConfirm || !estimatedCost}
                  className="w-full bg-[#00ff94] text-black font-bold py-3 rounded text-sm hover:bg-[#00cc76] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isBuying
                    ? "confirm in wallet..."
                    : isBuyConfirm
                    ? "confirming..."
                    : "buy tokens"}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-center py-4">
                  <p className="text-2xl mb-2">
                    {sale.deposited ? "🎓" : "🔒"}
                  </p>
                  <p className="font-bold text-sm mb-1">
                    {sale.deposited
                      ? "token graduated!"
                      : "bonding curve complete"}
                  </p>
                  <p className="text-[11px] text-[#444]">
                    {parseFloat(formatEther(sale.raised)).toFixed(4)} ETH raised
                  </p>
                </div>

                {canDeposit && (
                  <button
                    onClick={handleDeposit}
                    disabled={isDepositing || isDepositConfirm}
                    className="w-full bg-[#ffd700] text-black font-bold py-3 rounded text-sm hover:bg-yellow-400 transition-colors disabled:opacity-40"
                  >
                    {isDepositing || isDepositConfirm
                      ? "graduating..."
                      : "graduate token (claim funds)"}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
