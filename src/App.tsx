import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Settings, Zap, TrendingUp, TrendingDown,
  ShieldCheck, RefreshCw, Wifi, FlaskConical,
  AlertTriangle, Activity, CheckCircle2,
  Loader2,
} from "lucide-react";
import { LineChart, Line, ResponsiveContainer } from "recharts";

import { WalletConnect } from "./components/WalletConnect";
import { TokenImport } from "./components/TokenImport";
import { SignalCard } from "./components/SignalCard";
import { TradeLog } from "./components/TradeLog";
import { useWallet } from "./hooks/useWallet";
import { useArbScan } from "./hooks/useArbScan";
import { useTradeLog } from "./hooks/useTradeLog";
import type { ArbSignal, WatchlistToken } from "./types";

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  blue:    "#2563EB",
  green:   "#16A34A",
  amber:   "#D97706",
  red:     "#DC2626",
  navy:    "#0F172A",
  slate8:  "#1E293B",
  slate5:  "#64748B",
  slate2:  "#E2E8F0",
  slate1:  "#F1F5F9",
  bg:      "#F8FAFC",
  white:   "#FFFFFF",
};

// ─── AI risk note generator ───────────────────────────────────────────────────
function generateRiskNote(symbol: string, netPct: number, netUsd: number, liquidityUsd: number): string {
  if (netPct > 8) return `${symbol}: gross spread >8% is unusual — likely stale price data, not a real opportunity.`;
  if (liquidityUsd < 20_000) return `${symbol}: pool liquidity under $20k — price feed unreliable at this depth.`;
  if (netPct < 0.3) return `${symbol}: net spread ${netPct.toFixed(3)}% is below the 0.3% floor after all costs.`;
  if (netPct < 0.5) return `${symbol}: marginal — ${netPct.toFixed(3)}% net after fees. Est. $${netUsd.toFixed(2)} on $500 size.`;
  return `${symbol}: comfortable margin — ${netPct.toFixed(3)}% net ($${netUsd.toFixed(2)} est.) with $${(liquidityUsd / 1_000_000).toFixed(2)}M pool depth.`;
}

let _signalIdCounter = 1;

