"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface Props {
  currentSold: bigint;
}

export function BondingCurveChart({ currentSold }: Props) {
  // Generate curve data points
  const data = Array.from({ length: 51 }, (_, i) => {
    const sold  = i * 10_000; // tokens (not wei for display)
    const floor = 0.0001;
    const step  = 0.0001;
    const inc   = 10_000;
    const price = floor + step * Math.floor(sold / inc);

    return {
      sold,
      price: parseFloat(price.toFixed(6)),
      isCurrent: sold <= Number(currentSold) / 1e18,
    };
  });

  const currentSoldNum = Number(currentSold) / 1e18;

  return (
    <div className="bg-[#111] border border-[#1e1e1e] rounded-lg p-4">
      <h3 className="text-sm font-mono text-[#666] mb-4">
        bonding curve / price discovery
      </h3>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
          <defs>
            <linearGradient id="curveGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#00ff94" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#00ff94" stopOpacity={0}   />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="sold"
            tick={{ fontSize: 9, fill: "#444" }}
            tickFormatter={(v) => `${v / 1000}k`}
          />
          <YAxis
            tick={{ fontSize: 9, fill: "#444" }}
            tickFormatter={(v) => `${v.toFixed(4)}`}
          />
          <Tooltip
            contentStyle={{
              background: "#1a1a1a",
              border: "1px solid #333",
              borderRadius: 4,
              fontSize: 11,
            }}
            formatter={(v: number) => [`${v} ETH`, "price"]}
            labelFormatter={(l) => `${l.toLocaleString()} tokens sold`}
          />
          <Area
            type="stepAfter"
            dataKey="price"
            stroke="#00ff94"
            strokeWidth={2}
            fill="url(#curveGrad)"
          />
        </AreaChart>
      </ResponsiveContainer>
      <p className="text-[10px] font-mono text-[#444] mt-2">
        current position:{" "}
        <span className="text-[#00ff94]">
          {currentSoldNum.toLocaleString()} tokens sold
        </span>
      </p>
    </div>
  );
}