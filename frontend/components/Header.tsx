"use client";

import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useTotalTokens } from "@/hooks/useFactory";

export function Header() {
  const { data: total } = useTotalTokens();

  return (
    <header
      style={{
        background: "rgba(8,8,8,0.9)",
        borderBottom: "1px solid var(--border)",
        backdropFilter: "blur(12px)",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "0 16px",
          height: 56,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
            <span
              className="mono"
              style={{ color: "var(--accent)", fontWeight: 700, fontSize: 18, letterSpacing: -1 }}
            >
              PUMP
            </span>
            <span className="mono" style={{ color: "var(--text)", fontWeight: 700, fontSize: 18, letterSpacing: -1 }}>
              FUN
            </span>
            <span
              className="mono"
              style={{
                fontSize: 10,
                color: "var(--muted)",
                border: "1px solid var(--border2)",
                padding: "1px 5px",
                borderRadius: 3,
                marginLeft: 6,
              }}
            >
              SEPOLIA
            </span>
          </Link>

          <nav style={{ display: "flex", gap: 4 }}>
            <NavLink href="/">tokens</NavLink>
            <NavLink href="/create" accent>launch</NavLink>
            <NavLink href="/admin">admin</NavLink>
          </nav>
        </div>

        {/* Right */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {total !== undefined && (
            <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
              {total.toString()} launched
            </span>
          )}
          <ConnectButton showBalance={false} chainStatus="icon" accountStatus="address" />
        </div>
      </div>
    </header>
  );
}

function NavLink({
  href,
  children,
  accent,
}: {
  href: string;
  children: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <Link
      href={href}
      className="mono"
      style={{
        fontSize: 13,
        color: accent ? "var(--accent)" : "var(--muted)",
        textDecoration: "none",
        padding: "4px 10px",
        borderRadius: 4,
        transition: "color 0.15s, background 0.15s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = "var(--text)";
        e.currentTarget.style.background = "var(--surface2)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = accent ? "var(--accent)" : "var(--muted)";
        e.currentTarget.style.background = "transparent";
      }}
    >
      [{children}]
    </Link>
  );
}
