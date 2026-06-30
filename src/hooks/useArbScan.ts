import { useState, useCallback, useRef, useEffect } from "react";
import { getDexPrice } from "../lib/dexscreener";
import { getBinancePrice } from "../lib/binance";
import { estimateNetProfit } from "../lib/profitEngine";
import { supabase } from "../lib/supabase";
import type { WatchlistToken, ScanLog, LiveTokenData } from "../types";

export const DEFAULT_WATCHLIST: WatchlistToken[] = [
  { token_symbol: "CAKE", bsc_token_address: "0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82", cex_symbol: "CAKEUSDT", min_net_profit_pct: 0.3, trade_size_usd: 500, status: "active" },
  { token_symbol: "BTCB", bsc_token_address: "0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c", cex_symbol: "BTCUSDT", min_net_profit_pct: 0.3, trade_size_usd: 500, status: "active" },
  { token_symbol: "ETH", bsc_token_address: "0x2170ed0880ac9a755fd29b2688956bd959f933f8", cex_symbol: "ETHUSDT", min_net_profit_pct: 0.3, trade_size_usd: 500, status: "active" },
  { token_symbol: "BNB", bsc_token_address: "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c", cex_symbol: "BNBUSDT", min_net_profit_pct: 0.3, trade_size_usd: 500, status: "active" },
  { token_symbol: "XRP", bsc_token_address: "0x1d2f0da169ceb9fc7b3144628db156f3f6c60dbe", cex_symbol: "XRPUSDT", min_net_profit_pct: 0.5, trade_size_usd: 500, status: "active" },
  { token_symbol: "ADA", bsc_token_address: "0x3ee2200efb3400fabb9aacf31297cbdd1d435d47", cex_symbol: "ADAUSDT", min_net_profit_pct: 0.5, trade_size_usd: 500, status: "active" },
];

const SCAN_INTERVAL_MS = 30_000;
const HISTORY_DEPTH    = 10;

export function useArbScan() {
  const [tokens, setTokens] = useState<WatchlistToken[]>([]);
  const [liveData, setLiveData] = useState<Map<string, LiveTokenData>>(new Map());
  const [scanLog, setScanLog] = useState<ScanLog[]>([]);
  const [scanning, setScanning] = useState(false);
  const [lastScanAt, setLastScanAt] = useState<Date | null>(null);
  const scanHistoryRef = useRef<Map<string, number[]>>(new Map());

  // Hydrate from mock Supabase
  useEffect(() => {
    supabase.from('watchlist').select().then(({ data }) => {
      if (data && data.length > 0) {
        setTokens(data);
      } else {
        // Seed initial if empty
        DEFAULT_WATCHLIST.forEach(t => supabase.from('watchlist').insert(t));
        setTokens(DEFAULT_WATCHLIST);
      }
    });
  }, []);

  const addLog = useCallback((message: string, level: ScanLog["level"] = "info") => {
    setScanLog((prev) => [...prev.slice(-50), { timestamp: new Date(), message, level }]);
  }, []);

  const scanToken = useCallback(async (token: WatchlistToken): Promise<LiveTokenData | null> => {
    const sym = token.token_symbol;
    addLog(`Scanning [${sym}] on PancakeSwap and Binance...`);
    try {
      const [dexResult, cexPrice] = await Promise.all([
        getDexPrice(token.bsc_token_address),
        getBinancePrice(token.cex_symbol),
      ]);

      if (!dexResult || !cexPrice) {
        addLog(`  └ [${sym}] Price fetch failed — skipping`, "error");
        return null;
      }

      addLog(`  └ [${sym}] DEX: $${dexResult.priceUsd.toFixed(4)} | CEX: $${cexPrice.toFixed(4)}`);

      const profit = estimateNetProfit({
        dexPriceUsd: dexResult.priceUsd,
        cexPriceUsd: cexPrice,
        dexLiquidityUsd: dexResult.liquidityUsd,
        tradeSizeUsd: token.trade_size_usd,
      });

      const history = scanHistoryRef.current.get(sym) ?? [];
      const updated = [...history, profit.netProfitPct].slice(-HISTORY_DEPTH);
      scanHistoryRef.current.set(sym, updated);

      const hasSignal = profit.netProfitPct >= token.min_net_profit_pct;
      if (hasSignal) {
        addLog(`  🔔 [SIGNAL] ${sym}: net ${profit.netProfitPct.toFixed(3)}% ($${profit.netProfitUsd.toFixed(2)}) — routed to pending queue`, "signal");
      }

      return {
        dexPrice: dexResult.priceUsd,
        cexPrice,
        dexLiquidity: dexResult.liquidityUsd,
        profit,
        hasSignal,
        sparkHistory: updated,
        lastUpdated: new Date(),
        loading: false,
      };
    } catch (e) {
      addLog(`  └ [${sym}] Error: ${e instanceof Error ? e.message : String(e)}`, "error");
      return null;
    }
  }, [addLog]);

  const runScan = useCallback(async () => {
    if (scanning || tokens.length === 0) return;
    setScanning(true);
    addLog("─── Starting Parity watchlist scan ───", "info");

    const activeTokens = tokens.filter((t) => t.status === "active");
    const results = await Promise.allSettled(activeTokens.map((t) => scanToken(t)));

    const newMap = new Map(liveData);
    results.forEach((r, i) => {
      if (r.status === "fulfilled" && r.value) {
        newMap.set(activeTokens[i].token_symbol, r.value);
      }
    });

    setLiveData(newMap);
    setLastScanAt(new Date());
    const signalCount = [...newMap.values()].filter((d) => d.hasSignal).length;
    addLog(`─── Scan complete. ${signalCount} signal(s) detected. ───`, signalCount > 0 ? "signal" : "info");
    setScanning(false);
  }, [scanning, tokens, scanToken, liveData, addLog]);

  const addToken = useCallback(async (token: WatchlistToken) => {
    setTokens((prev) => {
      if (prev.find((t) => t.bsc_token_address.toLowerCase() === token.bsc_token_address.toLowerCase())) return prev;
      return [...prev, token];
    });
    await supabase.from('watchlist').insert(token);
    addLog(`Added ${token.token_symbol} to watchlist`, "success");
  }, [addLog]);

  useEffect(() => {
    if (tokens.length === 0) return;
    const initial = setTimeout(runScan, 1000);
    const interval = setInterval(runScan, SCAN_INTERVAL_MS);
    return () => { clearTimeout(initial); clearInterval(interval); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokens.length]); 

  const enrichedTokens = tokens.map((t) => ({ ...t, live: liveData.get(t.token_symbol) }));
  const signalCount = [...liveData.values()].filter((d) => d.hasSignal).length;

  return { tokens: enrichedTokens, scanLog, scanning, lastScanAt, signalCount, runScan, addToken };
}
