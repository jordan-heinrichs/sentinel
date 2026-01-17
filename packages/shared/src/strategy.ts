import type { Chain, ChainSlice, Drift, PortfolioSnapshot, Stage, StageTargets, SuggestedAction } from './types.js';

export const CHAINS: Chain[] = ['base', 'solana'];

// Targets based on your Operating Manual.
// Stage 4 is the "default" (60% USDC capital / 40% Core per chain).
export function getStageTargets(stage: Stage): StageTargets {
  // You can tweak these later in a config table; hardcoded for MVP.
  const map: Record<Stage, { usdcPct: number; corePct: number }> = {
    1: { usdcPct: 85, corePct: 15 },
    2: { usdcPct: 75, corePct: 25 },
    3: { usdcPct: 65, corePct: 35 },
    4: { usdcPct: 60, corePct: 40 },
    5: { usdcPct: 50, corePct: 50 }
  };

  return {
    stage,
    perChain: {
      base: { ...map[stage] },
      solana: { ...map[stage] }
    }
  };
}

export function sliceByChain(snapshot: PortfolioSnapshot): Record<Chain, ChainSlice> {
  const init: Record<Chain, ChainSlice> = {
    base: { chain: 'base', totalUsd: 0, usdcUsd: 0, coreUsd: 0 },
    solana: { chain: 'solana', totalUsd: 0, usdcUsd: 0, coreUsd: 0 }
  };

  for (const h of snapshot.holdings) {
    if (!CHAINS.includes(h.chain)) continue;
    init[h.chain].totalUsd += h.usdValue;
    if (h.symbol === 'USDC') init[h.chain].usdcUsd += h.usdValue;
    else init[h.chain].coreUsd += h.usdValue;
  }

  return init;
}

function pct(part: number, whole: number): number {
  if (!Number.isFinite(whole) || whole <= 0) return 0;
  return (part / whole) * 100;
}

export function computeDrift(snapshot: PortfolioSnapshot, stage: Stage): Drift[] {
  const slices = sliceByChain(snapshot);
  const targets = getStageTargets(stage);

  return CHAINS.map((chain) => {
    const s = slices[chain];
    const actualUsdc = pct(s.usdcUsd, s.totalUsd);
    const actualCore = pct(s.coreUsd, s.totalUsd);
    const target = targets.perChain[chain];

    return {
      chain,
      totalUsd: s.totalUsd,
      actual: { usdcPct: actualUsdc, corePct: actualCore },
      target,
      drift: {
        usdcPct: actualUsdc - target.usdcPct,
        corePct: actualCore - target.corePct
      }
    };
  });
}

export interface SuggestionInputs {
  stage: Stage;
  // if core exceeds target by > trimThresholdPct on Friday, we trim back to target
  trimThresholdPct?: number; // default 5
  // only refill up to target (never exceed target during refill action)
  refillOnly?: boolean; // default true
}

export function suggestRebalanceActions(
  snapshot: PortfolioSnapshot,
  inputs: SuggestionInputs
): SuggestedAction[] {
  const trimThresholdPct = inputs.trimThresholdPct ?? 5;
  const refillOnly = inputs.refillOnly ?? true;

  const slices = sliceByChain(snapshot);
  const targets = getStageTargets(inputs.stage);

  const actions: SuggestedAction[] = [];

  for (const chain of CHAINS) {
    const s = slices[chain];
    const t = targets.perChain[chain];

    if (s.totalUsd <= 0) {
      actions.push({
        chain,
        type: 'NO_ACTION',
        reason: 'No holdings detected on this chain.',
        coreDeltaUsd: 0,
        usdcDeltaUsd: 0
      });
      continue;
    }

    const targetCoreUsd = (t.corePct / 100) * s.totalUsd;
    const deltaCoreUsd = targetCoreUsd - s.coreUsd; // + means buy core with USDC; - means sell core to USDC

    const actualCorePct = pct(s.coreUsd, s.totalUsd);

    if (deltaCoreUsd > 0.01) {
      // Need more core.
      const maxBuy = refillOnly ? deltaCoreUsd : Math.min(deltaCoreUsd, s.usdcUsd);
      const buyUsd = Math.max(0, Math.min(maxBuy, s.usdcUsd));

      actions.push({
        chain,
        type: buyUsd > 0 ? 'REFILL_CORE' : 'NO_ACTION',
        reason:
          buyUsd > 0
            ? `Core is under target (${actualCorePct.toFixed(2)}% vs ${t.corePct}%). Refill core up to target.`
            : 'Core is under target but there is no USDC available to refill.',
        coreDeltaUsd: buyUsd,
        usdcDeltaUsd: -buyUsd
      });
      continue;
    }

    // deltaCoreUsd <= 0 means core is at/over target.
    const overPct = actualCorePct - t.corePct;
    if (overPct > trimThresholdPct) {
      const sellUsd = Math.abs(deltaCoreUsd);
      actions.push({
        chain,
        type: 'TRIM_CORE',
        reason: `Core exceeds target by ${overPct.toFixed(2)}% (> ${trimThresholdPct}%). Trim back to target.`,
        coreDeltaUsd: -sellUsd,
        usdcDeltaUsd: sellUsd
      });
    } else {
      actions.push({
        chain,
        type: 'NO_ACTION',
        reason: `Core is within drift limits (${actualCorePct.toFixed(2)}% vs target ${t.corePct}%).`,
        coreDeltaUsd: 0,
        usdcDeltaUsd: 0
      });
    }
  }

  return actions;
}

export interface StageSignalInputs {
  currentStage: Stage;
  // Daily close values
  ethClose: number;
  solClose: number;
  // 20D bands
  eth20dHigh: number;
  eth20dLow: number;
  sol20dHigh: number;
  sol20dLow: number;
  // max % move over last 24h (negative means down). Example: -12.3
  pctChange24h: number;
}

export interface StageDecision {
  nextStage: Stage;
  reason: string;
  appliedRule: 'CRASH_PROTECTION' | 'UPGRADE_CONFIRMATION' | 'DOWNGRADE_CONFIRMATION' | 'NO_CHANGE';
}

export function decideNextStage(inputs: StageSignalInputs): StageDecision {
  const { currentStage } = inputs;

  // Crash protection has priority.
  if (inputs.pctChange24h <= -12) {
    const next: Stage = currentStage <= 2 ? 1 : 2;
    return {
      nextStage: next,
      reason: `Crash protection triggered (24h change ${inputs.pctChange24h}%). Moving to Stage ${next}.`,
      appliedRule: 'CRASH_PROTECTION'
    };
  }

  const upgrade = inputs.ethClose > inputs.eth20dHigh && inputs.solClose > inputs.sol20dHigh;
  if (upgrade && currentStage < 5) {
    const next = (currentStage + 1) as Stage;
    return {
      nextStage: next,
      reason: 'Both ETH and SOL confirmed above their 20D highs. Upgrade one stage.',
      appliedRule: 'UPGRADE_CONFIRMATION'
    };
  }

  const downgrade = inputs.ethClose < inputs.eth20dLow || inputs.solClose < inputs.sol20dLow;
  if (downgrade && currentStage > 1) {
    const next = (currentStage - 1) as Stage;
    return {
      nextStage: next,
      reason: 'Either ETH or SOL confirmed below its 20D low. Downgrade one stage.',
      appliedRule: 'DOWNGRADE_CONFIRMATION'
    };
  }

  return {
    nextStage: currentStage,
    reason: 'No stage rule triggered.',
    appliedRule: 'NO_CHANGE'
  };
}
