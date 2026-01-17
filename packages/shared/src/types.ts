export type Chain = 'base' | 'solana';

export type AssetSymbol =
  | 'ETH'
  | 'SOL'
  | 'mSOL'
  | 'USDC'
  | (string & {});

export type Stage = 1 | 2 | 3 | 4 | 5;

export interface Holding {
  chain: Chain;
  symbol: AssetSymbol;
  quantity: number;
  usdValue: number;
}

export interface PortfolioSnapshot {
  asOf: string; // ISO timestamp
  holdings: Holding[];
}

export interface ChainSlice {
  chain: Chain;
  totalUsd: number;
  usdcUsd: number;
  coreUsd: number;
}

export interface StageTargets {
  stage: Stage;
  perChain: Record<Chain, { usdcPct: number; corePct: number }>;
}

export interface Drift {
  chain: Chain;
  totalUsd: number;
  actual: { usdcPct: number; corePct: number };
  target: { usdcPct: number; corePct: number };
  drift: { usdcPct: number; corePct: number }; // actual - target
}

export type ActionType =
  | 'REFILL_CORE'
  | 'TRIM_CORE'
  | 'NO_ACTION'
  | 'REBALANCE_TO_TARGET';

export interface SuggestedAction {
  chain: Chain;
  type: ActionType;
  reason: string;
  // Positive means buy core with USDC; negative means sell core to USDC.
  coreDeltaUsd: number;
  // USDC movement implied by coreDeltaUsd.
  usdcDeltaUsd: number;
}

export interface AlertRule {
  id: string;
  type: 'PRICE_LEVEL' | 'CONFIRM_20D' | 'CRASH_24H';
  enabled: boolean;
  chain?: Chain;
  symbol?: AssetSymbol;
  op?: 'gte' | 'lte';
  threshold?: number;
  cooldownMinutes?: number;
}
