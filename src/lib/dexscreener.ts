/**
 * Dexscreener API client
 * Docs: https://docs.dexscreener.com/api/reference
 * No API key required.
 */

import type { DexscreenerPair } from "../types";

const BASE = "https://api.dexscreener.com";

/**
 * Get all BSC pairs for a token address, sorted by liquidity (highest first).
 */
export async function getDexscreenerPairs(
  tokenAddress: string
): Promise<DexscreenerPair[]> {
  const url = `${BASE}/token-pairs/v1/bsc/${tokenAddress}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Dexscreener: HTTP ${res.status} for ${tokenAddress}`);
  const data = await res.json();
  const pairs: DexscreenerPair[] = Array.isArray(data) ? data : (data.pairs ?? []);
  return pairs.sort(
    (a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0)
  );
}

/**
 * Get the best DEX price and liquidity for a BSC token.
 * Returns null if no liquid pair found.
 */
export async function getDexPrice(tokenAddress: string): Promise<{
  priceUsd: number;
  liquidityUsd: number;
  symbol: string;
  pairAddress: string;
  dexId: string;
} | null> {
  try {
    const pairs = await getDexscreenerPairs(tokenAddress);
    if (!pairs.length) return null;
    const best = pairs[0];
    return {
      priceUsd: parseFloat(best.priceUsd ?? "0"),
      liquidityUsd: best.liquidity?.usd ?? 0,
      symbol: best.baseToken.symbol,
      pairAddress: best.pairAddress,
      dexId: best.dexId,
    };
  } catch {
    return null;
  }
}

/**
 * Validate a BEP-20 address — check it resolves to a real, liquid pair.
 */
export async function validateBep20Address(address: string): Promise<{
  valid: boolean;
  symbol?: string;
  name?: string;
  liquidityUsd?: number;
  suggestedCexSymbol?: string;
  error?: string;
}> {
  try {
    const pairs = await getDexscreenerPairs(address);
    if (!pairs.length) {
      return { valid: false, error: "No pairs found on Dexscreener for this address." };
    }
    const best = pairs[0];
    const symbol = best.baseToken.symbol;
    return {
      valid: true,
      symbol,
      name: best.baseToken.name,
      liquidityUsd: best.liquidity?.usd ?? 0,
      suggestedCexSymbol: `${symbol}USDT`,
    };
  } catch (e) {
    return { valid: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}
