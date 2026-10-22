# Decision Desk — навык

Используй, когда пользователь просит данные для решения, рекомендации buy/sell с целями, контуры ботов или live-метрики Hyperliquid (mid/mark/oracle/funding/OI).

## Источники (только реальный рынок)

1. Hyperliquid `metaAndAssetCtxs` — mid, mark, oracle, funding, OI, premium, оборот
2. Hyperliquid `candleSnapshot` — свечи для сигнала и paper-run
3. Ethereum `eth_gasPrice` — газ L1

Симуляция допустима только для **сетки ордеров** поверх live mid. Сигнал, пульт и учебный контур — с live данных.

## Перед ответом

```bash
python3 .cursor/skills/decision-desk/fetch_decision_context.py \
  --symbol BTC -o /tmp/decision_ctx.json
```

Читай JSON. Не выдумывай цены из памяти.

## Как отвечать

- На русском, бизнесовым языком, если так просят
- Указывай монету в каждом блоке
- Разделяй: операционный срез / риск / издержки / buy·sell цели / контуры
- Всегда: не финансовый совет; при высокой неопределённости предпочитай «не торговать»

## UI

Веб-дашборд: `apps/decision-desk/` (`npm install && npm run dev`).
Справочные снимки: `data/decision-desk/`.
