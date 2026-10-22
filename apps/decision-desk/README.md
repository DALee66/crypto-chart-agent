# Decision Desk (часть crypto-chart-agent)

Веб-дашборд для принятия решений на реальных рыночных данных.

## Запуск

```bash
npm install
npm run dev
```

Откройте [http://127.0.0.1:43123](http://127.0.0.1:43123).

## API

- `GET /api/market?symbol=BTC` — рынок, рекомендации, glossary-поля
- `GET /api/feeds?symbol=BTC` — контуры ботов (live сигнал / пульт / academy)

## Источники

- Hyperliquid `metaAndAssetCtxs`, `candleSnapshot`
- Ethereum `eth_gasPrice` (publicnode)

Не финансовый совет.
