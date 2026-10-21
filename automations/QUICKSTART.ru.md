# За 2 минуты

Репозиторий уже готов: https://github.com/DALee66/crypto-chart-agent

## Создать Automation

1. Открой https://cursor.com/automations/new
2. **Name:** `Crypto Chart · GRAM daily`
3. **Repository:** `DALee66/crypto-chart-agent` (ветка `main`)
4. **Trigger:** Schedule → каждый день в `09:00` (ваш часовой пояс)  
   Опционально второй триггер: Slack → канал → фильтр `разбери` или `GRAM`
5. **Instructions:** скопируй целиком файл `INSTRUCTIONS.paste.txt` из этой папки
6. **Tools:** включи Send to Slack, если нужен постинг в канал
7. Save → Activate → Run once (проверка)

## Проверка без Automation

Новый Cloud Agent на этом репо → в чат: `разбери GRAM`
