"use client";

import { useAllTokenSales, useTotalTokens } from "@/hooks/useFactory";
import { TokenCard } from "@/components/TokenCard";
import Link from "next/link";

export default function HomePage() {
  const { data: sales, isLoading } = useAllTokenSales(0, 50);
  const { data: total }            = useTotalTokens();

  return (
    <div>
      {/* Hero */}
      <div className="text-center py-12 mb-8">
        <h1 className="text-4xl md:text-5xl font-bold mb-3">
          <span className="text-[#00ff94]">pump</span>clone
        </h1>
        <p className="text-[#666] mb-6 font-mono text-sm">
          launch your meme coin. bonding curve. fair launch. no presale.
        </p>
        <Link
          href="/create"
          className="inline-block bg-[#00ff94] text-black font-bold px-8 py-3 rounded text-sm hover:bg-[#00cc76] transition-colors"
        >
          [start a new coin]
        </Link>
      </div>

      {/* Stats bar */}
      <div className="flex gap-6 border-y border-[#1e1e1e] py-3 mb-8 font-mono text-xs text-[#555]">
        <span>
          total tokens:{" "}
          <span className="text-[#00ff94]">{total?.toString() ?? "..."}</span>
        </span>
        <span>network: <span className="text-[#00ff94]">sepolia testnet</span></span>
        <span>target: <span className="text-[#00ff94]">3 ETH</span></span>
      </div>

      {/* Token grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="bg-[#111] border border-[#1e1e1e] rounded-lg overflow-hidden animate-pulse"
            >
              <div className="aspect-square bg-[#1a1a1a]" />
              <div className="p-3 space-y-2">
                <div className="h-3 bg-[#1a1a1a] rounded w-2/3" />
                <div className="h-2 bg-[#1a1a1a] rounded w-1/2" />
                <div className="h-1.5 bg-[#1a1a1a] rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ) : sales && sales.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {[...sales].reverse().map((sale) => (
            <TokenCard key={sale.token} sale={sale} />
          ))}
        </div>
      ) : (
        <div className="text-center py-24 text-[#444] font-mono">
          <p className="text-lg mb-2">no tokens yet.</p>
          <p className="text-sm">
            <Link href="/create" className="text-[#00ff94] hover:underline">
              be the first to launch one →
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}