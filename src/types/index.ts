// ─── Wallet ───────────────────────────────────────────────────────────────────

export interface WalletState {
  address: string | null;
  chainId: bigint | null;
  connected: boolean;
  connecting: boolean;
  error: string | null;
}

// ─── Watchlist ────────────────────────────────────────────────────────────────

export interface WatchlistToken {
  id?: string;
  token_symbol: string;
  bsc_token_address: string;
  cex_symbol: string;
  min_net_profit_pct: number;
  trade_size_usd: number;
  status: "active" | "paused";
  last_dex_price?: number;
  last_cex_price?: number;
  last_net_profit_pct?: number;
  last_checked_at?: string;
  // Live data (client-side, not persisted)
  live?: LiveTokenData;
}

export interface LiveTokenData {
  dexPrice: number;
  cexPrice: number;
  dexLiquidity: number;
  profit: ProfitEstimate;
  hasSignal: boolean;
  sparkHistory: number[];
  lastUpdated: Date;
  loading: boolean;
  error?: string;
}

// ─── Profit Engine ────────────────────────────────────────────────────────────

export interface ProfitInput {
  dexPriceUsd: number;
  cexPriceUsd: number;
  dexLiquidityUsd: number;
  tradeSizeUsd?: number;
}

export interface ProfitEstimate {
  dexFeeUsd: number;
  cexFeeUsd: number;
  slippagePct: number;
  slippageUsd: number;
  gasUsd: number;
  grossSpreadUsd: number;
  grossSpreadPct: number;
  totalCostUsd: number;
  netProfitUsd: number;
  netProfitPct: number;
  direction: "DEX→CEX" | "CEX→DEX" | "none";
}

// ─── Arb Signals ─────────────────────────────────────────────────────────────

export type SignalStatus = "pending_approval" | "approved" | "rejected" | "executed" | "expired";

export interface ArbSignal {
  id: string;
  watchlist_token: string;
  token_symbol: string;
  bsc_token_address?: string;
  dex_price_usd: number;
  cex_price_usd: number;
  dex_liquidity_usd: number;
  trade_size_usd: number;
  gross_spread_usd: number;
  net_profit_usd: number;
  net_profit_pct: number;
  risk_note: string;
  status: SignalStatus;
  detected_at: string;
  direction: "DEX→CEX" | "CEX→DEX";
}

// ─── Trade Log ────────────────────────────────────────────────────────────────

export type TradeMode = "simulated" | "live";

export interface TradeLogEntry {
  id: string;
  signal_id: string;
  trade_mode: TradeMode;
  wallet_address: string;
  token_symbol: string;
  simulated_net_profit_usd: number;
  executed_at: string;
  outcome_note: string;
  direction?: string;
}

// ─── API Responses ────────────────────────────────────────────────────────────

export interface DexscreenerPair {
  chainId: string;
  dexId: string;
  pairAddress: string;
  baseToken: { address: string; name: string; symbol: string };
  quoteToken: { address: string; name: string; symbol: string };
  priceUsd: string;
  liquidity: { usd: number };
  volume: { h24: number };
}

export interface BinanceTicker {
  symbol: string;
  price: string;
}

// ─── Scan State ───────────────────────────────────────────────────────────────

export interface ScanLog {
  timestamp: Date;
  message: string;
  level: "info" | "signal" | "error" | "success";
}
