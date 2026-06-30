# parity

Parity is an AI-judged, human-approved BSC arbitrage co-pilot — PancakeSwap ↔ Binance.

## Build loop
```bash
lemma pods import ./arbwatch-backend --dry-run   # validate
lemma pods import ./arbwatch-backend             # upsert by resource name
```

## Non-bundled setup (do these after import)
- Upload any required files: `lemma files upload ./doc.pdf /pod/knowledge/doc.pdf`
- Connect connectors/accounts: `lemma connectors ...`
- Flip schedules/surfaces to active once their targets exist.

## Verify
```bash
lemma pods describe
lemma agents chat hello "what can you do in this pod?"
```
