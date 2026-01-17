import { describe, expect, it } from 'vitest';
import { computeDrift, decideStage, DEFAULT_STRATEGY_CONFIG } from './strategy.js';

describe('decideStage', () => {
  it('jumps to stage 2 on crash', () => {
    const d = decideStage(4, { bothAbove20DHigh: false, eitherBelow20DLow: false, crash24hDownPct: -0.13 });
    expect(d.to).toBe(2);
  });

  it('downgrades one step on 20D low break', () => {
    const d = decideStage(4, { bothAbove20DHigh: false, eitherBelow20DLow: true });
    expect(d.to).toBe(3);
  });

  it('upgrades one step on both 20D high', () => {
    const d = decideStage(4, { bothAbove20DHigh: true, eitherBelow20DLow: false });
    expect(d.to).toBe(5);
  });
});

describe('computeDrift', () => {
  it('refill core when under target', () => {
    const r = computeDrift({ chain: 'base', coreUsd: 300, usdcUsd: 700, totalUsd: 1000 }, 4, DEFAULT_STRATEGY_CONFIG);
    // Stage 4 target core is 40% => 400
    expect(r.actions.refillCoreUsd).toBe(100);
    expect(r.actions.trimCoreUsd).toBe(0);
  });

  it('trim core when over target by >5% total', () => {
    const r = computeDrift({ chain: 'base', coreUsd: 520, usdcUsd: 480, totalUsd: 1000 }, 4, DEFAULT_STRATEGY_CONFIG);
    // target core 400; over by 120; threshold 50 => trim
    expect(r.actions.trimCoreUsd).toBe(120);
  });
});
