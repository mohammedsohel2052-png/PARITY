# ArbWatch 🔍⚡

> AI-judged, human-approved cross-venue arbitrage co-pilot for BSC
> Built for the **Gappy AI Hackathon** | June 30, 2026 | Arise To Ascend

---

## What It Does

ArbWatch watches a trader's BSC token shortlist for real price gaps between **PancakeSwap (DEX)** and **Binance (CEX)**.

The pipeline:
1. **Detects** price gaps using live Dexscreener + Binance public APIs
2. **Costs** the gap — subtracts swap fees (0.25%), exchange fees (0.10%), slippage, and BSC gas before calling anything "profitable"
3. **AI judges** the net result — the Arb Analyst agent writes a plain-English risk note
4. **Human approves** — you see the full cost breakdown and AI note before clicking Approve
5. **Simulated execution** runs the full pipeline, logs the result, sends a Telegram alert

**This is not a black-box autotrader.** It's a transparent decision pipeline — deterministic math where math is correct, AI judgment where judgment is needed, human in the loop wherever real consequences exist.

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | React + Vite + TypeScript + Tailwind |
| Wallet | ethers.js + EIP-1193 (MetaMask / any injected provider) |
| DEX prices | [Dexscreener API](https://docs.dexscreener.com) (no key needed) |
| CEX prices | [Binance public ticker API](https://api.binance.com) (no key needed) |
| Backend | [Lemma SDK](https://lemma.work) — Tables, Functions, Agent, Workflows, Approvals, Surfaces |
| Alerts | Telegram via Lemma Surface |

---

## Project Structure

```
Parity/
├── src/                        # React frontend
│   ├── App.tsx                 # Main dashboard
│   ├── components/
│   │   ├── WalletConnect.tsx   # MetaMask connect
│   │   ├── TokenImport.tsx     # BEP-20 import + validation
│   │   ├── SignalCard.tsx      # Signal with cost breakdown + AI note
│   │   ├── TradeLog.tsx        # Simulated trade history
│   │   └── ProfitBreakdown.tsx # Inline fee/slippage/gas breakdown
│   ├── hooks/
│   │   ├── useWallet.ts        # EIP-1193 wallet state
│   │   ├── useArbScan.ts       # Live price scanning + profit engine
│   │   └── useTradeLog.ts      # Simulated execution + P&L tracking
│   ├── lib/
│   │   ├── profitEngine.ts     # Fee/slippage/gas math (PRD §6.4)
│   │   ├── dexscreener.ts      # Dexscreener API client
│   │   ├── binance.ts          # Binance ticker client
│   │   └── wallet.ts           # EIP-1193 wallet helpers
│   └── types/index.ts          # Shared TypeScript types
│
└── arbwatch-backend/           # Lemma pod (backend)
    ├── functions/
    │   ├── check-arb-opportunity.py    # DEX + CEX price fetch
    │   ├── estimate-net-profit.py      # Cost model (exact PRD §6.4)
    │   └── simulate-trade-execution.py # Simulated fill + Telegram
    ├── agents/arb-analyst.yaml         # AI judgment agent
    ├── workflows/scan_watchlist.yaml   # Full pipeline workflow
    └── tables/                         # watchlist, arb_signals, trade_log, wallet_connections
```

---

## Lemma SDK Utilization (9 primitives)

| Primitive | Role |
|---|---|
| **Tables** | `watchlist`, `arb_signals`, `trade_log`, `wallet_connections` |
| **Files** | `trading-playbook.md` — fee assumptions searchable by agent |
| **Agents** | Arb Analyst — AI judgment on net-costed opportunities |
| **Functions** | Price fetch, profit math, simulated execution, token validation |
| **Workflows** | `scan_watchlist` (main pipeline), `import_token` (onboarding) |
| **Approvals** | Human gate before every simulated execution |
| **Apps** | React dashboard |
| **Surfaces** | Telegram alerts + approval notifications |
| **Schedules** | CRON trigger every 5 minutes |

---

## Security

- ✅ No private key or seed phrase is ever stored anywhere
- ✅ Only the **public wallet address** is persisted
- ✅ Every trade log entry is labeled **SIMULATED EXECUTION** — visible badge, not buried in settings
- ✅ AI risk note always says "estimate" — never promises a specific profit
- ✅ Wallet connect only reads the address — no signing of value-moving transactions

---

## Running Locally

```bash
# Install dependencies
npm install

# Start dev server
npm run dev
```

Then open http://localhost:5173

---

## Token Watchlist (Default — Real BSC Addresses)

| Token | BSC Address | Binance Symbol |
|---|---|---|
| CAKE | `0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82` | CAKEUSDT |
| BTCB | `0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c` | BTCUSDT |
| ETH | `0x2170ed0880ac9a755fd29b2688956bd959f933f8` | ETHUSDT |
| BNB | `0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c` | BNBUSDT |
| XRP | `0x1d2f0da169ceb9fc7b3144628db156f3f6c60dbe` | XRPUSDT |
| ADA | `0x3ee2200efb3400fabb9aacf31297cbdd1d435d47` | ADAUSDT |

---

## Built By

**Arise To Ascend** — Mohammed Sohel  
Gappy AI Hackathon | June 24–30, 2026

> Not financial advice. All demo executions are simulated. No real funds move.
