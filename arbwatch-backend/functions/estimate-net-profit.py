def run(input_data, context):
    dex_price = input_data["dex_price_usd"]
    cex_price = input_data["cex_price_usd"]
    dex_liquidity = input_data["dex_liquidity_usd"]
    trade_size_usd = input_data.get("trade_size_usd", 500)

    # PancakeSwap V2 swap fee ~0.25%; Binance spot taker fee ~0.10%
    dex_fee_usd = trade_size_usd * 0.0025
    cex_fee_usd = trade_size_usd * 0.0010

    # Slippage estimate based on trade size vs pool liquidity
    pool_impact = trade_size_usd / max(dex_liquidity, 1)
    estimated_slippage_pct = min(pool_impact * 50, 5.0)  # cap at 5%
    slippage_usd = trade_size_usd * (estimated_slippage_pct / 100)

    # BSC gas estimate
    estimated_gas_usd = 0.40

    gross_spread_usd = trade_size_usd * abs(dex_price - cex_price) / min(dex_price, cex_price)
    total_cost_usd = dex_fee_usd + cex_fee_usd + slippage_usd + estimated_gas_usd
    net_profit_usd = gross_spread_usd - total_cost_usd
    net_profit_pct = (net_profit_usd / trade_size_usd) * 100

    return {
        "dex_fee_usd": round(dex_fee_usd, 4),
        "cex_fee_usd": round(cex_fee_usd, 4),
        "estimated_slippage_pct": round(estimated_slippage_pct, 3),
        "estimated_gas_usd": estimated_gas_usd,
        "gross_spread_usd": round(gross_spread_usd, 4),
        "net_profit_usd": round(net_profit_usd, 4),
        "net_profit_pct": round(net_profit_pct, 3),
    }
