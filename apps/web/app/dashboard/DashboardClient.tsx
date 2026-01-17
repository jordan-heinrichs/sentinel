"use client";

import React, { useEffect, useMemo, useState } from "react";

const DEFAULT_SNAPSHOT = `{
  "asOf": "${new Date().toISOString()}",
  "holdings": [
    { "chain": "base", "symbol": "USDC", "quantity": 600, "usdValue": 600 },
    { "chain": "base", "symbol": "ETH",  "quantity": 0.15, "usdValue": 500 },
    { "chain": "sol",  "symbol": "USDC", "quantity": 600, "usdValue": 600 },
    { "chain": "sol",  "symbol": "SOL",  "quantity": 2.5,  "usdValue": 350 }
  ]
}`;

type LatestSnapshotResponse = {
  ok: boolean;
  snapshot: null | {
    id: string;
    createdAt: string;
    stage: number;
    snapshotJson: any;
    driftResult: any | null;
    suggestions: any | null;
  };
  error?: string;
};

type SaveSnapshotResponse = {
  ok: boolean;
  snapshot?: {
    id: string;
    createdAt: string;
    stage: number;
  };
  error?: string;
};

export default function DashboardClient({
  apiBase,
  email,
}: {
  apiBase: string;
  email: string;
}) {
  const [stage, setStage] = useState<number>(4);
  const [snapshotText, setSnapshotText] = useState<string>(DEFAULT_SNAPSHOT);

  const [output, setOutput] = useState<any>(null);
  const [busy, setBusy] = useState<null | "drift" | "suggest" | "load" | "save">(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string>("");

  // Track what the current output represents so we can optionally persist it.
  const [lastComputed, setLastComputed] = useState<null | "drift" | "suggest">(
    null
  );

  const snapshotValid = useMemo(() => {
    try {
      const parsed = JSON.parse(snapshotText);
      return !!parsed?.holdings?.length;
    } catch {
      return false;
    }
  }, [snapshotText]);

  async function loadLatest() {
    setError(null);
    setStatusMsg("");
    setBusy("load");

    try {
      const res = await fetch(
        `${apiBase}/snapshots/latest?email=${encodeURIComponent(email)}`,
        { cache: "no-store" }
      );

      const data = (await res.json()) as LatestSnapshotResponse;

      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? `API ${res.status}: Failed to load latest`);
      }

      if (!data.snapshot) {
        setStatusMsg("No saved snapshots yet.");
        return;
      }

      setStage(Number(data.snapshot.stage));
      setSnapshotText(JSON.stringify(data.snapshot.snapshotJson, null, 2));

      // Optional: if you want to show previously computed results:
      // prefer driftResult/suggestions if they exist
      if (data.snapshot.driftResult != null) {
        setOutput(data.snapshot.driftResult);
        setLastComputed("drift");
      } else if (data.snapshot.suggestions != null) {
        setOutput(data.snapshot.suggestions);
        setLastComputed("suggest");
      } else {
        setOutput(null);
        setLastComputed(null);
      }

      setStatusMsg(
        `Loaded latest snapshot (${new Date(
          data.snapshot.createdAt
        ).toLocaleString()})`
      );
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setBusy(null);
    }
  }

  async function saveSnapshot() {
    setError(null);
    setStatusMsg("");
    setBusy("save");

    try {
      const snapshotJson = JSON.parse(snapshotText);

      // Persist compute outputs only if they exist and we know what they represent.
      const driftResult = lastComputed === "drift" ? output : null;
      const suggestions = lastComputed === "suggest" ? output : null;

      const res = await fetch(`${apiBase}/snapshots`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email,
          stage,
          snapshotJson,
          driftResult,
          suggestions,
        }),
      });

      const data = (await res.json()) as SaveSnapshotResponse;

      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? `API ${res.status}: Save failed`);
      }

      setStatusMsg("Snapshot saved.");
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setBusy(null);
    }
  }

  async function call(endpoint: "/strategy/drift" | "/strategy/suggest") {
    setError(null);
    setStatusMsg("");
    setOutput(null);

    const mode = endpoint.endsWith("drift") ? "drift" : "suggest";
    setBusy(mode);

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
      setLastComputed(mode);
      setStatusMsg(mode === "drift" ? "Drift computed." : "Actions suggested.");
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setBusy(null);
    }
  }

  // Load latest snapshot automatically on mount
  useEffect(() => {
    loadLatest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="pixel-wrap">
      <div className="pixel-card" style={{ width: "min(1100px, 95vw)" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div className="pixel-tag">DASHBOARD</div>
            <h1 className="pixel-title" style={{ marginTop: 12 }}>
              Portfolio OS (MVP)
            </h1>
            <p className="pixel-sub" style={{ marginBottom: 0 }}>
              Stage-driven drift + rebalance suggestions (Base + Sol). API:{" "}
              {apiBase}
            </p>
            <p className="pixel-sub" style={{ marginBottom: 0 }}>
              User: {email}
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
                onChange={(e) =>
                  setStage(Math.max(1, Math.min(5, Number(e.target.value))))
                }
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
              disabled={busy === "load"}
              onClick={loadLatest}
              title="Load most recent saved snapshot"
            >
              {busy === "load" ? "LOADING..." : "LOAD LATEST"}
            </button>

            <button
              className="pixel-btn-sm"
              disabled={!snapshotValid || busy === "save"}
              onClick={saveSnapshot}
              title={!snapshotValid ? "Fix Snapshot JSON first" : "Save snapshot"}
            >
              {busy === "save" ? "SAVING..." : "SAVE SNAPSHOT"}
            </button>

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
                fontFamily:
                  "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                fontSize: 12,
                lineHeight: 1.4,
              }}
            />

            {!snapshotValid && (
              <p className="pixel-sub" style={{ color: "var(--danger)" }}>
                Snapshot JSON invalid (must parse + have holdings[]).
              </p>
            )}

            {statusMsg && (
              <p className="pixel-sub" style={{ color: "var(--text)" }}>
                {statusMsg}
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
                fontFamily:
                  "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
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
