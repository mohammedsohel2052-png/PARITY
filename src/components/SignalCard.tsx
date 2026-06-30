/**
 * SignalCard — classic light-mode signal approval card
 */
import { useState } from "react";
import {
  Zap, XCircle, ArrowUpRight, ArrowDownLeft,
  ShieldCheck, ShieldAlert, ChevronDown, ChevronUp, Loader2, FlaskConical,
} from "lucide-react";
import { ProfitBreakdown } from "./ProfitBreakdown";
import type { ArbSignal } from "../types";

const BLUE  = "#2563EB";
const GREEN = "#16A34A";
const AMBER = "#D97706";
const RED   = "#DC2626";
const SLATE8 = "#1E293B";
const SLATE5 = "#64748B";
const SLATE2 = "#E2E8F0";
const SLATE1 = "#F1F5F9";
const WHITE  = "#FFFFFF";

function fmtRelative(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return `${Math.round(diff)}s ago`;
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
  return `${Math.round(diff / 3600)}h ago`;
}

interface SignalCardProps {
  signal: ArbSignal;
  onApprove: (id: string) => Promise<unknown>;
  onReject: (id: string) => void;
  isExecuting: boolean;
}

export function SignalCard({ signal, onApprove, onReject, isExecuting }: SignalCardProps) {
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [approving, setApproving] = useState(false);

  const isPending  = signal.status === "pending_approval";
  const isExecuted = signal.status === "executed";
  const isRejected = signal.status === "rejected";

  const netColor = signal.net_profit_pct >= 0.5 ? GREEN : signal.net_profit_pct >= 0.3 ? AMBER : RED;
  const riskGood = signal.net_profit_pct >= 0.5 && signal.dex_liquidity_usd >= 50_000;

  const leftBorderColor = isPending ? AMBER : isExecuted ? GREEN : SLATE2;

  const handleApprove = async () => {
    setApproving(true);
    await onApprove(signal.id);
    setApproving(false);
  };

  return (
    <div
      className="rounded-xl overflow-hidden transition-opacity"
      style={{
        background: WHITE,
        border: `1px solid ${SLATE2}`,
        borderLeft: `4px solid ${leftBorderColor}`,
        boxShadow: "0 1px 3px rgba(15,23,42,0.06)",
        opacity: isRejected || isExecuted ? 0.6 : 1,
      }}
    >
      <div className="p-5">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-lg font-bold" style={{ color: SLATE8 }}>{signal.token_symbol}</span>

              {isPending && (
                <span
                  className="text-xs font-semibold px-2.5 py-0.5 rounded-full animate-pulse"
                  style={{ background: "rgba(217,119,6,0.1)", color: AMBER }}
                >
                  Pending Approval
                </span>
              )}
              {isExecuted && (
                <span
                  className="flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full"
                  style={{ background: "rgba(22,163,74,0.1)", color: GREEN }}
                >
                  <Zap size={10} /> Executed (simulated)
                </span>
              )}
              {isRejected && (
                <span
                  className="flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full"
                  style={{ background: SLATE1, color: SLATE5 }}
                >
                  <XCircle size={10} /> Rejected
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs" style={{ color: SLATE5 }}>
              {signal.direction === "DEX→CEX"
                ? <ArrowUpRight size={12} />
                : <ArrowDownLeft size={12} />
              }
              {signal.direction} · {fmtRelative(signal.detected_at)}
            </div>
          </div>

          <div className="text-right">
            <div className="text-2xl font-bold tabular-nums" style={{ color: netColor }}>
              {signal.net_profit_pct >= 0 ? "+" : ""}{signal.net_profit_pct.toFixed(3)}%
            </div>
            <div className="text-sm font-medium" style={{ color: netColor }}>
              est. ${signal.net_profit_usd.toFixed(3)} net
            </div>
            <div className="text-xs" style={{ color: SLATE5 }}>
              gross ${signal.gross_spread_usd.toFixed(3)}
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "PancakeSwap (DEX)", value: `$${signal.dex_price_usd.toLocaleString(undefined, { minimumFractionDigits: signal.dex_price_usd < 1 ? 6 : 2 })}` },
            { label: "Binance (CEX)",     value: `$${signal.cex_price_usd.toLocaleString(undefined, { minimumFractionDigits: signal.cex_price_usd < 1 ? 6 : 2 })}` },
            { label: "Pool Liquidity",    value: `$${(signal.dex_liquidity_usd / 1_000_000).toFixed(2)}M` },
            { label: "Trade Size",        value: `$${signal.trade_size_usd}` },
          ].map(item => (
            <div key={item.label} className="rounded-lg px-3 py-2.5" style={{ background: SLATE1, border: `1px solid ${SLATE2}` }}>
              <div className="text-xs uppercase tracking-wider font-semibold mb-1" style={{ color: SLATE5 }}>{item.label}</div>
              <div className="font-semibold text-sm tabular-nums" style={{ color: SLATE8 }}>{item.value}</div>
            </div>
          ))}
        </div>

        {/* AI Risk box */}
        <div
          className="mt-4 rounded-lg p-3.5 flex items-start gap-3"
          style={{
            background: riskGood ? "rgba(22,163,74,0.06)" : "rgba(217,119,6,0.06)",
            border: `1px solid ${riskGood ? "rgba(22,163,74,0.2)" : "rgba(217,119,6,0.2)"}`,
          }}
        >
          {riskGood
            ? <ShieldCheck size={16} style={{ color: GREEN, flexShrink: 0, marginTop: 2 }} />
            : <ShieldAlert size={16} style={{ color: AMBER, flexShrink: 0, marginTop: 2 }} />
          }
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span
                className="text-xs font-bold px-1.5 py-0.5 rounded"
                style={{ background: BLUE, color: WHITE }}
              >
                AI
              </span>
              <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: riskGood ? GREEN : AMBER }}>
                {riskGood ? "Low Risk" : "Moderate Risk"}
              </span>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: SLATE8 }}>{signal.risk_note}</p>
          </div>
        </div>

        {/* Breakdown toggle */}
        <button
          className="mt-3 flex items-center gap-1 text-xs font-medium transition-colors"
          style={{ color: BLUE }}
          onClick={() => setShowBreakdown(v => !v)}
        >
          {showBreakdown ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          {showBreakdown ? "Hide" : "Show"} cost breakdown
        </button>

        {showBreakdown && (
          <div className="mt-3">
            <ProfitBreakdown
              profit={{
                dexFeeUsd:      signal.trade_size_usd * 0.0025,
                cexFeeUsd:      signal.trade_size_usd * 0.001,
                slippagePct:    Math.min((signal.trade_size_usd / Math.max(signal.dex_liquidity_usd, 1)) * 50, 5),
                slippageUsd:    signal.trade_size_usd * Math.min((signal.trade_size_usd / Math.max(signal.dex_liquidity_usd, 1)) * 50, 5) / 100,
                gasUsd:         0.40,
                grossSpreadUsd: signal.gross_spread_usd,
                grossSpreadPct: (signal.gross_spread_usd / signal.trade_size_usd) * 100,
                totalCostUsd:   signal.trade_size_usd * 0.0025 + signal.trade_size_usd * 0.001 + 0.40,
                netProfitUsd:   signal.net_profit_usd,
                netProfitPct:   signal.net_profit_pct,
                direction:      signal.direction,
              }}
              tradeSize={signal.trade_size_usd}
            />
          </div>
        )}

        {/* Action buttons */}
        {isPending && (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              onClick={handleApprove}
              disabled={approving || isExecuting}
              className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: BLUE, color: WHITE }}
            >
              {approving ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
              {approving ? "Executing…" : "Approve & Execute"}
            </button>
            <button
              onClick={() => onReject(signal.id)}
              disabled={approving}
              className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold border transition-colors hover:bg-slate-50 disabled:opacity-50"
              style={{ borderColor: SLATE2, color: SLATE8 }}
            >
              <XCircle size={14} />
              Reject
            </button>
            <span className="ml-auto flex items-center gap-1.5 text-xs" style={{ color: SLATE5 }}>
              <FlaskConical size={11} style={{ color: AMBER }} />
              Simulated · no real funds move
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
