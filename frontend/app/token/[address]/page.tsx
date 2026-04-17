"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { formatEther, parseEther } from "viem";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
  useTokenSale,
  useEstimateCost,
  useBuyTokens,
  useDepositToken,
} from "@/hooks/useFactory";
import { BondingCurveChart } from "@/components/BondingCurveChart";
import { ipfsToHttp, TARGET_ETH, TOKEN_LIMIT } from "@/lib/config";

export default function TokenPage() {
  const params = useParams<{ address: string }>();
  const addr   = params.address as `0x${string}`;

  const { isConnected, address: userAddr } = useAccount();

  const { data: sale, refetch } = useTokenSale(addr);
  const [amountInput, setAmountInput]    = useState("100");

  const amountBigInt = (() => {
    try { return parseEther(amountInput); }
    catch { return 0n; }
  })();

  const { data: estimatedCost } = useEstimateCost(
    sale?.sold ?? 0n,
    amountBigInt
  );

  const { buy, isPending: isBuying, isConfirming: isBuyConfirming } = useBuyTokens();
  const { deposit, isPending: isDepositing } = useDepositToken();

  const [buyError,  setBuyError]  = useState("");
  const [buySuccess, setBuySuccess] = useState(false);

  if (!sale) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="font-mono text-[#444] text-sm">loading...</div>
      </div>
    );
  }

  const progressRaised = Number((sale.raised * 10000n) / TARGET_ETH)  / 100;
  const progressSold   = Number((sale.sold   * 10000n) / TOKEN_LIMIT) / 100;
  const progress       = Math.min(Math.max(progressRaised, progressSold), 100);
  const isCreator      = userAddr?.toLowerCase() === sale.creator.toLowerCase();

  const handleBuy = async () => {
    if (!estimatedCost || amountBigInt === 0n) return;
    setBuyError("");
    try {
      await buy({ token: addr, amount: amountBigInt, value: estimatedCost });
      setBuySuccess(true);
      refetch();
    } catch (e: unknown) {
      setBuyError(e instanceof Error ? e.message : "buy failed");
    }
  };

  const handleDeposit = async () => {
    try {
      await deposit(addr);
      refetch();
    } catch {}
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="grid md:grid-cols-2 gap-6">
        {/* Left: token info */}
        <div>
          <div className="bg-[#111] border border-[#1e1e1e] rounded-lg overflow-hidden mb-4">
            <img
              src={ipfsToHttp(sale.imageURI)}
              alt={sale.name}
              className="w-full aspect-video object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/placeholder.png";
              }}
            />
            <div className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-xl font-bold text-white">{sale.name}</h1>
                {sale.isOpen ? (
                  <span className="text-[10px] bg-[#00ff94]/10 text-[#00ff94] border border-[#00ff94]/20 px-2 py-0.5 rounded font-mono">
                    LIVE
                  </span>
                ) : (
                  <span className="text-[10px] bg-[#ffd700]/10 text-[#ffd700] border border-[#ffd700]/20 px-2 py-0.5 rounded font-mono">
                    GRADUATED
                  </span>
                )}
              </div>

              <div className="font-mono text-xs text-[#555] space-y-1">
                <p>creator: {sale.creator.slice(0,6)}...{sale.creator.slice(-4)}</p>
                <p>contract: {addr.slice(0,6)}...{addr.slice(-4)}</p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="bg-[#111] border border-[#1e1e1e] rounded-lg p-4 mb-4">
            <div className="grid grid-cols-2 gap-4 font-mono text-xs mb-4">
              <div>
                <p className="text-[#555] mb-1">raised</p>
                <p className="text-[#00ff94] text-lg font-bold">
                  {parseFloat(formatEther(sale.raised)).toFixed(4)} ETH
                </p>
                <p className="text-[#444]">of 3 ETH target</p>
              </div>
              <div>
                <p className="text-[#555] mb-1">sold</p>
                <p className="text-white text-lg font-bold">
                  {(Number(sale.sold) / 1e18).toLocaleString()}
                </p>
                <p className="text-[#444]">of 500,000 tokens</p>
              </div>
            </div>

            {/* Progress */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-mono text-[#555]">
                <span>graduation progress</span>
                <span className="text-[#00ff94]">{progress.toFixed(2)}%</span>
              </div>
              <div className="h-2 bg-[#1a1a1a] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#00ff94] to-[#00cc76] rounded-full transition-all duration-700"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>

          {/* Bonding curve chart */}
          <BondingCurveChart currentSold={sale.sold} />
        </div>

        {/* Right: buy panel */}
        <div>
          <div className="bg-[#111] border border-[#1e1e1e] rounded-lg p-5 sticky top-20">
            <h2 className="font-bold text-sm mb-4 font-mono text-[#666]">
              {sale.isOpen ? "[ buy tokens ]" : "[ sale ended ]"}
            </h2>

            {!isConnected ? (
              <div className="text-center py-6">
                <p className="text-[#555] text-sm mb-4 font-mono">
                  connect to buy
                </p>
                <ConnectButton />
              </div>
            ) : sale.isOpen ? (
              <div className="space-y-4">
                {/* Amount input */}
                <div>
                  <label className="text-xs font-mono text-[#555] block mb-2">
                    amount (tokens)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={amountInput}
                      onChange={(e) => setAmountInput(e.target.value)}
                      min="1"
                      max="10000"
                      className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2.5 text-sm text-white focus:border-[#00ff94] transition-colors pr-16"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#444] font-mono">
                      tokens
                    </span>
                  </div>

                  {/* Quick select */}
                  <div className="flex gap-2 mt-2">
                    {["100", "500", "1000", "5000"].map((v) => (
                      <button
                        key={v}
                        onClick={() => setAmountInput(v)}
                        className="text-[10px] font-mono text-[#555] bg-[#1a1a1a] border border-[#2a2a2a] px-2 py-1 rounded hover:border-[#00ff94]/40 hover:text-[#00ff94] transition-colors"
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cost estimate */}
                <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded p-3 font-mono text-xs space-y-1">
                  <div className="flex justify-between text-[#555]">
                    <span>price per token</span>
                    <span className="text-white">
                      {sale.sold !== undefined
                        ? (
                            (Number(sale.sold) / 1e4 / 1e14 +
                              0.0001) *
                            1e0
                          ).toFixed(6)
                        : "..."}{" "}
                      ETH
                    </span>
                  </div>
                  <div className="flex justify-between text-[#555]">
                    <span>total cost</span>
                    <span className="text-[#00ff94] font-bold">
                      {estimatedCost
                        ? parseFloat(formatEther(estimatedCost)).toFixed(6)
                        : "..."}{" "}
                      ETH
                    </span>
                  </div>
                </div>

                {buyError && (
                  <p className="text-[#ff4444] text-xs font-mono bg-[#ff4444]/10 border border-[#ff4444]/20 rounded px-3 py-2">
                    {buyError.slice(0, 100)}
                  </p>
                )}

                {buySuccess && (
                  <p className="text-[#00ff94] text-xs font-mono bg-[#00ff94]/10 border border-[#00ff94]/20 rounded px-3 py-2">
                    ✓ tokens purchased!
                  </p>
                )}

                <button
                  onClick={handleBuy}
                  disabled={isBuying || isBuyConfirming || !estimatedCost}
                  className="w-full bg-[#00ff94] text-black font-bold py-3 rounded text-sm hover:bg-[#00cc76] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isBuying
                    ? "confirm in wallet..."
                    : isBuyConfirming
                    ? "confirming..."
                    : "buy tokens"}
                </button>

                <p className="text-[10px] text-[#333] font-mono text-center">
                  excess ETH is automatically refunded
                </p>
              </div>
            ) : (
              /* Sale ended — show deposit for creator */
              <div className="space-y-4">
                <div className="text-center py-4">
                  <div className="text-[#ffd700] text-3xl mb-2">🎓</div>
                  <p className="text-sm font-bold text-white mb-1">
                    bonding curve complete!
                  </p>
                  <p className="text-xs font-mono text-[#555]">
                    {parseFloat(formatEther(sale.raised)).toFixed(4)} ETH raised
                  </p>
                </div>

                {isCreator && (
                  <button
                    onClick={handleDeposit}
                    disabled={isDepositing}
                    className="w-full bg-[#ffd700] text-black font-bold py-3 rounded text-sm hover:bg-yellow-400 transition-colors disabled:opacity-40"
                  >
                    {isDepositing ? "graduating..." : "graduate token (claim funds)"}
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