# Decision Desk — данные

Снимки и справочники из Decision Desk (реальный рынок Hyperliquid + газ Ethereum + контуры ботов).

| Файл | Содержание |
|------|------------|
| `projects.json` | Профили 5 открытых проектов (grid / MM / TIP / FTUI / Academy) |
| `attribute-glossary.json` | Бизнес-расшифровка mid, mark, oracle, funding… |
| `market-snapshot-btc.json` | Live-снимок рынка (BTC + сравнение) и рекомендации buy/sell |
| `feeds-snapshot-btc.json` | Контуры ботов: сигнал / пульт / учебный paper-run на live данных |

## Обновление снимков

Из корня репозитория (нужен запущенный desk или прямой API HL):

```bash
curl -s "http://127.0.0.1:43123/api/market?symbol=BTC" | jq . > data/decision-desk/market-snapshot-btc.json
curl -s "http://127.0.0.1:43123/api/feeds?symbol=BTC" | jq . > data/decision-desk/feeds-snapshot-btc.json
```

Либо:

```bash
python3 .cursor/skills/decision-desk/fetch_decision_context.py --symbol BTC -o /tmp/decision_ctx.json
```

Не финансовый совет. Снимки устаревают — для решений предпочитайте live API / desk UI.
