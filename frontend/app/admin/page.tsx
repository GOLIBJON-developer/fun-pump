"use client";

import { useState } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useBalance } from "wagmi";
import { parseEther, formatEther } from "viem";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { FACTORY_ABI } from "@/lib/abis";
import { FACTORY_ADDRESS, fmtEth, shortAddr } from "@/lib/config";
import { useTotalTokens } from "@/hooks/useFactory";


export default function AdminPage() {
  const { address, isConnected } = useAccount();

  const { data: owner }       = useReadContract({ address: FACTORY_ADDRESS, abi: FACTORY_ABI, functionName: "owner" });
  const { data: total }       = useTotalTokens();
  const { data: fee } = useReadContract({
  address: FACTORY_ADDRESS,
  abi: FACTORY_ABI,
  functionName: "fee",
});
  const { data: factoryBal, refetch: refetchBal } = useBalance({ address: FACTORY_ADDRESS });

  const isOwner = isConnected && owner && address?.toLowerCase() === (owner as string).toLowerCase();

  // ── Withdraw ──────────────────────────────────────────────────
  const [withdrawAmt, setWithdrawAmt] = useState("");
  const [withdrawErr, setWithdrawErr] = useState("");

  const { writeContractAsync: writeWithdraw, data: withdrawHash, isPending: isWithdrawPending } = useWriteContract();
  const { isLoading: isWithdrawConf, isSuccess: isWithdrawDone } = useWaitForTransactionReceipt({ hash: withdrawHash });

  async function handleWithdraw() {
    setWithdrawErr("");
    if (!withdrawAmt || parseFloat(withdrawAmt) <= 0) {
      setWithdrawErr("Enter a valid amount");
      return;
    }
    try {
      await writeWithdraw({
        address: FACTORY_ADDRESS,
        abi: FACTORY_ABI,
        functionName: "withdraw",
        args: [parseEther(withdrawAmt)],
      });
      setWithdrawAmt("");
      refetchBal();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "failed";
      setWithdrawErr(msg.length > 120 ? msg.slice(0, 120) + "…" : msg);
    }
  }

  // ── Transfer ownership ────────────────────────────────────────
  const [newOwner,    setNewOwner]    = useState("");
  const [ownerErr,    setOwnerErr]    = useState("");
  const [ownerConfirm, setOwnerConfirm] = useState(false);

  const { writeContractAsync: writeTransfer, data: transferHash, isPending: isTransferPending } = useWriteContract();
  const { isLoading: isTransferConf, isSuccess: isTransferDone } = useWaitForTransactionReceipt({ hash: transferHash });

  async function handleTransfer() {
    if (!ownerConfirm) { setOwnerConfirm(true); return; }
    setOwnerErr("");
    if (!newOwner.startsWith("0x") || newOwner.length !== 42) {
      setOwnerErr("Invalid address");
      setOwnerConfirm(false);
      return;
    }
    try {
      await writeTransfer({
        address: FACTORY_ADDRESS,
        abi: FACTORY_ABI,
        functionName: "transferOwnership",
        args: [newOwner as `0x${string}`],
      });
      setNewOwner("");
      setOwnerConfirm(false);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "failed";
      setOwnerErr(msg.length > 120 ? msg.slice(0, 120) + "…" : msg);
      setOwnerConfirm(false);
    }
  }

  const busyW = isWithdrawPending || isWithdrawConf;
  const busyT = isTransferPending || isTransferConf;

  // ── Not connected ─────────────────────────────────────────────
  if (!isConnected) {
    return (
      <div style={{ maxWidth: 480, margin: "80px auto", textAlign: "center" }}>
        <div className="mono" style={{ fontSize: 11, color: "var(--muted)", marginBottom: 16, letterSpacing: 3 }}>
          ADMIN
        </div>
        <p className="mono" style={{ color: "var(--muted)", fontSize: 13, marginBottom: 20 }}>
          connect owner wallet
        </p>
        <ConnectButton />
      </div>
    );
  }

  // ── Not owner ─────────────────────────────────────────────────
  if (!isOwner) {
    return (
      <div style={{ maxWidth: 480, margin: "80px auto", textAlign: "center" }}>
        <div className="mono" style={{ fontSize: 11, color: "var(--muted)", marginBottom: 16, letterSpacing: 3 }}>
          ADMIN
        </div>
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid rgba(255,68,68,0.2)",
            borderRadius: 10,
            padding: 32,
          }}
        >
          <div className="mono" style={{ fontSize: 13, color: "#ff6b6b", marginBottom: 8 }}>
            access denied
          </div>
          <div className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
            connected: {address ? shortAddr(address) : "—"}
          </div>
          <div className="mono" style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
            owner: {owner ? shortAddr(owner as string) : "…"}
          </div>
        </div>
      </div>
    );
  }

  // ── Owner dashboard ───────────────────────────────────────────
  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }} className="fade-up">
      {/* Title */}
      <div style={{ marginBottom: 28 }}>
        <div className="mono" style={{ fontSize: 11, color: "var(--muted)", letterSpacing: 3, marginBottom: 8 }}>
          ADMIN DASHBOARD
        </div>
        <h1 className="mono" style={{ fontSize: 22, fontWeight: 700, letterSpacing: -1 }}>
          <span style={{ color: "var(--accent)" }}>[</span>
          {" "}owner panel{" "}
          <span style={{ color: "var(--accent)" }}>]</span>
        </h1>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
        <StatBox label="factory balance" value={factoryBal ? `${parseFloat(formatEther(factoryBal.value)).toFixed(4)} ETH` : "…"} accent />
        <StatBox label="tokens launched" value={total?.toString() ?? "…"} />
        <StatBox label="creation fee"    value={fee ? `${fmtEth(fee, 3)} ETH` : "…"} />
      </div>

      {/* Owner info */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 10,
          padding: "12px 16px",
          marginBottom: 16,
        }}
      >
        <Row label="owner address" value={address ?? "—"} />
        <Row label="factory"       value={FACTORY_ADDRESS} />
      </div>

      {/* Withdraw */}
      <Section title="withdraw fees">
        <p className="mono" style={{ fontSize: 11, color: "var(--muted)", marginBottom: 14 }}>
          factory balance:{" "}
          <span style={{ color: "var(--accent)" }}>
            {factoryBal ? `${parseFloat(formatEther(factoryBal.value)).toFixed(4)} ETH` : "…"}
          </span>
        </p>

        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <input
            type="number"
            placeholder="0.0"
            value={withdrawAmt}
            onChange={(e) => setWithdrawAmt(e.target.value)}
            step="0.001"
            min="0"
            style={{ flex: 1, fontFamily: "var(--font-mono)" }}
          />
          <ActionButton
            onClick={handleWithdraw}
            busy={busyW}
            label="withdraw"
            busyLabel={isWithdrawPending ? "confirm…" : "waiting…"}
          />
        </div>

        {/* Quick amounts */}
        <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
          {["0.01", "0.1", "0.5", "1"].map((v) => (
            <button
              key={v}
              onClick={() => setWithdrawAmt(v)}
              className="mono"
              style={{
                fontSize: 10,
                padding: "3px 10px",
                borderRadius: 4,
                background: "var(--surface2)",
                border: "1px solid var(--border)",
                color: "var(--muted)",
                transition: "all 0.1s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(0,255,148,0.3)";
                (e.currentTarget as HTMLButtonElement).style.color = "var(--accent)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)";
                (e.currentTarget as HTMLButtonElement).style.color = "var(--muted)";
              }}
            >
              {v} ETH
            </button>
          ))}
          {factoryBal && factoryBal.value > 0n && (
            <button
              onClick={() => setWithdrawAmt(formatEther(factoryBal.value))}
              className="mono"
              style={{
                fontSize: 10,
                padding: "3px 10px",
                borderRadius: 4,
                background: "rgba(0,255,148,0.07)",
                border: "1px solid rgba(0,255,148,0.2)",
                color: "var(--accent)",
              }}
            >
              max
            </button>
          )}
        </div>

        {withdrawErr && <ErrorBox msg={withdrawErr} />}
        {isWithdrawDone && <SuccessBox msg="withdrawn successfully" />}
      </Section>

      {/* Transfer ownership */}
      <Section title="transfer ownership">
        <p className="mono" style={{ fontSize: 11, color: "#ff6b6b", marginBottom: 14 }}>
          ⚠ irreversible — double check the address
        </p>

        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <input
            placeholder="0x..."
            value={newOwner}
            onChange={(e) => { setNewOwner(e.target.value); setOwnerConfirm(false); }}
            style={{ flex: 1, fontFamily: "var(--font-mono)", fontSize: 12 }}
          />
          <ActionButton
            onClick={handleTransfer}
            busy={busyT}
            label={ownerConfirm ? "confirm?" : "transfer"}
            busyLabel={isTransferPending ? "confirm…" : "waiting…"}
            danger={ownerConfirm}
          />
        </div>

        {ownerConfirm && (
          <div
            className="mono"
            style={{
              fontSize: 11,
              color: "#ffd700",
              background: "rgba(255,215,0,0.05)",
              border: "1px solid rgba(255,215,0,0.15)",
              borderRadius: 6,
              padding: "8px 10px",
              marginBottom: 8,
            }}
          >
            click "confirm?" again to proceed · this cannot be undone
          </div>
        )}

        {ownerErr    && <ErrorBox   msg={ownerErr} />}
        {isTransferDone && <SuccessBox msg="ownership transferred" />}
      </Section>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────

