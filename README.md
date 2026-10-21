# crypto-chart-agent

Облачный агент Cursor для разбора крипто-графиков (структура → риск → funding/OI).

Учебный фреймворк, **не** инвестиционный совет.

## Что внутри

| Путь | Назначение |
|------|------------|
| `.cursor/skills/crypto-chart-analysis/` | Навык агента: `SKILL.md`, скрипт данных, справочник |
| `automations/PROMPT.ru.md` | Готовый текст для [Cursor Automations](https://cursor.com/automations/new) |
| `automations/SETUP.ru.md` | Как подключить Automation |

## Быстрый старт (Cloud Agent)

```bash
python3 .cursor/skills/crypto-chart-analysis/fetch_market_context.py \
  --symbol GRAMUSDT --market perp --venue okx --tfs 1d,4h,1h -o /tmp/crypto_ctx.json
```

Дальше в чате: «разбери GRAM» — агент следует скиллу.

## Automation

1. Откройте https://cursor.com/automations/new  
2. Подключите **этот** репозиторий  
3. В Instructions — `automations/PROMPT.ru.md` или кратко: «Следуй скиллу crypto-chart-analysis»  
4. Триггер: расписание или Slack  

## Данные

В Cursor Cloud VM обычно доступны OKX / Bitget / Binance Vision. Основной Binance fapi и Bybit часто недоступны по гео.
