/**
 * WalletConnect — classic light-mode style
 */
import { Wallet, LogOut, AlertTriangle, Loader2 } from "lucide-react";
import type { WalletState } from "../types";

const BLUE  = "#2563EB";
const GREEN = "#16A34A";
const AMBER = "#D97706";
const RED   = "#DC2626";

interface WalletConnectProps {
  state: WalletState & { isOnBSC: boolean; shortAddress: string | null };
  onConnect: () => void;
  onDisconnect: () => void;
}

export function WalletConnect({ state, onConnect, onDisconnect }: WalletConnectProps) {
  const { connected, connecting, address, isOnBSC, shortAddress, error } = state;

  if (connecting) {
    return (
      <div
        className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm border"
        style={{ borderColor: "#E2E8F0", color: "#64748B" }}
      >
        <Loader2 size={13} className="animate-spin" style={{ color: BLUE }} />
        Connecting…
      </div>
    );
  }

  if (connected && address) {
    return (
      <div className="flex items-center gap-2">
        <span
          className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
          style={{
            background: isOnBSC ? "rgba(22,163,74,0.08)" : "rgba(220,38,38,0.08)",
            color: isOnBSC ? GREEN : RED,
          }}
        >
          {isOnBSC ? "BSC" : "Wrong network"}
        </span>
        <div
          className="flex items-center gap-2 rounded-lg px-3 py-1.5 border"
          style={{ borderColor: "#E2E8F0", background: "#F8FAFC" }}
        >
          <span className="relative flex h-2 w-2 flex-shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-50" style={{ background: GREEN }} />
            <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: GREEN }} />
          </span>
          <span className="text-sm font-medium" style={{ color: "#1E293B" }}>{shortAddress}</span>
          <button
            onClick={onDisconnect}
            className="transition-colors ml-1"
            style={{ color: "#94A3B8" }}
            title="Disconnect"
          >
            <LogOut size={12} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={onConnect}
        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-opacity hover:opacity-90"
        style={{ background: BLUE, color: "#FFFFFF" }}
      >
        <Wallet size={13} />
        Connect Wallet
      </button>
      {error && (
        <div className="flex items-center gap-1 text-xs" style={{ color: AMBER }}>
          <AlertTriangle size={10} />
          <span className="max-w-[180px] truncate">{error}</span>
        </div>
      )}
    </div>
  );
}
