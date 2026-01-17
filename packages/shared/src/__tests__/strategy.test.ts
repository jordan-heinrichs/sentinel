import { describe, expect, it } from 'vitest';
import { decideNextStage, suggestRebalanceActions } from '../strategy.js';

describe('decideNextStage', () => {
  it('triggers crash protection', () => {
    const d = decideNextStage({
      currentStage: 4,
      ethClose: 3000,
      solClose: 140,
      eth20dHigh: 3100,
      eth20dLow: 2900,
      sol20dHigh: 150,
      sol20dLow: 130,
      pctChange24h: -12.1
    });
    expect(d.appliedRule).toBe('CRASH_PROTECTION');
    expect(d.nextStage).toBe(2);
  });
});

describe('suggestRebalanceActions', () => {
  it('suggests refilling core up to target when under target', () => {
    const actions = suggestRebalanceActions(
      {
        asOf: new Date().toISOString(),
        holdings: [
          { chain: 'base', symbol: 'USDC', quantity: 800, usdValue: 800 },
          { chain: 'base', symbol: 'ETH', quantity: 0.05, usdValue: 200 },
          { chain: 'solana', symbol: 'USDC', quantity: 600, usdValue: 600 },
          { chain: 'solana', symbol: 'SOL', quantity: 1, usdValue: 400 }
        ]
      },
      { stage: 4 }
    );

    const base = actions.find((a) => a.chain === 'base')!;
    expect(base.type).toBe('REFILL_CORE');
    // Stage 4 target core is 40% => needs 400 core on a $1000 chain total.
    expect(Math.round(base.coreDeltaUsd)).toBe(200);
  });
});