function StatBox({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        padding: "12px 14px",
      }}
    >
      <div className="mono" style={{ fontSize: 10, color: "var(--muted)", marginBottom: 4 }}>{label}</div>
      <div className="mono" style={{ fontSize: 16, fontWeight: 700, color: accent ? "var(--accent)" : "var(--text)" }}>
        {value}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="mono"
      style={{
        display: "flex",
        justifyContent: "space-between",
        fontSize: 11,
        padding: "5px 0",
        borderBottom: "1px solid var(--border)",
        color: "var(--muted)",
        gap: 8,
      }}
    >
      <span style={{ flexShrink: 0 }}>{label}</span>
      <span style={{ color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis" }}>
        {value}
      </span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        padding: "16px 18px",
        marginBottom: 14,
      }}
    >
      <div
        className="mono"
        style={{
          fontSize: 11,
          color: "var(--muted)",
          marginBottom: 14,
          paddingBottom: 10,
          borderBottom: "1px solid var(--border)",
          letterSpacing: 1,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function ActionButton({
  onClick, busy, label, busyLabel, danger,
}: {
  onClick: () => void;
  busy: boolean;
  label: string;
  busyLabel: string;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className="mono"
      style={{
        background: busy
          ? "var(--surface2)"
          : danger
          ? "rgba(255,68,68,0.15)"
          : "var(--surface2)",
        color: busy
          ? "var(--muted)"
          : danger
          ? "#ff6b6b"
          : "var(--accent)",
        border: `1px solid ${busy ? "var(--border)" : danger ? "rgba(255,68,68,0.3)" : "rgba(0,255,148,0.25)"}`,
        borderRadius: 6,
        padding: "0 16px",
        height: 42,
        fontSize: 12,
        fontWeight: 700,
        whiteSpace: "nowrap",
        cursor: busy ? "not-allowed" : "pointer",
        transition: "all 0.15s",
      }}
    >
      {busy ? busyLabel : label}
    </button>
  );
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div
      className="mono"
      style={{
        background: "rgba(255,68,68,0.07)",
        border: "1px solid rgba(255,68,68,0.2)",
        borderRadius: 6,
        padding: "8px 10px",
        fontSize: 11,
        color: "#ff6b6b",
      }}
    >
      {msg}
    </div>
  );
}

function SuccessBox({ msg }: { msg: string }) {
  return (
    <div
      className="mono"
      style={{
        background: "rgba(0,255,148,0.07)",
        border: "1px solid rgba(0,255,148,0.2)",
        borderRadius: 6,
        padding: "8px 10px",
        fontSize: 11,
        color: "var(--accent)",
      }}
    >
      ✓ {msg}
    </div>
  );
}
