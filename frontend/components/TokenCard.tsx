"use client";

import Link from "next/link";
import { formatEther } from "viem";
import { ipfsToHttp, TARGET_ETH, TOKEN_LIMIT } from "@/lib/config";
import type { TokenSale } from "@/hooks/useFactory";

interface Props {
  sale: TokenSale;
}

export function TokenCard({ sale }: Props) {
  const progressRaised = Number((sale.raised * 10000n) / TARGET_ETH) / 100;
  const progressSold   = Number((sale.sold   * 10000n) / TOKEN_LIMIT) / 100;
  const progress       = Math.min(Math.max(progressRaised, progressSold), 100);

  const imgSrc = ipfsToHttp(sale.imageURI);
  const shortAddr = `${sale.creator.slice(0, 6)}...${sale.creator.slice(-4)}`;

  return (
    <Link href={`/token/${sale.token}`}>
      <div className="bg-[#111] border border-[#1e1e1e] rounded-lg overflow-hidden hover:border-[#00ff94]/30 hover:bg-[#141414] transition-all duration-200 cursor-pointer group">
        {/* Image */}
        <div className="relative w-full aspect-square bg-[#0d0d0d]">
          <img
            src={imgSrc}
            alt={sale.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/placeholder.png";
            }}
          />
          {/* Status badge */}
          <div className="absolute top-2 right-2">
            {sale.isOpen ? (
              <span className="bg-[#00ff94]/20 text-[#00ff94] text-[10px] px-2 py-0.5 rounded font-mono border border-[#00ff94]/30">
                LIVE
              </span>
            ) : (
              <span className="bg-[#ffd700]/10 text-[#ffd700] text-[10px] px-2 py-0.5 rounded font-mono border border-[#ffd700]/20">
                GRADUATED
              </span>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="font-bold text-sm text-white group-hover:text-[#00ff94] transition-colors">
              {sale.name}
            </span>
          </div>

          <p className="text-[#666] text-xs mb-3 font-mono">
            by {shortAddr}
          </p>

          {/* Progress bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-[#555] font-mono">
              <span>bonding curve</span>
              <span className="text-[#00ff94]">{progress.toFixed(1)}%</span>
            </div>
            <div className="h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#00ff94] rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="flex justify-between mt-2 text-[10px] font-mono text-[#555]">
            <span>{parseFloat(formatEther(sale.raised)).toFixed(4)} ETH raised</span>
            <span>{(Number(sale.sold) / 1e18).toLocaleString()} sold</span>
          </div>
        </div>
      </div>
    </Link>
  );
}