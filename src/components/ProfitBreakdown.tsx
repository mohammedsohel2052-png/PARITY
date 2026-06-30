/**
 * ProfitBreakdown — classic light-mode cost breakdown table
 */
import type { ProfitEstimate } from "../types";

const GREEN = "#16A34A";
const AMBER = "#D97706";
const RED   = "#DC2626";
const SLATE5 = "#64748B";
const SLATE8 = "#1E293B";
const SLATE2 = "#E2E8F0";
const SLATE1 = "#F1F5F9";

interface ProfitBreakdownProps {
  profit: ProfitEstimate;
  tradeSize: number;
}

export function ProfitBreakdown({ profit, tradeSize }: ProfitBreakdownProps) {
  const netColor = profit.netProfitUsd > 0
    ? profit.netProfitPct >= 0.5 ? GREEN : AMBER
    : RED;

  const rows = [
    { label: "Trade size",               value: `$${tradeSize.toFixed(0)}`,          color: SLATE8, prefix: "" },
    { label: "Gross spread",             value: `$${profit.grossSpreadUsd.toFixed(3)}`, color: GREEN, prefix: "+" },
    { label: "PancakeSwap fee (0.25%)",  value: `$${profit.dexFeeUsd.toFixed(3)}`,   color: SLATE5, prefix: "−" },
    { label: "Binance fee (0.10%)",      value: `$${profit.cexFeeUsd.toFixed(3)}`,   color: SLATE5, prefix: "−" },
    { label: `Slippage est. (${profit.slippagePct.toFixed(2)}%)`, value: `$${profit.slippageUsd.toFixed(3)}`, color: SLATE5, prefix: "−" },
    { label: "BSC gas est.",             value: `$${profit.gasUsd.toFixed(2)}`,       color: SLATE5, prefix: "−" },
  ];

  return (
    <div className="rounded-xl overflow-hidden text-sm" style={{ border: `1px solid ${SLATE2}` }}>
      <div className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider" style={{ background: SLATE1, color: SLATE5 }}>
        Cost Breakdown — Pre-trade estimates only
      </div>
      <div className="divide-y" style={{ borderColor: SLATE2 }}>
        {rows.map(row => (
          <div key={row.label} className="flex items-center justify-between px-4 py-2.5">
            <span style={{ color: SLATE5 }}>{row.label}</span>
            <span className="font-medium" style={{ color: row.color }}>
              {row.prefix}{row.value}
            </span>
          </div>
        ))}
        <div className="flex items-center justify-between px-4 py-3" style={{ background: SLATE1 }}>
          <span className="font-semibold" style={{ color: SLATE8 }}>Net estimate</span>
          <div className="flex items-center gap-3">
            <span className="text-xs" style={{ color: SLATE5 }}>{profit.netProfitPct.toFixed(3)}%</span>
            <span className="font-bold" style={{ color: netColor }}>
              {profit.netProfitUsd >= 0 ? "+" : ""}${profit.netProfitUsd.toFixed(3)}
            </span>
          </div>
        </div>
      </div>
      <div className="px-4 py-2 text-xs" style={{ color: SLATE5, background: "#FAFBFC", borderTop: `1px solid ${SLATE2}` }}>
        Assumes price holds between detection and execution. Realized P&L may differ.
      </div>
    </div>
  );
}
