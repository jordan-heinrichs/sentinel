"use client";

import React, { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";

export type Holding = {
  chain: string; // e.g. "base" | "sol" | "ethereum"
  symbol: string; // e.g. "ETH" | "USDC"
  quantity: number;
  usdValue: number;
};

export type Snapshot = {
  asOf: string; // ISO string
  holdings: Holding[];
};

type Mode = "byChain" | "merged";

function formatUsd(n: number) {
  return n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function formatUsdTick(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return `${Math.round(n)}`;
}

function norm(s: string) {
  return (s ?? "").trim();
}

function chainKey(chain: string) {
  return norm(chain).toLowerCase();
}

// Uses theme-friendly CSS vars if you have them; otherwise falls back.
const CHAIN_COLORS: Record<string, string> = {
  base: "hsl(var(--chart-1, 215 90% 55%))",
  sol: "hsl(var(--chart-2, 160 84% 39%))",
  solana: "hsl(var(--chart-2, 160 84% 39%))",
  ethereum: "hsl(var(--chart-3, 262 83% 58%))",
  arbitrum: "hsl(var(--chart-4, 45 93% 47%))",
  optimism: "hsl(var(--chart-5, 0 84% 60%))",
  default: "hsl(var(--chart-1, 215 90% 55%))",
};

function getChainColor(chain: string) {
  const k = chainKey(chain);
  return CHAIN_COLORS[k] ?? CHAIN_COLORS.default;
}

type Row = {
  key: string;
  label: string; // x-axis label
  usdValue: number;
  quantity: number;
  chain?: string;
  symbol: string;
};

function buildRows(snapshot: Snapshot, mode: Mode): Row[] {
  const holdings = snapshot.holdings ?? [];

  if (mode === "merged") {
    const map = new Map<string, Row>();

    for (const h of holdings) {
      const symbol = norm(h.symbol);
      const usdValue = Number(h.usdValue ?? 0);
      const quantity = Number(h.quantity ?? 0);
      if (!symbol || !Number.isFinite(usdValue) || usdValue <= 0) continue;

      const existing = map.get(symbol);
      if (!existing) {
        map.set(symbol, { key: symbol, label: symbol, usdValue, quantity, symbol });
      } else {
        existing.usdValue += usdValue;
        existing.quantity += quantity;
      }
    }

    return Array.from(map.values()).sort((a, b) => b.usdValue - a.usdValue);
  }

  // byChain: keep SYMBOL@CHAIN distinct
  return holdings
    .map((h) => {
      const symbol = norm(h.symbol);
      const chain = norm(h.chain);
      const usdValue = Number(h.usdValue ?? 0);
      const quantity = Number(h.quantity ?? 0);
      const label = `${symbol}@${chain}`;
      return { key: label, label, usdValue, quantity, chain, symbol } as Row;
    })
    .filter((d) => Number.isFinite(d.usdValue) && d.usdValue > 0 && d.label.includes("@"))
    .sort((a, b) => b.usdValue - a.usdValue);
}

const CARD_STYLE: React.CSSProperties = {
  padding: 12,
  borderWidth: 4,
  background: "rgba(0,0,0,0.18)",
  width: "100%",
  maxWidth: "none",
  display: "block", // IMPORTANT: prevents shrink-to-fit
  boxSizing: "border-box",
};

export function HoldingsBarChart({
  snapshot,
  height = 260,
  defaultMode = "byChain",
}: {
  snapshot: Snapshot | null;
  height?: number;
  defaultMode?: Mode;
}) {
  const [mode, setMode] = useState<Mode>(defaultMode);

  const data = useMemo(() => {
    if (!snapshot?.holdings?.length) return [];
    return buildRows(snapshot, mode);
  }, [snapshot, mode]);

  const total = useMemo(() => data.reduce((sum, d) => sum + (d.usdValue || 0), 0), [data]);

  if (!snapshot) {
    return (
      <div className="pixel-card" style={CARD_STYLE}>
        <div className="pixel-sub" style={{ margin: 0 }}>
          No snapshot loaded.
        </div>
      </div>
    );
  }

  if (!snapshot.holdings?.length) {
    return (
      <div className="pixel-card" style={CARD_STYLE}>
        <div className="pixel-title" style={{ fontSize: 14, margin: 0 }}>
          Holdings (USD)
        </div>
        <div className="pixel-sub" style={{ margin: 0, opacity: 0.85 }}>
          Snapshot has no holdings.
        </div>
      </div>
    );
  }

  return (
    <div className="pixel-card" style={CARD_STYLE}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          gap: 12,
          marginBottom: 8,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div className="pixel-title" style={{ fontSize: 14, margin: 0 }}>
            Holdings (USD)
          </div>
          <div className="pixel-sub" style={{ margin: 0, opacity: 0.85 }} suppressHydrationWarning>
            asOf:{" "}
            {Number.isFinite(Date.parse(snapshot.asOf))
              ? new Date(snapshot.asOf).toLocaleString()
              : snapshot.asOf}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div className="pixel-tag">TOTAL</div>
          <div className="pixel-title" style={{ fontSize: 14, margin: 0 }}>
            {formatUsd(total)}
          </div>

          <div style={{ display: "flex", gap: 6 }}>
            <button
              type="button"
              className="pixel-btn-sm"
              onClick={() => setMode("byChain")}
              style={{ opacity: mode === "byChain" ? 1 : 0.65, padding: "6px 10px" }}
            >
              BY CHAIN
            </button>
            <button
              type="button"
              className="pixel-btn-sm"
              onClick={() => setMode("merged")}
              style={{ opacity: mode === "merged" ? 1 : 0.65, padding: "6px 10px" }}
            >
              MERGED
            </button>
          </div>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="pixel-sub" style={{ margin: 0 }}>
          No positive USD values to chart.
        </div>
      ) : (
        <div
          style={{
            width: "100%",
            height,
            minHeight: height,
            display: "block",
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              barCategoryGap={18}
              data={data}
              margin={{ top: 10, right: 12, left: 0, bottom: 44 }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.18} />
              <XAxis
                dataKey="label"
                angle={-18}
                textAnchor="end"
                interval={0}
                height={56}
                tick={{ fontSize: 10 }}
              />
              <YAxis tickFormatter={formatUsdTick} tick={{ fontSize: 10 }} width={42} />
              <Tooltip
                cursor={false} // 🔥 removes the gray hover band
                formatter={(value: any) => [`${formatUsd(Number(value))}`, "USD"]}
                labelFormatter={(label: any) => {
                    const [symbol, chain] = String(label).split("@");
                    return chain ? `${symbol} (${chain.toUpperCase()})` : label;
                }}

                contentStyle={{
                    borderRadius: 0,
                    border: "4px solid var(--border)",
                    background: "rgba(0,0,0,0.9)",
                    color: "var(--text)",
                    fontFamily: "var(--font-pixel), system-ui, sans-serif",
                    fontSize: 10,
                    padding: "8px 10px",
                }}
                itemStyle={{
                    color: "var(--text)",
                }}
                labelStyle={{
                    color: "var(--text)",
                    marginBottom: 4,
                }}
                />

              <Bar dataKey="usdValue" radius={[6, 6, 0, 0]}>
                {mode === "byChain"
                  ? data.map((d) => <Cell key={d.key} fill={getChainColor(d.chain ?? "")} />)
                  : null}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Legend */}
      {mode === "byChain" && data.length > 0 && (
        <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 8 }}>
          {Array.from(new Set(data.map((d) => chainKey(d.chain ?? "unknown")))).map((c) => (
            <span
              key={c}
              className="pixel-tag"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 10px",
              }}
            >
              <span
                style={{
                  width: 10,
                  height: 10,
                  border: "2px solid var(--border)",
                  background: getChainColor(c),
                  display: "inline-block",
                }}
              />
              {c.toUpperCase()}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
