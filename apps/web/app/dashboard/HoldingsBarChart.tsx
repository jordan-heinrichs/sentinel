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
  LabelList,
  Cell,
} from "recharts";

export type Holding = {
  chain: string;      // e.g. "base" | "sol" | "ethereum"
  symbol: string;     // e.g. "ETH" | "USDC"
  quantity: number;
  usdValue: number;
};

export type Snapshot = {
  asOf: string;       // ISO string
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

// Uses theme-friendly CSS vars if you have them; otherwise falls back to reasonable defaults.
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
  label: string;     // x-axis label
  usdValue: number;
  quantity: number;
  chain?: string;
  symbol: string;
};

function buildRows(snapshot: Snapshot, mode: Mode): Row[] {
  const holdings = snapshot.holdings ?? [];

  if (mode === "merged") {
    // Merge by symbol across chains
    const map = new Map<string, Row>();

    for (const h of holdings) {
      const symbol = norm(h.symbol);
      const usdValue = Number(h.usdValue ?? 0);
      const quantity = Number(h.quantity ?? 0);
      if (!symbol || !Number.isFinite(usdValue) || usdValue <= 0) continue;

      const existing = map.get(symbol);
      if (!existing) {
        map.set(symbol, {
          key: symbol,
          label: symbol,
          usdValue,
          quantity,
          symbol,
        });
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
      return {
        key: label,
        label,
        usdValue,
        quantity,
        chain,
        symbol,
      } as Row;
    })
    .filter((d) => Number.isFinite(d.usdValue) && d.usdValue > 0 && d.label.includes("@"))
    .sort((a, b) => b.usdValue - a.usdValue);
}

export function HoldingsBarChart({
  snapshot,
  height = 280,
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

  const total = useMemo(
    () => data.reduce((sum, d) => sum + (d.usdValue || 0), 0),
    [data]
  );

  if (!snapshot) {
    return (
      <div className="rounded-2xl border p-4">
        <div className="text-sm text-muted-foreground">No snapshot loaded.</div>
      </div>
    );
  }

  if (!snapshot.holdings?.length) {
    return (
      <div className="rounded-2xl border p-4">
        <div className="text-lg font-semibold">Holdings (USD)</div>
        <div className="mt-1 text-sm text-muted-foreground">Snapshot has no holdings.</div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="text-lg font-semibold">Holdings (USD)</div>
          <div className="text-xs text-muted-foreground">
            asOf:{" "}
            {Number.isFinite(Date.parse(snapshot.asOf))
              ? new Date(snapshot.asOf).toLocaleString()
              : snapshot.asOf}
          </div>

          <div className="mt-2 inline-flex rounded-xl border p-1 text-xs">
            <button
              type="button"
              className={`rounded-lg px-2 py-1 ${
                mode === "byChain" ? "bg-muted font-semibold" : "text-muted-foreground"
              }`}
              onClick={() => setMode("byChain")}
            >
              By chain
            </button>
            <button
              type="button"
              className={`rounded-lg px-2 py-1 ${
                mode === "merged" ? "bg-muted font-semibold" : "text-muted-foreground"
              }`}
              onClick={() => setMode("merged")}
            >
              Merged
            </button>
          </div>
        </div>

        <div className="text-sm text-muted-foreground">
          Total: <span className="font-medium text-foreground">{formatUsd(total)}</span>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="text-sm text-muted-foreground">No positive USD values to chart.</div>
      ) : (
        <div style={{ width: "100%", height }}>
          <ResponsiveContainer>
            <BarChart data={data} margin={{ top: 16, right: 16, left: 0, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                angle={-18}
                textAnchor="end"
                interval={0}
                height={70}
                tick={{ fontSize: 12 }}
              />
              <YAxis tickFormatter={formatUsdTick} />
              <Tooltip
                formatter={(value: any) => [formatUsd(Number(value)), "USD Value"]}
                labelFormatter={(label) => String(label)}
                contentStyle={{ borderRadius: 12 }}
                // Add quantity + chain info in tooltip body via "label" row lookup:
                // (Recharts doesn't pass the whole datum into labelFormatter cleanly)
              />
              <Bar dataKey="usdValue" radius={[10, 10, 0, 0]}>
                {mode === "byChain"
                  ? data.map((d) => (
                      <Cell key={d.key} fill={getChainColor(d.chain ?? "")} />
                    ))
                  : null}

                <LabelList
                  dataKey="usdValue"
                  position="top"
                  formatter={(v: any) => formatUsd(Number(v))}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Optional: small legend when in byChain mode */}
      {mode === "byChain" && (
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
          {Array.from(new Set(data.map((d) => chainKey(d.chain ?? "unknown")))).map((c) => (
            <span key={c} className="inline-flex items-center gap-2 rounded-full border px-2 py-1">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: getChainColor(c) }}
              />
              {c}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
