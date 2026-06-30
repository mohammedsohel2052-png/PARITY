/**
 * TradeLog — classic light-mode trade history table
 */
import { TrendingUp, TrendingDown, FlaskConical, ArrowRight } from "lucide-react";
import type { TradeLogEntry } from "../types";

const GREEN  = "#16A34A";
const RED    = "#DC2626";
const AMBER  = "#D97706";
const SLATE8 = "#1E293B";
const SLATE5 = "#64748B";
const SLATE2 = "#E2E8F0";
const SLATE1 = "#F1F5F9";
const BLUE   = "#2563EB";
const WHITE  = "#FFFFFF";

function fmtTime(iso: string) { return new Date(iso).toLocaleTimeString("en-GB", { hour12: false }); }
function fmtDate(iso: string) { return new Date(iso).toLocaleDateString("en-GB", { month: "short", day: "numeric" }); }

interface TradeLogProps {
  trades: TradeLogEntry[];
  totalSimulatedPnl: number;
}

export function TradeLog({ trades, totalSimulatedPnl }: TradeLogProps) {
  if (trades.length === 0) {
    return (
      <div className="space-y-4">
        {/* Session P&L banner */}
        <div
          className="rounded-xl p-5 flex items-center justify-between"
          style={{ background: "rgba(37,99,235,0.04)", border: `1px solid rgba(37,99,235,0.12)` }}
        >
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: BLUE }}>Session P&L</div>
            <div className="text-3xl font-bold" style={{ color: SLATE8 }}>$0.00</div>
            <div className="text-sm mt-0.5" style={{ color: SLATE5 }}>No trades yet this session</div>
          </div>
          <span
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full"
            style={{ background: "rgba(217,119,6,0.1)", color: AMBER }}
          >
            <FlaskConical size={12} /> Simulated Mode
          </span>
        </div>

        <div
          className="rounded-xl flex flex-col items-center justify-center py-20 text-center"
          style={{ background: WHITE, border: `1px solid ${SLATE2}` }}
        >
          <FlaskConical size={40} style={{ color: SLATE2 }} className="mb-4" />
          <div className="text-base font-semibold" style={{ color: SLATE8 }}>No executed trades yet</div>
          <div className="text-sm mt-1.5 max-w-xs" style={{ color: SLATE5 }}>
            Approve a signal in the Signals tab to see simulated execution results here.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Session P&L banner */}
      <div
        className="rounded-xl p-5 flex flex-wrap items-center justify-between gap-4"
        style={{ background: "rgba(37,99,235,0.04)", border: `1px solid rgba(37,99,235,0.12)` }}
      >
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: BLUE }}>Session P&L</div>
          <div className="text-3xl font-bold tabular-nums" style={{ color: totalSimulatedPnl >= 0 ? GREEN : RED }}>
            {totalSimulatedPnl >= 0 ? "+" : ""}${totalSimulatedPnl.toFixed(2)}
          </div>
          <div className="text-sm mt-0.5" style={{ color: SLATE5 }}>
            {trades.length} trade{trades.length !== 1 ? "s" : ""} executed this session
          </div>
        </div>
        <span
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full"
          style={{ background: "rgba(217,119,6,0.1)", color: AMBER }}
        >
          <FlaskConical size={12} /> Simulated Mode · No real funds moved
        </span>
      </div>

      {/* Table */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: WHITE, border: `1px solid ${SLATE2}`, boxShadow: "0 1px 3px rgba(15,23,42,0.06)" }}
      >
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${SLATE2}` }}>
          <span className="text-sm font-semibold" style={{ color: SLATE8 }}>Recent Trades</span>
          <span className="text-xs" style={{ color: SLATE5 }}>All simulated</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ background: SLATE1 }}>
                {["#", "Token", "Direction", "Time", "Est. P&L", "Wallet", "Mode"].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: SLATE5 }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {trades.map((trade, idx) => (
                <tr
                  key={trade.id}
                  className="transition-colors hover:bg-slate-50"
                  style={{ borderTop: `1px solid ${SLATE2}` }}
                >
                  <td className="px-5 py-4 text-sm tabular-nums" style={{ color: SLATE5 }}>
                    {trades.length - idx}
                  </td>
                  <td className="px-5 py-4">
                    <span className="font-semibold text-sm" style={{ color: SLATE8 }}>{trade.token_symbol}</span>
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full w-fit"
                      style={{ background: SLATE1, color: SLATE5 }}
                    >
                      {trade.direction ?? "DEX→CEX"}
                      <ArrowRight size={10} />
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="text-sm font-medium" style={{ color: SLATE8 }}>{fmtTime(trade.executed_at)}</div>
                    <div className="text-xs" style={{ color: SLATE5 }}>{fmtDate(trade.executed_at)}</div>
                  </td>
                  <td className="px-5 py-4">
                    <div
                      className="flex items-center gap-1.5 font-semibold text-sm"
                      style={{ color: trade.simulated_net_profit_usd >= 0 ? GREEN : RED }}
                    >
                      {trade.simulated_net_profit_usd >= 0
                        ? <TrendingUp size={14} />
                        : <TrendingDown size={14} />
                      }
                      {trade.simulated_net_profit_usd >= 0 ? "+" : ""}${trade.simulated_net_profit_usd.toFixed(2)}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm font-mono" style={{ color: SLATE5 }}>
                    {trade.wallet_address === "not_connected"
                      ? <span style={{ color: SLATE5 }}>—</span>
                      : `${trade.wallet_address.slice(0, 6)}…${trade.wallet_address.slice(-4)}`
                    }
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full w-fit"
                      style={{ background: "rgba(217,119,6,0.1)", color: AMBER }}
                    >
                      <FlaskConical size={10} /> Simulated
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div
          className="px-5 py-3 text-xs"
          style={{ borderTop: `1px solid ${SLATE2}`, color: SLATE5, background: SLATE1 }}
        >
          All trades executed in simulation mode · No real funds moved · P&L estimated based on real market prices at time of detection
        </div>
      </div>

      {/* Live mode CTA */}
      <div
        className="rounded-xl p-5 flex items-center justify-between"
        style={{ background: "rgba(37,99,235,0.04)", border: `1px dashed rgba(37,99,235,0.25)` }}
      >
        <div>
          <div className="text-sm font-semibold mb-0.5" style={{ color: SLATE8 }}>Ready to go live?</div>
          <div className="text-xs" style={{ color: SLATE5 }}>Connect your wallet and switch to Live Mode in Settings to execute real trades on BSC.</div>
        </div>
        <button
          className="text-xs font-semibold px-3 py-2 rounded-lg border transition-colors hover:bg-slate-50 flex-shrink-0"
          style={{ borderColor: BLUE, color: BLUE }}
        >
          Go to Settings
        </button>
      </div>
    </div>
  );
}
