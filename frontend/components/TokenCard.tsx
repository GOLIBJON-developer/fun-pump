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
  const shortAddr      = `${sale.creator.slice(0, 6)}...${sale.creator.slice(-4)}`;

  return (
    <Link href={`/token/${sale.token}`} prefetch={true} >
      <article className="bg-[#111] border border-[#1e1e1e] rounded-lg overflow-hidden hover:border-[#333] hover:bg-[#131313] transition-all duration-150 cursor-pointer group">
        {/* Image */}
        <div className="relative aspect-square bg-[#0d0d0d] overflow-hidden">
          <img
            src={ipfsToHttp(sale.imageURI)}
            alt={sale.name}
            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
            onError={(e) => {
              const img = e.target as HTMLImageElement;
              img.onerror = null;
              img.src = "/placeholder.png";
            }}
          />
          {/* Badge */}
          <div className="absolute top-2 right-2">
            {sale.isOpen ? (
              <span className="flex items-center gap-1 bg-black/70 text-[#00ff94] text-[10px] px-2 py-0.5 rounded border border-[#00ff94]/20">
                <span className="live-dot inline-block w-1.5 h-1.5 rounded-full bg-[#00ff94]" />
                LIVE
              </span>
            ) : (
              <span className="bg-black/70 text-[#ffd700] text-[10px] px-2 py-0.5 rounded border border-[#ffd700]/20">
                DONE
              </span>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-sm text-white truncate group-hover:text-[#00ff94] transition-colors">
              {sale.name}
            </span>
          </div>

          <p className="text-[#555] text-[11px]">by {shortAddr}</p>

          {/* Progress */}
          <div>
            <div className="flex justify-between text-[10px] text-[#444] mb-1">
              <span>bonding curve</span>
              <span className="text-[#00ff94]">{progress.toFixed(1)}%</span>
            </div>
            <div className="h-1 bg-[#1a1a1a] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#00ff94] rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="flex justify-between text-[10px] text-[#444]">
            <span>{parseFloat(formatEther(sale.raised)).toFixed(4)} ETH</span>
            <span>{(Number(sale.sold) / 1e18).toLocaleString()} sold</span>
          </div>
        </div>
      </article>
    </Link>
  );
}
