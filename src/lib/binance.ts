/**
 * Binance public ticker API client.
 * No API key required — public market data endpoints only.
 * Never call trading endpoints from the browser.
 */

const BINANCE_BASE = "https://api.binance.com/api/v3";

export async function getBinancePrice(symbol: string): Promise<number | null> {
  try {
    const res = await fetch(`${BINANCE_BASE}/ticker/price?symbol=${symbol.toUpperCase()}`);
    if (!res.ok) return null;
    const data = await res.json();
    return parseFloat(data.price);
  } catch {
    return null;
  }
}

export async function getBinanceTicker24h(symbol: string): Promise<{
  price: number;
  priceChangePercent: number;
  volume: number;
  quoteVolume: number;
} | null> {
  try {
    const res = await fetch(`${BINANCE_BASE}/ticker/24hr?symbol=${symbol.toUpperCase()}`);
    if (!res.ok) return null;
    const data = await res.json();
    return {
      price: parseFloat(data.lastPrice),
      priceChangePercent: parseFloat(data.priceChangePercent),
      volume: parseFloat(data.volume),
      quoteVolume: parseFloat(data.quoteVolume),
    };
  } catch {
    return null;
  }
}

export async function verifyCexSymbol(symbol: string): Promise<boolean> {
  const price = await getBinancePrice(symbol);
  return price !== null && price > 0;
}

export async function getBatchPrices(
  symbols: string[]
): Promise<Map<string, number | null>> {
  const results = await Promise.allSettled(
    symbols.map(async (sym) => ({ sym, price: await getBinancePrice(sym) }))
  );
  const map = new Map<string, number | null>();
  for (const r of results) {
    if (r.status === "fulfilled") map.set(r.value.sym, r.value.price);
  }
  return map;
}
