"use client";

import Link from "next/link";
import { useTokensPaginated, useTotalTokens } from "@/hooks/useFactory";
import { TokenCard } from "@/components/TokenCard";

function SkeletonCard() {
  return (
    <div className="bg-[#111] border border-[#1e1e1e] rounded-lg overflow-hidden animate-pulse">
      <div className="aspect-square bg-[#1a1a1a]" />
      <div className="p-3 space-y-2">
        <div className="h-3 bg-[#1a1a1a] rounded w-2/3" />
        <div className="h-2 bg-[#1a1a1a] rounded w-1/3" />
        <div className="h-1 bg-[#1a1a1a] rounded-full" />
      </div>
    </div>
  );
}

export default function HomePage() {
  const { data: sales, isLoading } = useTokensPaginated(0, 50);
  const { data: total }            = useTotalTokens();

  const list = sales ? [...sales].reverse() : [];

  return (
    <div>
      {/* Hero */}
      <div className="py-14 text-center">
        <h1 className="text-5xl font-bold mb-3 tracking-tighter">
          <span className="text-[#00ff94]">pump</span>clone
        </h1>
        <p className="text-[#555] text-sm mb-8 max-w-sm mx-auto">
          launch your meme coin via bonding curve.
          <br />
          fair launch — no presale, no team allocation.
        </p>
        <Link
          href="/create"
          className="inline-block bg-[#00ff94] text-black font-bold px-8 py-3 rounded text-sm hover:bg-[#00cc76] transition-colors"
        >
          [start a new coin]
        </Link>
      </div>

      {/* Stats */}
      <div className="flex flex-wrap gap-x-8 gap-y-2 border-y border-[#1a1a1a] py-3 mb-8 text-[11px] text-[#444]">
        <span>
          tokens:{" "}
          <span className="text-[#00ff94]">{total?.toString() ?? "—"}</span>
        </span>
        <span>
          network: <span className="text-[#00ff94]">sepolia testnet</span>
        </span>
        <span>
          target: <span className="text-[#00ff94]">3 ETH</span>
        </span>
        <span>
          limit: <span className="text-[#00ff94]">500,000 tokens</span>
        </span>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : list.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {list.map((sale) => (
            <TokenCard key={sale.token} sale={sale} />
          ))}
        </div>
      ) : (
        <div className="text-center py-24 text-[#333]">
          <p className="text-lg mb-2">no tokens yet.</p>
          <Link
            href="/create"
            className="text-sm text-[#00ff94] hover:underline"
          >
            be the first to launch →
          </Link>
        </div>
      )}
    </div>
  );
}
