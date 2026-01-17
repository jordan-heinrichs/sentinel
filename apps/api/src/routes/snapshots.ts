import { Router } from "express";
import { prisma } from "../prisma";

export const snapshotsRouter = Router();

/**
 * POST /snapshots
 * body: { email: string, stage: number|string, snapshotJson: object, driftResult?: object, suggestions?: object }
 */
snapshotsRouter.post("/", async (req, res) => {
  try {
    const { email, stage, snapshotJson, driftResult, suggestions } = req.body ?? {};

    if (!email || !stage || !snapshotJson) {
      return res.status(400).json({ error: "email, stage, snapshotJson required" });
    }

    const stageNum = Number(stage);
    if (!Number.isFinite(stageNum) || stageNum < 1 || stageNum > 4) {
      return res.status(400).json({ error: "stage must be 1-4" });
    }

    if (typeof snapshotJson !== "object" || Array.isArray(snapshotJson)) {
      return res.status(400).json({ error: "snapshotJson must be a JSON object" });
    }

    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: { email },
      select: { id: true, email: true },
    });

    const saved = await prisma.snapshot.create({
      data: {
        userId: user.id,
        stage: stageNum,
        snapshotJson,
        driftResult: driftResult ?? null,
        suggestions: suggestions ?? null,
      },
      select: {
        id: true,
        createdAt: true,
        stage: true,
      },
    });

    return res.status(201).json({ ok: true, snapshot: saved });
  } catch (err) {
    console.error("POST /snapshots failed:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /snapshots/latest?email=...
 * returns: latest snapshot for user
 */
snapshotsRouter.get("/latest", async (req, res) => {
  try {
    const email = String(req.query.email ?? "");
    if (!email) return res.status(400).json({ error: "email required" });

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (!user) {
      return res.json({ ok: true, snapshot: null });
    }

    const latest = await prisma.snapshot.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        createdAt: true,
        stage: true,
        snapshotJson: true,
        driftResult: true,
        suggestions: true,
      },
    });

    return res.json({ ok: true, snapshot: latest });
  } catch (err) {
    console.error("GET /snapshots/latest failed:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});


/**
 * GET /snapshots?email=...&limit=20
 */
snapshotsRouter.get("/", async (req, res) => {
  try {
    const email = String(req.query.email ?? "");
    const limit = Math.min(Number(req.query.limit ?? 20), 100);

    if (!email) return res.status(400).json({ error: "email required" });

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (!user) return res.json({ ok: true, snapshots: [] });

    const snapshots = await prisma.snapshot.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: Number.isFinite(limit) ? limit : 20,
      select: {
        id: true,
        createdAt: true,
        stage: true,
      },
    });

    return res.json({ ok: true, snapshots });
  } catch (err) {
    console.error("GET /snapshots failed:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});
