import urllib.request
import json
import math

def get_dex_price(bsc_token_address):
    url = f"https://api.dexscreener.com/token-pairs/v1/bsc/{bsc_token_address}"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req, timeout=5) as response:
            data = json.loads(response.read().decode())
            if not data: return None
            # Filter for BSC pairs on PancakeSwap with USD liquidity >= 1000
            pairs = [p for p in data if p.get('chainId') == 'bsc' and p.get('dexId') == 'pancakeswap' and float(p.get('liquidity', {}).get('usd', 0)) >= 1000]
            if not pairs: return None
            # Sort by liquidity descending
            pairs.sort(key=lambda p: float(p.get('liquidity', {}).get('usd', 0)), reverse=True)
            best_pair = pairs[0]
            return {
                "priceUsd": float(best_pair.get('priceUsd', 0)),
                "liquidityUsd": float(best_pair.get('liquidity', {}).get('usd', 0))
            }
    except Exception:
        return None

def get_binance_price(cex_symbol):
    url = f"https://api.binance.com/api/v3/ticker/price?symbol={cex_symbol}"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req, timeout=5) as response:
            data = json.loads(response.read().decode())
            return float(data.get('price', 0))
    except Exception:
        return None

def run(input_data, context):
    bsc_token_address = input_data.get('bsc_token_address')
    cex_symbol = input_data.get('cex_symbol')
    
    if not bsc_token_address or not cex_symbol:
        raise ValueError("Missing bsc_token_address or cex_symbol in input")

    dex_data = get_dex_price(bsc_token_address)
    cex_price = get_binance_price(cex_symbol)

    if not dex_data or not cex_price:
        raise ValueError("Failed to fetch prices from one or both exchanges")

    dex_price = dex_data['priceUsd']
    dex_liquidity = dex_data['liquidityUsd']

    return {
        "dex_price_usd": dex_price,
        "cex_price_usd": cex_price,
        "dex_liquidity_usd": dex_liquidity,
        "trade_size_usd": input_data.get('trade_size_usd', 500)
    }
