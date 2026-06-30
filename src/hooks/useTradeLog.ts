import { useState, useCallback, useEffect } from "react";
import { supabase } from "../lib/supabase";
import type { ArbSignal, TradeLogEntry } from "../types";

let _tradeIdCounter = 1;
function generateId() {
  return `trade_${Date.now()}_${_tradeIdCounter++}`;
}

function simulateFill(signal: ArbSignal): {
  finalPnlUsd: number;
  fillSlippagePct: number;
  outcomeNote: string;
} {
  const fillSlippagePct = Math.random() * 1.0;
  const fillHaircut = signal.net_profit_usd * (fillSlippagePct / 100);
  const finalPnlUsd = signal.net_profit_usd - fillHaircut;

  const direction = signal.direction ?? "DEX→CEX";
  const outcomeNote =
    `${signal.token_symbol} ${direction}: simulated net P&L $${finalPnlUsd.toFixed(2)} ` +
    `(${signal.net_profit_pct.toFixed(3)}% estimated, −${fillSlippagePct.toFixed(2)}% fill slippage). ` +
    `[SIMULATED — no real funds moved]`;

  return { finalPnlUsd, fillSlippagePct, outcomeNote };
}

export function useTradeLog(walletAddress: string | null) {
  const [trades, setTrades] = useState<TradeLogEntry[]>([]);
  const [pendingSignals, setPendingSignals] = useState<ArbSignal[]>([]);
  const [executing, setExecuting] = useState<string | null>(null);

  // Hydrate from mock Supabase
  useEffect(() => {
    supabase.from('trade_log').select().then(({ data }) => setTrades(data.reverse()));
    supabase.from('arb_signals').select().then(({ data }) => setPendingSignals(data));
  }, []);

  const addSignal = useCallback(async (signal: ArbSignal) => {
    setPendingSignals((prev) => {
      if (prev.find((s) => s.watchlist_token === signal.watchlist_token && s.status === "pending_approval")) {
        return prev;
      }
      return [...prev, signal];
    });
    await supabase.from('arb_signals').insert(signal);
  }, []);

  const approveSignal = useCallback(async (signalId: string) => {
    const signal = pendingSignals.find((s) => s.id === signalId);
    if (!signal) return;

    setExecuting(signalId);
    await new Promise((r) => setTimeout(r, 1200));

    const { finalPnlUsd, outcomeNote } = simulateFill(signal);

    const entry: TradeLogEntry = {
      id: generateId(),
      signal_id: signalId,
      trade_mode: "simulated",
      wallet_address: walletAddress ?? "not_connected",
      token_symbol: signal.token_symbol,
      simulated_net_profit_usd: finalPnlUsd,
      executed_at: new Date().toISOString(),
      outcome_note: outcomeNote,
      direction: signal.direction,
    };

    setTrades((prev) => [entry, ...prev]);
    setPendingSignals((prev) =>
      prev.map((s) => (s.id === signalId ? { ...s, status: "executed" as const } : s))
    );
    setExecuting(null);

    // Persist to Mock Supabase
    await supabase.from('trade_log').insert(entry);
    await supabase.from('arb_signals').update({ status: "executed" }, { id: signalId });

    return entry;
  }, [pendingSignals, walletAddress]);

  const rejectSignal = useCallback(async (signalId: string) => {
    setPendingSignals((prev) =>
      prev.map((s) => (s.id === signalId ? { ...s, status: "rejected" as const } : s))
    );
    await supabase.from('arb_signals').update({ status: "rejected" }, { id: signalId });
  }, []);

  const totalSimulatedPnl = trades.reduce((sum, t) => sum + t.simulated_net_profit_usd, 0);
  const pendingCount = pendingSignals.filter((s) => s.status === "pending_approval").length;

  return {
    trades,
    pendingSignals,
    pendingCount,
    executing,
    totalSimulatedPnl,
    addSignal,
    approveSignal,
    rejectSignal,
  };
}
