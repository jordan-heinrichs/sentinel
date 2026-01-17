"use client";

import React, { useMemo, useState } from "react";

type DriftRow = {
  chain: "base" | "sol";
  corePct: number;
  targetCorePct: number;
  driftPct: number;
  coreDeltaUsd: number;
  usdcDeltaUsd: number;
  reason?: string;
};

type Suggestion = {
  chain: "base" | "sol";
  type: string;
  reason?: string;
  coreDeltaUsd?: number;
  usdcDeltaUsd?: number;
};

const DEFAULT_SNAPSHOT = `{
  "asOf": "${new Date().toISOString()}",
  "holdings": [
    { "chain": "base", "symbol": "USDC", "quantity": 600, "usdValue": 600 },
    { "chain": "base", "symbol": "ETH",  "quantity": 0.15, "usdValue": 500 },
    { "chain": "sol",  "symbol": "USDC", "quantity": 600, "usdValue": 600 },
    { "chain": "sol",  "symbol": "SOL",  "quantity": 2.5,  "usdValue": 350 }
  ]
}`;

export default function DashboardClient({ apiBase }: { apiBase: string }) {
  const [stage, setStage] = useState<number>(4);
  const [snapshotText, setSnapshotText] = useState<string>(DEFAULT_SNAPSHOT);
  const [output, setOutput] = useState<any>(null);
  const [busy, setBusy] = useState<null | "drift" | "suggest">(null);
  const [error, setError] = useState<string | null>(null);

  const snapshotValid = useMemo(() => {
    try {
      const parsed = JSON.parse(snapshotText);
      return !!parsed?.holdings?.length;
    } catch {
      return false;
    }
  }, [snapshotText]);

  async function call(endpoint: "/strategy/drift" | "/strategy/suggest") {
    setError(null);
    setOutput(null);
    setBusy(endpoint.endsWith("drift") ? "drift" : "suggest");

    try {
      const snapshot = JSON.parse(snapshotText);

      const res = await fetch(`${apiBase}${endpoint}?stage=${stage}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(snapshot),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`API ${res.status}: ${text}`);
      }

      const data = await res.json();
      setOutput(data);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="pixel-wrap">
      <div className="pixel-card" style={{ width: "min(1100px, 95vw)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div className="pixel-tag">DASHBOARD</div>
            <h1 className="pixel-title" style={{ marginTop: 12 }}>
              Portfolio OS (MVP)
            </h1>
            <p className="pixel-sub" style={{ marginBottom: 0 }}>
              Stage-driven drift + rebalance suggestions (Base + Sol). API: {apiBase}
            </p>
          </div>

          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span className="pixel-tag">STAGE</span>
              <input
                type="number"
                min={1}
                max={5}
                value={stage}
                onChange={(e) => setStage(Math.max(1, Math.min(5, Number(e.target.value))))}
                style={{
                  width: 90,
                  padding: "10px 12px",
                  border: "4px solid var(--border)",
                  background: "rgba(0,0,0,0.20)",
                  color: "var(--text)",
                  fontFamily: "var(--font-pixel), system-ui, sans-serif",
                  fontSize: 10,
                }}
              />
            </label>

            <button
              className="pixel-btn-sm"
              disabled={!snapshotValid || busy === "drift"}
              onClick={() => call("/strategy/drift")}
              title={!snapshotValid ? "Fix Snapshot JSON first" : ""}
            >
              {busy === "drift" ? "WORKING..." : "COMPUTE DRIFT"}
            </button>

            <button
              className="pixel-btn-sm"
              disabled={!snapshotValid || busy === "suggest"}
              onClick={() => call("/strategy/suggest")}
              title={!snapshotValid ? "Fix Snapshot JSON first" : ""}
            >
              {busy === "suggest" ? "WORKING..." : "SUGGEST ACTIONS"}
            </button>
          </div>
        </div>

        <div className="pixel-hr" />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <section>
            <h2 className="pixel-title">Snapshot JSON</h2>

            <textarea
              value={snapshotText}
              onChange={(e) => setSnapshotText(e.target.value)}
              spellCheck={false}
              style={{
                width: "100%",
                height: 320,
                resize: "vertical",
                padding: 12,
                border: "4px solid var(--border)",
                background: "rgba(0,0,0,0.20)",
                color: "var(--text)",
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                fontSize: 12,
                lineHeight: 1.4,
              }}
            />

            {!snapshotValid && (
              <p className="pixel-sub" style={{ color: "var(--danger)" }}>
                Snapshot JSON invalid (must parse + have holdings[]).
              </p>
            )}

            {error && (
              <p className="pixel-sub" style={{ color: "var(--danger)" }}>
                {error}
              </p>
            )}
          </section>

          <section>
            <h2 className="pixel-title">Output</h2>

            <div
              style={{
                width: "100%",
                height: 320,
                overflow: "auto",
                padding: 12,
                border: "4px solid var(--border)",
                background: "rgba(0,0,0,0.20)",
                color: "var(--text)",
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                fontSize: 12,
                lineHeight: 1.4,
              }}
            >
              {output ? (
                <pre style={{ margin: 0 }}>{JSON.stringify(output, null, 2)}</pre>
              ) : (
                <div className="pixel-sub">Run a computation to see results.</div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
