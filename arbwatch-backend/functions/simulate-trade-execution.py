import random
import time

def run(input_data, context):
    signal_id = input_data.get("signal_id")
    net_profit_usd = input_data.get("net_profit_usd", 0)
    net_profit_pct = input_data.get("net_profit_pct", 0)
    token_symbol = input_data.get("token_symbol", "UNKNOWN")
    
    # Simulate trade delay
    time.sleep(1.2)
    
    # Simulate real-world execution slippage (random between 0.0 and 1.0 percent)
    fill_slippage_pct = random.uniform(0.0, 1.0)
    fill_haircut = net_profit_usd * (fill_slippage_pct / 100)
    final_pnl_usd = net_profit_usd - fill_haircut
    
    outcome_note = f"{token_symbol} DEX→CEX: simulated net P&L ${final_pnl_usd:.2f} " \
                   f"({net_profit_pct:.3f}% estimated, −{fill_slippage_pct:.2f}% fill slippage). " \
                   f"[SIMULATED — no real funds moved]"
    
    return {
        "simulated_net_profit_usd": round(final_pnl_usd, 4),
        "outcome_note": outcome_note,
        "trade_mode": "simulated"
    }
