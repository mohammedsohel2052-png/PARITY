/**
 * Parity Net Profitability Engine
 * TypeScript port of PRD §6.4 — deterministic, no AI.
 *
 * These are conservative ESTIMATES. Real execution can slip further between
 * detection and fill. Treat as a pre-trade sanity check, not a guarantee.
 */

import type { ProfitInput, ProfitEstimate } from "../types";

// Fee constants — configurable, not ground truth
const PANCAKESWAP_V2_FEE = 0.0025; // 0.25% swap fee
const BINANCE_TAKER_FEE  = 0.001;  // 0.10% taker (varies by VIP/BNB discount)
const SLIPPAGE_MULTIPLIER = 50;    // pool_impact * 50 → slippage %
const SLIPPAGE_CAP_PCT    = 5.0;   // never model more than 5% slippage
const BSC_GAS_USD         = 0.40;  // BSC gas is cheap; conservative est.

export const FEE_ASSUMPTIONS = {
  dexFeeLabel: "PancakeSwap V2 swap fee (0.25%)",
  cexFeeLabel: "Binance spot taker fee (0.10%)",
  slippageLabel: "Price impact estimate (pool depth model)",
  gasLabel: "BSC gas estimate (conservative)",
  note: "These are pre-trade estimates. Realized P&L depends on execution risk.",
};

export function estimateNetProfit(input: ProfitInput): ProfitEstimate {
  const {
    dexPriceUsd,
    cexPriceUsd,
    dexLiquidityUsd,
    tradeSizeUsd = 500,
  } = input;

  const dexFeeUsd    = tradeSizeUsd * PANCAKESWAP_V2_FEE;
  const cexFeeUsd    = tradeSizeUsd * BINANCE_TAKER_FEE;

  const poolImpact   = tradeSizeUsd / Math.max(dexLiquidityUsd, 1);
  const slippagePct  = Math.min(poolImpact * SLIPPAGE_MULTIPLIER, SLIPPAGE_CAP_PCT);
  const slippageUsd  = tradeSizeUsd * (slippagePct / 100);

  const gasUsd       = BSC_GAS_USD;

  const lowerPrice   = Math.min(dexPriceUsd, cexPriceUsd);
  const spreadRaw    = Math.abs(dexPriceUsd - cexPriceUsd);
  const grossSpreadPct = (spreadRaw / lowerPrice) * 100;
  const grossSpreadUsd = tradeSizeUsd * (grossSpreadPct / 100);

  const totalCostUsd  = dexFeeUsd + cexFeeUsd + slippageUsd + gasUsd;
  const netProfitUsd  = grossSpreadUsd - totalCostUsd;
  const netProfitPct  = (netProfitUsd / tradeSizeUsd) * 100;

  // Direction: which venue to buy from
  const direction = dexPriceUsd < cexPriceUsd ? "DEX→CEX" :
                    cexPriceUsd < dexPriceUsd ? "CEX→DEX" : "none";

  return {
    dexFeeUsd:    round(dexFeeUsd, 4),
    cexFeeUsd:    round(cexFeeUsd, 4),
    slippagePct:  round(slippagePct, 3),
    slippageUsd:  round(slippageUsd, 4),
    gasUsd:       round(gasUsd, 2),
    grossSpreadUsd: round(grossSpreadUsd, 4),
    grossSpreadPct: round(grossSpreadPct, 4),
    totalCostUsd:   round(totalCostUsd, 4),
    netProfitUsd:   round(netProfitUsd, 4),
    netProfitPct:   round(netProfitPct, 4),
    direction,
  };
}

/**
 * Classify a signal based on the agent's heuristics (mirrors PRD §6.5).
 * This is the deterministic pre-filter; the AI agent adds judgment on top.
 */
export function classifySignal(profit: ProfitEstimate, liquidityUsd: number): {
  viable: boolean;
  flags: string[];
} {
  const flags: string[] = [];

  if (profit.netProfitPct < 0.3) {
    flags.push("Net spread under 0.3% — likely not worth execution risk");
  }
  if (liquidityUsd < 20_000) {
    flags.push("Liquidity under $20k — price feed may be unreliable");
  }
  if (profit.grossSpreadPct > 8) {
    flags.push("Gross spread >8% — more likely stale data than real opportunity");
  }
  if (profit.netProfitUsd <= 0) {
    flags.push("Net profit is negative after costs — not viable");
  }

  return {
    viable: flags.length === 0,
    flags,
  };
}

function round(n: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(n * factor) / factor;
}
