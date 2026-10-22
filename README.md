# crypto-chart-agent · Decision Desk

Дашборд для данных к торговым решениям на реальном рынке (Hyperliquid + газ Ethereum).

**Live UI (GitHub Pages):** https://dalee66.github.io/crypto-chart-agent/

Учебный инструмент, **не** инвестиционный совет.

## Локальный запуск

```bash
npm install
npm run dev
# http://127.0.0.1:43123
```

## Статическая сборка (как на GitHub Pages)

```bash
rm -rf src/app/api   # если ещё есть
GITHUB_PAGES=true npm run build
# результат в out/
```

## Cloud Agent

```bash
python3 .cursor/skills/decision-desk/fetch_decision_context.py --symbol BTC -o /tmp/decision_ctx.json
```

Снимки: `data/decision-desk/`.
