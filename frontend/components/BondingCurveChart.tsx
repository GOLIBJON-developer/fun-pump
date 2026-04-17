"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";

interface Props {
  currentSold: bigint;
}

const FLOOR     = 0.0001;
const STEP      = 0.0001;
const INCREMENT = 10_000;

function getCost(sold: number): number {
  return FLOOR + STEP * Math.floor(sold / INCREMENT);
}

export function BondingCurveChart({ currentSold }: Props) {
  const data = Array.from({ length: 51 }, (_, i) => ({
    sold:  i * 10_000,
    price: parseFloat(getCost(i * 10_000).toFixed(6)),
  }));

  const currentSoldNum = Math.floor(Number(currentSold) / 1e18);

  return (
    <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-4">
      <p className="text-[11px] text-[#444] mb-3">bonding curve</p>
      <ResponsiveContainer width="100%" height={160}>
        <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#00ff94" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#00ff94" stopOpacity={0}   />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="sold"
            tick={{ fontSize: 9, fill: "#444" }}
            tickFormatter={(v) => `${v / 1000}k`}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 9, fill: "#444" }}
            tickFormatter={(v) => `${v.toFixed(4)}`}
            axisLine={false}
            tickLine={false}
            width={50}
          />
          <Tooltip
            contentStyle={{
              background: "#1a1a1a",
              border: "1px solid #333",
              borderRadius: 4,
              fontSize: 11,
              fontFamily: "monospace",
            }}
            formatter={(v: number) => [`${v} ETH`, "price/token"]}
            labelFormatter={(l) => `${Number(l).toLocaleString()} sold`}
          />
          <ReferenceLine
            x={Math.floor(currentSoldNum / 10_000) * 10_000}
            stroke="#00ff94"
            strokeWidth={1}
            strokeDasharray="3 3"
          />
          <Area
            type="stepAfter"
            dataKey="price"
            stroke="#00ff94"
            strokeWidth={1.5}
            fill="url(#grad)"
          />
        </AreaChart>
      </ResponsiveContainer>
      <p className="text-[10px] text-[#333] mt-2">
        current:{" "}
        <span className="text-[#00ff94]">
          {currentSoldNum.toLocaleString()} tokens sold
        </span>
      </p>
    </div>
  );
}
