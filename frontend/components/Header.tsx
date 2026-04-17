"use client";

import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";

export function Header() {
  return (
    <header className="border-b border-[#1e1e1e] bg-[#0a0a0a]/95 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="text-[#00ff94] font-bold text-xl tracking-tight group-hover:text-white transition-colors">
              pump
            </span>
            <span className="text-white font-bold text-xl tracking-tight">clone</span>
            <span className="text-[10px] text-[#666] border border-[#333] px-1.5 py-0.5 rounded ml-1">
              SEPOLIA
            </span>
          </Link>

          <nav className="hidden md:flex gap-6 text-sm">
            <Link href="/" className="text-[#999] hover:text-white transition-colors">
              [all tokens]
            </Link>
            <Link href="/create" className="text-[#00ff94] hover:text-white transition-colors font-medium">
              [launch token]
            </Link>
          </nav>
        </div>

        <ConnectButton
          showBalance={false}
          chainStatus="icon"
          accountStatus="address"
        />
      </div>
    </header>
  );
}