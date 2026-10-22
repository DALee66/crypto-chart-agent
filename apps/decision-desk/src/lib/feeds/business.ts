import type { ProjectFeedSnapshot } from "./types";

export type BusinessMetric = {
  key: string;
  label: string;
  value: string;
  hint: string;
};

export type BusinessBotCard = {
  id: string;
  title: string;
  role: string;
  crypto: string;
  modeLabel: string;
  note: string;
  metrics: BusinessMetric[];
};

const BOT_META: Record<
  string,
  { title: string; role: string }
> = {
  "grid-bot": {
    title: "Сеточный исполнитель",
    role: "Держит лестницу ордеров вокруг рынка и имитирует исполнения",
  },
  "market-maker-bot": {
    title: "Поставщик ликвидности",
    role: "Показывает издержки газа и модель полос котировок",
  },
  "trading-toolkit": {
    title: "Аналитический сигнал",
    role: "BUY / SELL / HOLD по live свечам и рынку Hyperliquid",
  },
  ftui: {
    title: "Пульт мониторинга",
    role: "Состояние рынка выбранной монеты в реальном времени",
  },
  "bot-academy": {
    title: "Учебный контур",
    role: "Paper-run на реальных свечах: always-enter → разбор результата",
  },
};

const METRIC_LABELS: Record<string, { label: string; hint: string }> = {
  symbol: {
    label: "Монета",
    hint: "Инструмент, к которому привязана симуляция",
  },
  marketPrice: {
    label: "Рыночная цена",
    hint: "Live mid с Hyperliquid",
  },
  fillsSimulated: {
    label: "Исполнений (симуляция)",
    hint: "Сколько виртуальных сделок сетки уже «прошло»",
  },
  inventory: {
    label: "Остаток позиции",
    hint: "Условный объём на балансе после симулированных fills",
  },
  openGridLevels: {
    label: "Активных уровней сетки",
    hint: "Сколько ступеней buy/sell висит вокруг цены",
  },
  gasGwei: {
    label: "Газ Ethereum",
    hint: "Реальная стоимость газа для оценки издержек MM",
  },
  spreadBps: {
    label: "Ширина спреда (bps)",
    hint: "Модель отступа котировок от mid",
  },
  bandMid: {
    label: "Центр полос",
    hint: "Опорная точка для buy/sell bands",
  },
  archivedKeeper: {
    label: "Статус движка",
    hint: "Репозиторий keeper в архиве — только учебная модель",
  },
  score: {
    label: "Уверенность модели",
    hint: "0…1 по RSI/MACD/Stoch и рынку: >0.6 покупка, <0.4 продажа",
  },
  signal: {
    label: "Торговый сигнал",
    hint: "BUY / SELL / HOLD с реального рынка",
  },
  rsi: {
    label: "RSI (14)",
    hint: "Индекс силы на live свечах 15m",
  },
  macdHistogram: {
    label: "MACD histogram",
    hint: "Импульс тренда на тех же свечах",
  },
  stochasticK: {
    label: "Stochastic %K",
    hint: "Положение цены в диапазоне последних баров",
  },
  dayChangePct: {
    label: "Изменение за сутки",
    hint: "Ход mid к цене предыдущего дня",
  },
  signalsEmitted: {
    label: "Сигналов ≠ HOLD",
    hint: "Счётчик покупок/продаж за сессию UI",
  },
  openInterest: {
    label: "Открытый интерес",
    hint: "Суммарные открытые перпы на Hyperliquid",
  },
  fundingAnnPct: {
    label: "Funding ≈ год %",
    hint: "Стоимость удержания позиции",
  },
  dayVolumeUsd: {
    label: "Оборот за сутки ($)",
    hint: "Ликвидность инструмента",
  },
  lastBarMovePct: {
    label: "Ход последней свечи",
    hint: "Изменение close предыдущего 15m-бара",
  },
  recentBaseVolume: {
    label: "Объём за ~3ч (base)",
    hint: "Сумма volume последних свечей",
  },
  health: {
    label: "Режим рынка",
    hint: "спокойный / напряжённый по дневному ходу и funding",
  },
  dryRunCycle: {
    label: "Цикл paper-run",
    hint: "Номер пересчёта учебного прогона",
  },
  tradesAnalyzed: {
    label: "Сделок в разборе",
    hint: "Сколько бар-переходов проанализировано",
  },
  wins: {
    label: "Удачных переходов",
    hint: "Бар закрылся выше входа (для long paper)",
  },
  losses: {
    label: "Убыточных переходов",
    hint: "Бар закрылся ниже входа",
  },
  winRatePct: {
    label: "Доля удачных %",
    hint: "Wins / все сделки paper-run",
  },
  paperPnlPct: {
    label: "Paper PnL %",
    hint: "Суммарный результат always-enter на реальных close",
  },
  nextFilter: {
    label: "Следующий фильтр",
    hint: "Что проверить дальше по методологии Academy",
  },
  side: {
    label: "Рабочая сторона",
    hint: "Long/short по суточному направлению рынка",
  },
};

function formatValue(key: string, value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "да" : "нет";
  if (typeof value === "number") {
    if (key.toLowerCase().includes("gwei") || key === "score") {
      return value.toLocaleString("en-US", { maximumFractionDigits: 4 });
    }
    if (Number.isInteger(value)) return String(value);
    return value.toLocaleString("en-US", { maximumFractionDigits: 4 });
  }
  return String(value);
}

export function toBusinessBotCard(
  feed: ProjectFeedSnapshot,
  fallbackSymbol: string
): BusinessBotCard {
  const meta = BOT_META[feed.projectId] ?? {
    title: feed.projectId,
    role: feed.note,
  };
  const crypto = String(feed.metrics.symbol ?? fallbackSymbol).toUpperCase();
  const metrics: BusinessMetric[] = Object.entries(feed.metrics).map(
    ([key, value]) => {
      const dict = METRIC_LABELS[key] ?? {
        label: key,
        hint: "Служебное поле симуляции",
      };
      return {
        key,
        label: dict.label,
        value: formatValue(key, value),
        hint: dict.hint,
      };
    }
  );

  const modeLabel =
    feed.source === "live"
      ? "Только рынок"
      : feed.source === "hybrid"
        ? "Рынок + симуляция"
        : "Симуляция";

  return {
    id: feed.projectId,
    title: meta.title,
    role: meta.role,
    crypto,
    modeLabel,
    note: feed.note,
    metrics,
  };
}
