import type { WatchlistToken, ArbSignal, TradeLogEntry } from "../types";

// Mock Supabase client using localStorage to mimic persistence for the hackathon
// since we don't have a live Supabase DB instance connection string yet.

class MockSupabaseTable<T extends { id?: string | number; token_symbol?: string }> {
  private tableName: string;
  constructor(tableName: string) { this.tableName = tableName; }

  private getData(): T[] {
    try {
      const d = localStorage.getItem(`parity_${this.tableName}`);
      return d ? JSON.parse(d) : [];
    } catch { return []; }
  }

  private setData(data: T[]) {
    localStorage.setItem(`parity_${this.tableName}`, JSON.stringify(data));
  }

  async select() {
    return { data: this.getData(), error: null };
  }

  async insert(item: T) {
    const data = this.getData();
    data.push(item);
    this.setData(data);
    return { error: null };
  }

  async update(item: Partial<T>, match: { id: string }) {
    const data = this.getData();
    const idx = data.findIndex(d => d.id === match.id);
    if (idx !== -1) {
      data[idx] = { ...data[idx], ...item };
      this.setData(data);
    }
    return { error: null };
  }
}

export const supabase = {
  from: (table: string) => {
    switch (table) {
      case 'watchlist':
        return new MockSupabaseTable<WatchlistToken>(table);
      case 'arb_signals':
        return new MockSupabaseTable<ArbSignal>(table);
      case 'trade_log':
        return new MockSupabaseTable<TradeLogEntry>(table);
      case 'wallet_connections':
        return new MockSupabaseTable<any>(table);
      default:
        return new MockSupabaseTable<any>(table);
    }
  }
};
