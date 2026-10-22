# crypto-chart-agent

Облачный агент Cursor для разбора крипто-графиков и **Decision Desk** — данных для решений на реальном рынке (Hyperliquid + газ Ethereum).

Учебный фреймворк, **не** инвестиционный совет.

## Что внутри

| Путь | Назначение |
|------|------------|
| `.cursor/skills/crypto-chart-analysis/` | Навык разбора графиков (структура → риск → funding/OI) |
| `.cursor/skills/decision-desk/` | Навык Decision Desk + `fetch_decision_context.py` |
| `apps/decision-desk/` | Next.js UI: рынок, buy/sell цели, контуры ботов |
| `data/decision-desk/` | Снимки projects / market / feeds / glossary |
| `automations/` | Тексты для Cursor Automations |

## Decision Desk (UI)

```bash
cd apps/decision-desk
npm install
npm run dev
# http://127.0.0.1:43123
```

На экране:

1. Операционный срез (mid / mark / oracle) по выбранной монете  
2. Рекомендации покупки и продажи с ближайшими целями  
3. Риск (funding, OI, премия)  
4. Газ Ethereum  
5. Подсказки и расшифровка атрибутов  
6. Симуляция/контуры ботов: сигнал, пульт и учебный paper-run — **live Hyperliquid**

## Live-контекст для агента

```bash
python3 .cursor/skills/decision-desk/fetch_decision_context.py \
  --symbol BTC -o /tmp/decision_ctx.json
```

```bash
python3 .cursor/skills/crypto-chart-analysis/fetch_market_context.py \
  --symbol GRAMUSDT --market perp --venue okx --tfs 1d,4h,1h -o /tmp/crypto_ctx.json
```

## Automation

1. https://cursor.com/automations/new  
2. Подключите этот репозиторий  
3. Instructions: скилл `crypto-chart-analysis` и/или `decision-desk`  
4. Триггер: расписание или Slack  

## Данные

Снимки в `data/decision-desk/` — справочные. Для решений предпочитайте live-скрипт или UI.
