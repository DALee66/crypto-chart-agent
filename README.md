# crypto-chart-agent · Decision Desk

Дашборд и агентский контур для **данных к торговым решениям** на реальном рынке (Hyperliquid + газ Ethereum).

Учебный инструмент, **не** инвестиционный совет.

## Запуск UI

```bash
npm install
npm run dev
# http://127.0.0.1:43123
```

## Что на экране

1. Операционный срез (mid / mark / oracle) по выбранной монете  
2. Рекомендации покупки и продажи с ближайшими целями  
3. Риск: funding, открытый интерес, премия  
4. Издержки: газ Ethereum  
5. Подсказки и расшифровка атрибутов  
6. Контуры ботов: сигнал, пульт и учебный paper-run — **live Hyperliquid** (сетка ордеров — симуляция поверх live цены)

## Live API

- `GET /api/market?symbol=BTC`
- `GET /api/feeds?symbol=BTC`

## Для Cloud Agent

```bash
python3 .cursor/skills/decision-desk/fetch_decision_context.py --symbol BTC -o /tmp/decision_ctx.json
```

Справочные снимки: `data/decision-desk/`.
