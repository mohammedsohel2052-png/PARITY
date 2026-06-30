/**
 * TokenImport — classic light-mode token import form
 */
import { useState } from "react";
import { Plus, Loader2, CheckCircle2, AlertTriangle, X } from "lucide-react";
import { validateBep20Address } from "../lib/dexscreener";
import { verifyCexSymbol } from "../lib/binance";
import type { WatchlistToken } from "../types";

const BLUE   = "#2563EB";
const GREEN  = "#16A34A";
const AMBER  = "#D97706";
const RED    = "#DC2626";
const SLATE8 = "#1E293B";
const SLATE5 = "#64748B";
const SLATE2 = "#E2E8F0";
const SLATE1 = "#F1F5F9";
const WHITE  = "#FFFFFF";

interface TokenImportProps {
  onAdd: (token: WatchlistToken) => void;
}

type ImportState = "idle" | "validating" | "success" | "error";

export function TokenImport({ onAdd }: TokenImportProps) {
  const [address, setAddress]       = useState("");
  const [cexOverride, setCexOverride] = useState("");
  const [state, setImportState]     = useState<ImportState>("idle");
  const [message, setMessage]       = useState("");
  const [expanded, setExpanded]     = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.trim()) return;

    setImportState("validating");
    setMessage("");

    try {
      const result = await validateBep20Address(address.trim());
      if (!result.valid) {
        setImportState("error");
        setMessage(result.error ?? "Validation failed");
        return;
      }

      const cexSym = cexOverride.trim() || result.suggestedCexSymbol || `${result.symbol}USDT`;
      const cexValid = await verifyCexSymbol(cexSym);
      if (!cexValid) {
        setImportState("error");
        setMessage(`Symbol "${cexSym}" not found on Binance. Try "${result.symbol}USDT".`);
        return;
      }

      onAdd({
        token_symbol: result.symbol!,
        bsc_token_address: address.trim(),
        cex_symbol: cexSym,
        min_net_profit_pct: 0.3,
        trade_size_usd: 500,
        status: "active",
      });

      setImportState("success");
      setMessage(`${result.symbol} added successfully — liquidity $${((result.liquidityUsd ?? 0) / 1000).toFixed(1)}k`);
      setAddress("");
      setCexOverride("");
      setTimeout(() => { setImportState("idle"); setMessage(""); }, 3000);
    } catch (e) {
      setImportState("error");
      setMessage(e instanceof Error ? e.message : "Unknown error");
    }
  };

  const msgColor = { idle: SLATE5, validating: AMBER, success: GREEN, error: RED }[state];

  if (!expanded) {
    return (
      <div className="flex items-center justify-between px-5 py-3">
        <span className="text-xs font-medium" style={{ color: SLATE5 }}>Import custom BEP-20 token</span>
        <button
          onClick={() => setExpanded(true)}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors"
          style={{ borderColor: BLUE, color: BLUE, background: "rgba(37,99,235,0.04)" }}
        >
          <Plus size={12} /> Add Token
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold" style={{ color: SLATE8 }}>Import BEP-20 Token</span>
        <button
          type="button"
          onClick={() => { setExpanded(false); setImportState("idle"); setMessage(""); }}
          style={{ color: SLATE5 }}
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          value={address}
          onChange={e => setAddress(e.target.value)}
          placeholder="BSC contract address (0x…)"
          className="flex-[2] min-w-[200px] rounded-lg px-3 py-2.5 text-sm outline-none font-mono"
          style={{
            border: `1px solid ${SLATE2}`,
            background: WHITE,
            color: SLATE8,
          }}
          onFocus={e => (e.target.style.borderColor = BLUE)}
          onBlur={e => (e.target.style.borderColor = SLATE2)}
          disabled={state === "validating"}
          required
        />
        <input
          value={cexOverride}
          onChange={e => setCexOverride(e.target.value.toUpperCase())}
          placeholder="Binance symbol (auto-detect)"
          className="flex-1 min-w-[160px] rounded-lg px-3 py-2.5 text-sm outline-none"
          style={{
            border: `1px solid ${SLATE2}`,
            background: WHITE,
            color: SLATE8,
          }}
          onFocus={e => (e.target.style.borderColor = BLUE)}
          onBlur={e => (e.target.style.borderColor = SLATE2)}
          disabled={state === "validating"}
        />
        <button
          type="submit"
          className="flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ background: BLUE, color: WHITE }}
          disabled={state === "validating" || !address.trim()}
        >
          {state === "validating"
            ? <><Loader2 size={13} className="animate-spin" /> Validating…</>
            : <><Plus size={13} /> Validate & Add</>
          }
        </button>
      </div>

      {message && (
        <div className="flex items-center gap-2 text-sm" style={{ color: msgColor }}>
          {state === "success" && <CheckCircle2 size={14} />}
          {state === "error"   && <AlertTriangle size={14} />}
          {state === "validating" && <Loader2 size={14} className="animate-spin" />}
          {message}
        </div>
      )}

      <p className="text-xs" style={{ color: SLATE5 }}>
        Paste any BEP-20 address. Parity will verify it on Dexscreener and confirm the symbol exists on Binance before adding.
      </p>
    </form>
  );
}