// ─── Sparkline ────────────────────────────────────────────────────────────────
function Sparkline({ data, color }: { data: number[]; color: string }) {
  const series = data.map((v, i) => ({ i, v }));
  return (
    <div style={{ width: 80, height: 28 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={series} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <Line type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Spread bar ───────────────────────────────────────────────────────────────
function SpreadBar({ net, signal }: { net: number; signal: boolean }) {
  const color = signal ? C.amber : net < 0 ? C.red : C.slate5;
  const textColor = signal ? C.amber : net < 0 ? C.red : C.slate8;
  return (
    <div className="flex flex-col gap-1" style={{ minWidth: 120 }}>
      <span className="text-sm font-semibold tabular-nums" style={{ color: textColor }}>
        {net >= 0 ? "+" : ""}{net.toFixed(3)}%
      </span>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: C.slate2 }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${Math.min(Math.abs(net) / 1.0 * 100, 100)}%`,
            background: color,
          }}
        />
      </div>
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({
  icon: Icon, label, value, sub, valueColor,
}: {
  icon: React.ElementType; label: string; value: string; sub: string; valueColor?: string;
}) {
  return (
    <div
      className="flex-1 min-w-[160px] rounded-xl p-5"
      style={{
        background: C.white,
        border: `1px solid ${C.slate2}`,
        boxShadow: "0 1px 3px rgba(15,23,42,0.06)",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: C.slate5 }}>
          {label}
        </span>
        <div className="p-1.5 rounded-lg" style={{ background: C.slate1 }}>
          <Icon size={14} style={{ color: C.slate5 }} />
        </div>
      </div>
      <div className="text-2xl font-bold tabular-nums" style={{ color: valueColor || C.slate8 }}>
        {value}
      </div>
      <div className="mt-1 text-xs" style={{ color: C.slate5 }}>{sub}</div>
    </div>
  );
}

// ─── Activity log item ────────────────────────────────────────────────────────
function LogItem({ message, level, timestamp }: { message: string; level: string; timestamp: Date }) {
  const dotColor = level === "signal" ? C.amber : level === "error" ? C.red : level === "success" ? C.green : C.blue;
  const ts = timestamp.toLocaleTimeString("en-GB", { hour12: false });
  return (
    <div className="flex items-start gap-3 py-2.5" style={{ borderBottom: `1px solid ${C.slate2}` }}>
      <div className="mt-1.5 h-2 w-2 rounded-full flex-shrink-0" style={{ background: dotColor }} />
      <div className="flex-1 text-sm" style={{ color: C.slate8 }}>{message}</div>
      <div className="text-xs flex-shrink-0" style={{ color: C.slate5 }}>{ts}</div>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar({
  page, setPage, pendingCount, tradeCount, wallet,
}: {
  page: string;
  setPage: (p: "watchlist" | "signals" | "tradelog") => void;
  pendingCount: number;
  tradeCount: number;
  wallet: { connected: boolean; shortAddress: string | null; isOnBSC: boolean };
}) {
  const navItems = [
    { id: "watchlist", label: "Watchlist",  icon: Wifi,             badge: null },
    { id: "signals",   label: "Signals",    icon: Zap,              badge: pendingCount > 0 ? pendingCount : null },
    { id: "tradelog",  label: "Trade Log",  icon: Activity,         badge: tradeCount > 0 ? tradeCount : null },
  ] as const;

  return (
    <aside
      className="w-60 flex-shrink-0 flex flex-col min-h-screen"
      style={{ background: C.navy }}
    >
      {/* Logo */}
      <div className="px-6 py-6 border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-md flex items-center justify-center font-bold text-xs"
            style={{ background: C.blue, color: C.white }}
          >
            P
          </div>
          <div>
            <div className="font-bold text-white text-base tracking-tight">Parity</div>
            <div className="text-xs" style={{ color: "#94A3B8" }}>BSC Arbitrage</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ id, label, icon: Icon, badge }) => {
          const active = page === id;
          return (
            <button
              key={id}
              onClick={() => setPage(id)}
              className="w-full flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
              style={{
                background: active ? "rgba(37,99,235,0.15)" : "transparent",
                color: active ? "#93C5FD" : "#94A3B8",
              }}
            >
              <div className="flex items-center gap-2.5">
                <Icon size={16} />
                {label}
              </div>
              {badge !== null && (
                <span
                  className="text-xs font-semibold px-1.5 py-0.5 rounded-full"
                  style={{
                    background: id === "signals" ? "rgba(217,119,6,0.2)" : "rgba(148,163,184,0.15)",
                    color: id === "signals" ? "#FCD34D" : "#94A3B8",
                  }}
                >
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Divider */}
      <div className="mx-3 border-t" style={{ borderColor: "rgba(255,255,255,0.08)" }} />

      {/* Wallet section */}
      <div className="px-4 py-4">
        {wallet.connected ? (
          <div className="rounded-lg p-3" style={{ background: "rgba(255,255,255,0.05)" }}>
            <div className="flex items-center gap-2 mb-1">
              <div className="h-2 w-2 rounded-full" style={{ background: C.green }} />
              <span className="text-xs font-medium" style={{ color: "#94A3B8" }}>Connected</span>
            </div>
            <div className="text-sm font-mono font-medium text-white">{wallet.shortAddress}</div>
            <div className="text-xs mt-0.5" style={{ color: wallet.isOnBSC ? "#4ADE80" : "#FCA5A5" }}>
              {wallet.isOnBSC ? "BSC Mainnet" : "Wrong network"}
            </div>
          </div>
        ) : (
          <div className="text-xs text-center" style={{ color: "#64748B" }}>
            No wallet connected
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 pb-4 text-xs" style={{ color: "#475569" }}>
        <div className="flex items-center gap-1.5 mb-1">
          <FlaskConical size={10} style={{ color: C.amber }} />
          Simulated mode
        </div>
        <div>Parity · Arise To Ascend</div>
      </div>
    </aside>
  );
}

// ─── Top header bar ───────────────────────────────────────────────────────────
function TopBar({
  title, subtitle, scanning, onScan, now, pendingCount, wallet, onConnect, onDisconnect,
}: {
  title: string; subtitle: string; scanning: boolean; onScan: () => void;
  now: Date; pendingCount: number;
  wallet: Parameters<typeof WalletConnect>[0]["state"];
  onConnect: () => void; onDisconnect: () => void;
}) {
  const timeStr = now.toLocaleTimeString("en-GB", { hour12: false });
  return (
    <div
      className="flex items-center justify-between px-6 py-4 flex-shrink-0"
      style={{
        background: C.white,
        borderBottom: `1px solid ${C.slate2}`,
        boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
      }}
    >
      <div>
        <h1 className="text-lg font-bold" style={{ color: C.slate8 }}>{title}</h1>
        <p className="text-xs mt-0.5" style={{ color: C.slate5 }}>{subtitle}</p>
      </div>
      <div className="flex items-center gap-3">
        {/* Live pulse */}
        <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: C.green }}>
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping" style={{ background: C.green }} />
            <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: C.green }} />
          </span>
          Live
        </div>

        {pendingCount > 0 && (
          <span
            className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full animate-pulse"
            style={{ background: "rgba(217,119,6,0.1)", color: C.amber }}
          >
            <Zap size={11} /> {pendingCount} pending
          </span>
        )}

        <span className="text-xs" style={{ color: C.slate5 }}>{timeStr} IST</span>

        <button
          onClick={onScan}
          disabled={scanning}
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50"
          style={{ borderColor: C.blue, color: C.blue, background: "rgba(37,99,235,0.04)" }}
        >
          <RefreshCw size={12} className={scanning ? "animate-spin" : ""} />
          {scanning ? "Scanning…" : "Scan Now"}
        </button>

        <Settings size={15} className="cursor-pointer transition-colors" style={{ color: C.slate5 }} />

        <WalletConnect state={wallet} onConnect={onConnect} onDisconnect={onDisconnect} />
      </div>
    </div>
  );
}

// ─── Watchlist page ───────────────────────────────────────────────────────────
function WatchlistPage({
  tokens, scanLog, scanning, onAddToken,
}: {
  tokens: (WatchlistToken & { live?: ReturnType<typeof useArbScan>["tokens"][number]["live"] })[];
  scanLog: ReturnType<typeof useArbScan>["scanLog"];
  scanning: boolean;
  onAddToken: (t: WatchlistToken) => void;
}) {
  return (
    <div className="space-y-5">
      {/* Agent Activity log */}
      <div
        className="rounded-xl p-5"
        style={{ background: C.white, border: `1px solid ${C.slate2}`, boxShadow: "0 1px 3px rgba(15,23,42,0.06)" }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity size={15} style={{ color: C.slate5 }} />
            <span className="text-sm font-semibold" style={{ color: C.slate8 }}>Agent Activity</span>
          </div>
          {scanning && (
            <span
              className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full animate-pulse"
              style={{ background: "rgba(217,119,6,0.1)", color: C.amber }}
            >
              <Loader2 size={11} className="animate-spin" /> Scanning…
            </span>
          )}
        </div>
        <div className="space-y-0 max-h-40 overflow-y-auto">
          {scanLog.length === 0 ? (
            <p className="text-sm py-4 text-center" style={{ color: C.slate5 }}>Waiting for first scan…</p>
          ) : (
            scanLog.slice(-6).map((log, i) => (
              <LogItem key={i} message={log.message} level={log.level} timestamp={log.timestamp} />
            ))
          )}
        </div>
      </div>

      {/* Watchlist table */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: C.white, border: `1px solid ${C.slate2}`, boxShadow: "0 1px 3px rgba(15,23,42,0.06)" }}
      >
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${C.slate2}` }}>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold" style={{ color: C.slate8 }}>Tokens</span>
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ background: C.slate1, color: C.slate5 }}
            >
              {tokens.length}
            </span>
          </div>
          <span className="text-xs" style={{ color: C.slate5 }}>PancakeSwap ↔ Binance</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ background: C.slate1 }}>
                {["Token", "DEX Price", "CEX Price", "Net Spread", "Trend", "Liquidity", "Status"].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: C.slate5 }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tokens.map((t, idx) => {
                const live = t.live;
                const net = live?.profit.netProfitPct ?? 0;
                const hasSignal = live?.hasSignal ?? false;
                const loading = !live;
                const isLast = idx === tokens.length - 1;
                return (
                  <tr
                    key={t.token_symbol}
                    className="transition-colors hover:bg-slate-50"
                    style={{ borderBottom: isLast ? "none" : `1px solid ${C.slate2}` }}
                  >
                    <td className="px-5 py-4">
                      <div className="font-semibold text-sm" style={{ color: C.slate8 }}>{t.token_symbol}</div>
                      <div className="text-xs" style={{ color: C.slate5 }}>{t.cex_symbol}</div>
                    </td>
                    <td className="px-5 py-4 text-sm tabular-nums font-medium" style={{ color: C.slate8 }}>
                      {loading ? <span style={{ color: C.slate5 }}>—</span> : `$${live!.dexPrice.toLocaleString(undefined, { minimumFractionDigits: live!.dexPrice < 1 ? 6 : 2, maximumFractionDigits: live!.dexPrice < 1 ? 6 : 2 })}`}
                    </td>
                    <td className="px-5 py-4 text-sm tabular-nums font-medium" style={{ color: C.slate8 }}>
                      {loading ? <span style={{ color: C.slate5 }}>—</span> : `$${live!.cexPrice.toLocaleString(undefined, { minimumFractionDigits: live!.cexPrice < 1 ? 6 : 2, maximumFractionDigits: live!.cexPrice < 1 ? 6 : 2 })}`}
                    </td>
                    <td className="px-5 py-4">
                      {loading
                        ? <span className="text-xs" style={{ color: C.slate5 }}>Loading…</span>
                        : <SpreadBar net={net} signal={hasSignal} />
                      }
                    </td>
                    <td className="px-5 py-4">
                      {live?.sparkHistory && live.sparkHistory.length > 1
                        ? <Sparkline data={live.sparkHistory} color={hasSignal ? C.amber : net < 0 ? C.red : C.blue} />
                        : <span className="text-xs" style={{ color: C.slate5 }}>—</span>
                      }
                    </td>
                    <td className="px-5 py-4 text-sm font-medium" style={{ color: C.slate8 }}>
                      {loading ? <span style={{ color: C.slate5 }}>—</span> : `$${(live!.dexLiquidity / 1_000_000).toFixed(1)}M`}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full"
                        style={hasSignal
                          ? { background: "rgba(217,119,6,0.1)", color: C.amber }
                          : loading
                          ? { background: C.slate1, color: C.slate5 }
                          : { background: "rgba(37,99,235,0.08)", color: C.blue }
                        }
                      >
                        {hasSignal && <Zap size={10} />}
                        {hasSignal ? "Signal" : loading ? "Loading" : "Active"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Token import */}
        <div style={{ borderTop: `1px solid ${C.slate2}` }}>
          <TokenImport onAdd={onAddToken} />
        </div>
      </div>
    </div>
  );
}

// ─── Signals page ─────────────────────────────────────────────────────────────
function SignalsPage({
  pendingSignals, executing, onApprove, onReject,
}: {
  pendingSignals: ArbSignal[];
  executing: string | null;
  onApprove: (id: string) => Promise<TradeLogEntry | undefined>;
  onReject: (id: string) => void;
}) {
  if (pendingSignals.length === 0) {
    return (
      <div
        className="rounded-xl flex flex-col items-center justify-center py-24 text-center"
        style={{ background: C.white, border: `1px solid ${C.slate2}` }}
      >
        <CheckCircle2 size={40} style={{ color: C.slate2 }} className="mb-4" />
        <div className="text-base font-semibold" style={{ color: C.slate8 }}>No pending signals</div>
        <div className="text-sm mt-1" style={{ color: C.slate5 }}>
          Click "Scan Now" or wait for the auto-scan to detect an opportunity.
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm" style={{ color: C.slate5 }}>
          {pendingSignals.filter(s => s.status === "pending_approval").length} pending · AI-judged · human-approved
        </span>
        <span
          className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
          style={{ background: "rgba(217,119,6,0.1)", color: C.amber }}
        >
          <FlaskConical size={11} /> Simulated execution
        </span>
      </div>
      {pendingSignals.map(signal => (
        <SignalCard
          key={signal.id}
          signal={signal}
          onApprove={onApprove}
          onReject={onReject}
          isExecuting={executing === signal.id}
        />
      ))}
    </div>
  );
}

// ─── Import for TradeLogEntry ─────────────────────────────────────────────────
import type { TradeLogEntry } from "./types";

// ─── Loading / boot screen ────────────────────────────────────────────────────
const BOOT_STEPS = [
  "Connecting to BSC RPC…",
  "Initialising PancakeSwap feed…",
  "Linking Binance ticker stream…",
  "Loading 6 watchlist assets…",
  "Calibrating profit engine…",
  "Agent online.",
];

function LoadingScreen({ onEnter }: { onEnter: () => void }) {
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const t = setInterval(() => {
      setStep(s => {
        if (s >= BOOT_STEPS.length - 1) { clearInterval(t); setDone(true); return s; }
        return s + 1;
      });
    }, 350);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (done) { const t = setTimeout(onEnter, 600); return () => clearTimeout(t); }
  }, [done, onEnter]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: C.bg }}>
      <div
        className="w-full max-w-sm rounded-2xl p-8"
        style={{ background: C.white, border: `1px solid ${C.slate2}`, boxShadow: "0 4px 24px rgba(15,23,42,0.08)" }}
      >
        <div className="flex items-center gap-3 mb-8">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg"
            style={{ background: C.blue, color: C.white }}
          >
            P
          </div>
          <div>
            <div className="font-bold text-lg" style={{ color: C.slate8 }}>Parity</div>
            <div className="text-xs" style={{ color: C.slate5 }}>BSC Arbitrage Co-Pilot</div>
          </div>
        </div>

        <div className="space-y-2.5 mb-6">
          {BOOT_STEPS.map((line, i) => (
            <div key={i} className="flex items-center gap-2.5 text-sm">
              {i < step ? (
                <CheckCircle2 size={14} style={{ color: C.green }} />
              ) : i === step ? (
                <Loader2 size={14} className="animate-spin" style={{ color: C.blue }} />
              ) : (
                <div className="h-3.5 w-3.5 rounded-full border" style={{ borderColor: C.slate2 }} />
              )}
              <span style={{ color: i <= step ? C.slate8 : C.slate5, fontWeight: i === step ? 500 : 400 }}>
                {line}
              </span>
            </div>
          ))}
        </div>

        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: C.slate1 }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${((step + 1) / BOOT_STEPS.length) * 100}%`, background: C.blue }}
          />
        </div>

        {done && (
          <button
            onClick={onEnter}
            className="mt-5 w-full py-2.5 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90"
            style={{ background: C.blue, color: C.white }}
          >
            Open Dashboard
          </button>
        )}

        <p className="mt-4 text-center text-xs" style={{ color: C.slate5 }}>
          AI-judged · human-approved · simulated execution
        </p>
      </div>
    </div>
  );
}

// ─── Main dashboard ───────────────────────────────────────────────────────────
function Dashboard() {
  const [page, setPage] = useState<"watchlist" | "signals" | "tradelog">("watchlist");
  const [now, setNow] = useState(new Date());

  const wallet = useWallet();
  const { tokens, scanLog, scanning, lastScanAt, signalCount: liveSignalCount, runScan, addToken } = useArbScan();
  const { trades, pendingSignals, executing, totalSimulatedPnl, addSignal, approveSignal, rejectSignal } = useTradeLog(wallet.address);

  useEffect(() => {
    const c = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(c);
  }, []);

  // Route signals from scan → pendingSignals
  useEffect(() => {
    tokens.forEach(token => {
      if (!token.live?.hasSignal) return;
      const already = pendingSignals.find(s => s.watchlist_token === token.token_symbol && s.status === "pending_approval");
      if (already) return;
      const profit = token.live.profit;
      const signal: ArbSignal = {
        id: `sig_${Date.now()}_${_signalIdCounter++}`,
        watchlist_token: token.token_symbol,
        token_symbol: token.token_symbol,
        dex_price_usd: token.live.dexPrice,
        cex_price_usd: token.live.cexPrice,
        dex_liquidity_usd: token.live.dexLiquidity,
        trade_size_usd: token.trade_size_usd,
        gross_spread_usd: profit.grossSpreadUsd,
        net_profit_usd: profit.netProfitUsd,
        net_profit_pct: profit.netProfitPct,
        risk_note: generateRiskNote(token.token_symbol, profit.netProfitPct, profit.netProfitUsd, token.live.dexLiquidity),
        status: "pending_approval",
        detected_at: new Date().toISOString(),
        direction: profit.direction === "none" ? "DEX→CEX" : profit.direction,
      };
      addSignal(signal);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokens]);

  const handleAddToken = useCallback((t: WatchlistToken) => addToken(t), [addToken]);

  const avgNet = useMemo(() => {
    const enriched = tokens.filter(t => t.live);
    if (!enriched.length) return 0;
    return enriched.reduce((s, t) => s + (t.live?.profit.netProfitPct ?? 0), 0) / enriched.length;
  }, [tokens]);

  const pendingCount = pendingSignals.filter(s => s.status === "pending_approval").length;

  const pageTitle: Record<string, string> = {
    watchlist: "Watchlist",
    signals: `Signals${pendingCount ? ` — ${pendingCount} Pending` : ""}`,
    tradelog: "Trade Log",
  };
  const pageSub: Record<string, string> = {
    watchlist: "Real-time PancakeSwap ↔ Binance spread monitoring",
    signals: "AI-judged opportunities awaiting your approval",
    tradelog: "Simulated execution history",
  };

  return (
    <div className="flex min-h-screen" style={{ background: C.bg, fontFamily: "Inter, system-ui, sans-serif" }}>
      {/* Sidebar */}
      <Sidebar
        page={page}
        setPage={setPage}
        pendingCount={pendingCount}
        tradeCount={trades.length}
        wallet={{ connected: wallet.connected, shortAddress: wallet.shortAddress, isOnBSC: wallet.isOnBSC }}
      />

      {/* Main */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        {/* Top bar */}
        <TopBar
          title={pageTitle[page]}
          subtitle={pageSub[page]}
          scanning={scanning}
          onScan={runScan}
          now={now}
          pendingCount={pendingCount}
          wallet={wallet}
          onConnect={wallet.connect}
          onDisconnect={wallet.disconnect}
        />

        {/* Stat cards */}
        <div className="flex flex-wrap gap-4 px-6 py-5" style={{ borderBottom: `1px solid ${C.slate2}` }}>
          <StatCard icon={Wifi} label="Tokens Tracked" value={`${tokens.length}`} sub="All active" />
          <StatCard
            icon={TrendingUp}
            label="Avg Net Spread"
            value={`${avgNet >= 0 ? "+" : ""}${avgNet.toFixed(3)}%`}
            sub={avgNet > 0 ? "Above cost threshold" : "Below threshold"}
            valueColor={avgNet > 0 ? C.green : C.red}
          />
          <StatCard
            icon={Zap}
            label="Signals Pending"
            value={`${pendingCount}`}
            sub="Awaiting your approval"
            valueColor={pendingCount > 0 ? C.amber : C.slate8}
          />
          <StatCard
            icon={totalSimulatedPnl >= 0 ? TrendingUp : TrendingDown}
            label="Simulated P&L"
            value={`${totalSimulatedPnl >= 0 ? "+" : ""}$${totalSimulatedPnl.toFixed(2)}`}
            sub={trades.length > 0 ? `${trades.length} trades this session` : "This session"}
            valueColor={totalSimulatedPnl >= 0 ? C.green : C.red}
          />
          <StatCard
            icon={Activity}
            label="Last Scan"
            value={lastScanAt ? lastScanAt.toLocaleTimeString("en-GB", { hour12: false }) : "—"}
            sub={liveSignalCount > 0 ? `${liveSignalCount} signal(s) detected` : "No signals"}
            valueColor={liveSignalCount > 0 ? C.amber : C.slate8}
          />
        </div>

        {/* Page content */}
        <div className="flex-1 p-6 overflow-y-auto">
          {page === "watchlist" && (
            <WatchlistPage tokens={tokens} scanLog={scanLog} scanning={scanning} onAddToken={handleAddToken} />
          )}
          {page === "signals" && (
            <SignalsPage
              pendingSignals={pendingSignals}
              executing={executing}
              onApprove={approveSignal}
              onReject={rejectSignal}
            />
          )}
          {page === "tradelog" && (
            <TradeLog trades={trades} totalSimulatedPnl={totalSimulatedPnl} />
          )}
        </div>

        {/* Footer */}
        <div
          className="flex flex-wrap items-center justify-between px-6 py-3 text-xs gap-2"
          style={{ borderTop: `1px solid ${C.slate2}`, color: C.slate5, background: C.white }}
        >
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <Wifi size={11} style={{ color: C.green }} />
              {tokens.filter(t => t.live && !t.live.error).length}/{tokens.length} feeds healthy
            </span>
            {wallet.connected && (
              <span className="flex items-center gap-1.5">
                <ShieldCheck size={11} style={{ color: C.green }} />
                Wallet read-only · no key stored
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <AlertTriangle size={11} />
            Not financial advice · estimates only
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── App shell ────────────────────────────────────────────────────────────────
export default function ParityApp() {
  const [phase, setPhase] = useState<"loading" | "dashboard">("loading");
  return phase === "loading"
    ? <LoadingScreen onEnter={() => setPhase("dashboard")} />
    : <Dashboard />;
}
