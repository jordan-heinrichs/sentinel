import express from 'express';
import cors from 'cors';
import { z } from 'zod';
import { computeDrift, getStageTargets, suggestRebalanceActions } from '@portfolio/shared';
import { snapshotsRouter } from "./routes/snapshots";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/snapshots", snapshotsRouter);

app.get('/health', (_req, res) => res.json({ ok: true }));

app.get('/strategy/targets', (req, res) => {
  const stage = Number(req.query.stage ?? 4) as any;
  res.json(getStageTargets(stage));
});

const HoldingSchema = z.object({
  chain: z.enum(['base', 'solana']),
  symbol: z.string(),
  quantity: z.number(),
  usdValue: z.number()
});

const SnapshotSchema = z.object({
  asOf: z.string(),
  holdings: z.array(HoldingSchema)
});

app.post('/strategy/drift', (req, res) => {
  const stage = Number(req.query.stage ?? 4) as any;
  const snapshot = SnapshotSchema.parse(req.body);
  res.json(computeDrift(snapshot, stage));
});

app.post('/strategy/suggest', (req, res) => {
  const stage = Number(req.query.stage ?? 4) as any;
  const snapshot = SnapshotSchema.parse(req.body);
  res.json(suggestRebalanceActions(snapshot, { stage }));
});

const port = Number(process.env.PORT ?? 3001);
console.log("Mounting snapshots router at /snapshots");

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`API listening on http://localhost:${port}`);
});
