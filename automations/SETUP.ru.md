# Как перенести навык этого агента в Automations

Коротко: **Automations** — это автозапуск облачного агента по расписанию или из Slack. Навык туда «кнопкой не переносится»: его кладут в репозиторий или вставляют в текст инструкции.

Сейчас у этого чата **нет подключённого git-репозитория**, поэтому создать Automation из API агента нельзя. Нужно один раз настроить в браузере (2–5 минут).

## Вариант A (удобный): со скиллом в репозитории

1. В любом вашем репо создайте папку:
   ```text
   .cursor/skills/crypto-chart-analysis/
   ```
2. Скопируйте туда файлы из этого агента:
   - `SKILL.md`
   - `reference.md`
   - `fetch_market_context.py`  
   Готовый набор лежит в `/agent/.cursor/skills/crypto-chart-analysis/` (и в store сессии).
3. Сделайте commit и push.
4. Откройте https://cursor.com/automations/new
5. Заполните:
   - **Name:** `Crypto Chart Analyst`
   - **Trigger:** например каждый будний день 09:00, или Slack: новое сообщение с фильтром `GRAM` / `разбери`
   - **Instructions:** вставьте текст из `PROMPT.ru.md` (можно коротко: «Следуй скиллу crypto-chart-analysis. Тикер из сообщения, иначе GRAMUSDT. Ответ на простом русском.»)
   - **Repository:** тот репозиторий, куда положили `.cursor/skills/...`
   - **Tools:** при необходимости «Send to Slack»
6. Save → Activate.
7. Запустите вручную один раз и проверьте ответ.

## Вариант B (без репозитория)

1. https://cursor.com/automations/new
2. **Repository:** No repository
3. **Instructions:** вставьте **весь** `PROMPT.ru.md`
4. Trigger: расписание или Slack
5. Save → Activate

Минус: скрипт не лежит в git — агент каждый раз поднимает данные через curl/OKX по инструкции в промпте.

## Вариант C: из локального Cursor

В обычном Agent-чате на десктопе: `/automate` → опишите  
«Каждый день разбирать GRAM по скиллу crypto-chart-analysis и писать коротко в Slack».  
Cursor сам предложит триггеры и поля — проверьте репозиторий со скиллом.

## Важно

| Что | Как |
|-----|-----|
| Личные skills из `~/.cursor/skills` | Для **обычных** Cloud Agents можно включить Sync Skills. Для **Automations** надёжнее репо или текст в Instructions. |
| Биллинг | Каждый запуск = Cloud Agent usage |
| Этот чат | Навык уже есть в store; Automation живёт на https://cursor.com/automations |

## Файлы в этой папке

| Файл | Зачем |
|------|--------|
| `SETUP.ru.md` | Эта инструкция |
| `PROMPT.ru.md` | Готовый текст Instructions |
| `../.cursor/skills/crypto-chart-analysis/` | Пакет навыка для коммита в репо |
