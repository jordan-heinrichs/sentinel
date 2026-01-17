import { Router } from "express";
import { prisma } from "../prisma";

export const snapshotsRouter = Router();

// Save snapshot (optionally include drift/suggestions payloads)
snapshotsRouter.post("/", async (req, res) => {
  const { email, stage, snapshotJson, driftResult, suggestions } = req.body ?? {};

  if (!email || !stage || !snapshotJson) {
    return res.status(400).json({ error: "email, stage, snapshotJson required" });
  }

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email },
  });

  const saved = await prisma.snapshot.create({
    data: {
      userId: user.id,
      stage: Number(stage),
      snapshotJson,
      driftResult: driftResult ?? null,
      suggestions: suggestions ?? null,
    },
  });

  res.json(saved);
});

snapshotsRouter.get("/", async (req, res) => {
  const email = String(req.query.email ?? "");
  const take = Math.min(Number(req.query.take ?? 10), 50);

  if (!email) return res.status(400).json({ error: "email required" });

  const rows = await prisma.snapshot.findMany({
    where: { user: { email } },
    orderBy: { createdAt: "desc" },
    take,
  });

  res.json(rows);
});
