export type ProjectCategory =
  | "execution"
  | "market-making"
  | "toolkit"
  | "monitoring"
  | "education";

export type Maturity = "alpha" | "active" | "archived" | "educational";

export type DataCapability = {
  id: string;
  label: string;
  description: string;
};

export type ProcessedProject = {
  id: string;
  alias: string;
  name: string;
  shortName: string;
  category: ProjectCategory;
  maturity: Maturity;
  summary: string;
  verifiedSummary: string;
  sourceClaim: string;
  repo: {
    owner: string;
    name: string;
    url: string;
    defaultBranch: string;
  };
  relatedLinks: { label: string; url: string }[];
  language: string;
  license: string | null;
  stars: number;
  forks: number;
  openIssues: number;
  archived: boolean;
  lastPush: string;
  topics: string[];
  exchanges: string[];
  markets: string[];
  realtime: {
    websocket: boolean;
    rest: boolean;
    notes: string;
  };
  features: string[];
  outputs: DataCapability[];
  inputs: string[];
  stack: string[];
  installHint: string;
  riskNotes: string[];
  fitFor: string[];
  notFor: string[];
  confidence: "high" | "medium" | "low";
  matchNotes: string;
};

export const CATEGORY_LABELS: Record<ProjectCategory, string> = {
  execution: "Исполнение / стратегии",
  "market-making": "Маркет-мейкинг",
  toolkit: "Торговый toolkit",
  monitoring: "Мониторинг",
  education: "Обучение",
};

export const MATURITY_LABELS: Record<Maturity, string> = {
  alpha: "Alpha",
  active: "Активный",
  archived: "Архив",
  educational: "Учебный",
};

/**
 * Structured, verified profiles extracted from public READMEs,
 * GitHub metadata, and project docs (snapshot date in meta).
 */
export const projects: ProcessedProject[] = [
  {
    id: "grid-bot",
    alias: "grid-bot",
    name: "Hyperliquid Grid Bot",
    shortName: "HL Grid",
    category: "execution",
    maturity: "educational",
    summary:
      "Расширяемый грид-бот для Hyperliquid DEX с YAML-конфигами, риск-менеджментом и обучающими WebSocket-скриптами.",
    verifiedSummary:
      "Chainstack Labs публикует Python-бота (uv) для сеточного трейдинга на Hyperliquid: уровни сетки, auto price range, stop-loss / take-profit / max drawdown, rebalance при уходе цены. Отдельные learning_examples закрывают market data, account state, лимитные ордера и realtime WebSocket цены. По умолчанию ориентирован на testnet.",
    sourceClaim:
      "Специализированный автоматизированный грид-бот для биржи Hyperliquid, работающий с данными в реальном времени через WebSocket.",
    repo: {
      owner: "chainstacklabs",
      name: "hyperliquid-trading-bot",
      url: "https://github.com/chainstacklabs/hyperliquid-trading-bot",
      defaultBranch: "main",
    },
    relatedLinks: [
      {
        label: "HL Grid (octo-grid) — production-style WS grid",
        url: "https://github.com/Godofbush/octo-grid",
      },
      {
        label: "Hyperliquid docs / faucet (Chainstack)",
        url: "https://faucet.chainstack.com/hyperliquid-testnet-faucet",
      },
    ],
    language: "Python",
    license: "Apache-2.0",
    stars: 84,
    forks: 0,
    openIssues: 0,
    archived: false,
    lastPush: "2026-09-18T18:10:56Z",
    topics: ["hyperliquid", "grid", "dex", "websocket", "python"],
    exchanges: ["Hyperliquid"],
    markets: ["Spot / perps via HL API (BTC grid example)"],
    realtime: {
      websocket: true,
      rest: true,
      notes:
        "learning_examples/01_websockets/realtime_prices.py — поток цен; основной бот использует API HL, WS — для обучения realtime-потокам.",
    },
    features: [
      "YAML-стратегии (уровни, range_pct, allocation)",
      "Риск: SL / TP / max drawdown / position cap",
      "Rebalance при уходе цены из диапазона",
      "Валидация конфига --validate",
      "Обучающие скрипты market/account/trading/WS",
    ],
    outputs: [
      {
        id: "grid-orders",
        label: "Сетка ордеров",
        description:
          "Размещённые buy/sell уровни вокруг mid-цены согласно levels и price_range.",
      },
      {
        id: "risk-exits",
        label: "Сигналы выхода",
        description:
          "Срабатывания stop-loss, take-profit, max drawdown и rebalance.",
      },
      {
        id: "ws-ticks",
        label: "Realtime тики (learning)",
        description:
          "Поток цен через WebSocket в обучающих примерах.",
      },
      {
        id: "account-state",
        label: "Состояние аккаунта",
        description:
          "User state, open orders, market metadata через REST-примеры.",
      },
    ],
    inputs: [
      "HYPERLIQUID_TESTNET_PRIVATE_KEY",
      "bots/*.yaml (symbol, levels, range, risk)",
    ],
    stack: ["Python", "uv", "Hyperliquid API", "YAML"],
    installHint:
      "git clone … && uv sync && cp .env.example .env && uv run src/run_bot.py --validate",
    riskNotes: [
      "Только educational/research; риск потери капитала.",
      "Сначала testnet и малые размеры.",
    ],
    fitFor: [
      "Изучение Hyperliquid API",
      "Прототип сеточной стратегии на testnet",
      "Разбор WS vs REST для market data",
    ],
    notFor: [
      "Production HFT без доработки",
      "Мультибиржевой арбитраж",
    ],
    confidence: "high",
    matchNotes:
      "Лучшее публичное совпадение с описанием «Hyperliquid + grid + WebSocket». Близкий production-вариант: Godofbush/octo-grid (WS-first fills, reconciliation).",
  },
  {
    id: "market-maker-bot",
    alias: "market-maker-bot",
    name: "Market Maker Bot",
    shortName: "MM Keeper",
    category: "market-making",
    maturity: "archived",
    summary:
      "Классический Maker Keeper Framework: полосы ордеров на CEX/DEX и гибкие провайдеры gas-цены для Ethereum.",
    verifiedSummary:
      "sky-ecosystem/market-maker-keeper (ранее makerdao) — Python keepers, которые держат buy/sell bands (min/avg/max margin & amount) на множестве площадок (OasisDEX, 0x, HitBTC, OKEX, Gate.io и др.). Модуль gas.py подключает fixed / dynamic / oracle / legacy smart gas; поддержка EthGasStation, Etherchain, POA Network, агрегатора pygasprice-client. Репозиторий archived (последний push ~2023), но остаётся эталоном MM + gas.",
    sourceClaim:
      "Инструмент для предоставления ликвидности, который также может отображать цены газа в сетях вроде Ethereum в реальном времени.",
    repo: {
      owner: "sky-ecosystem",
      name: "market-maker-keeper",
      url: "https://github.com/sky-ecosystem/market-maker-keeper",
      defaultBranch: "master",
    },
    relatedLinks: [
      {
        label: "gas.py — провайдеры газа",
        url: "https://github.com/sky-ecosystem/market-maker-keeper/blob/master/market_maker_keeper/gas.py",
      },
      {
        label: "Uniswap V3 demo MM (jamesbachini)",
        url: "https://github.com/jamesbachini/Market-Maker-Bot",
      },
    ],
    language: "Python",
    license: "AGPL-3.0",
    stars: 494,
    forks: 184,
    openIssues: 10,
    archived: true,
    lastPush: "2023-03-15T21:26:50Z",
    topics: ["dai", "ethereum", "maker-keeper", "stablecoin"],
    exchanges: [
      "OasisDEX",
      "EtherDelta",
      "0x / RadarRelay",
      "HitBTC",
      "OKEX",
      "Gate.io",
      "и др.",
    ],
    markets: ["Token pairs / DAI-related liquidity bands"],
    realtime: {
      websocket: false,
      rest: true,
      notes:
        "Gas-цена обновляется через oracle/API провайдеров; speedup замены tx ~каждые 42s (--gas-replace-after).",
    },
    features: [
      "Bands: min/avg/max margin и amount",
      "Автоотмена ордеров вне полос",
      "Dynamic / fixed / oracle gas",
      "Geometric reactive gas multipliers",
      "Мультибиржа в одном фреймворке",
    ],
    outputs: [
      {
        id: "order-bands",
        label: "Полосы ликвидности",
        description:
          "Набор открытых buy/sell ордеров в заданных margin/amount диапазонах.",
      },
      {
        id: "gas-price",
        label: "Gas price stream",
        description:
          "Текущая оценка Gwei из EthGasStation / Etherchain / POA / aggregator / fixed.",
      },
      {
        id: "tx-speedups",
        label: "Speedup-транзакции",
        description:
          "Повторная отправка с растущим gas до --gas-maximum.",
      },
    ],
    inputs: [
      "Bands JSON/config",
      "Ethereum node / Web3",
      "Опциональные API keys gas-оракулов",
      "Ключи бирж / кошелька",
    ],
    stack: ["Python", "pymaker", "Web3", "pygasprice-client"],
    installHint:
      "Клонировать archived repo, поднять Python env по README Maker Keeper, задать bands + gas flags.",
    riskNotes: [
      "Репозиторий archived — зависимости и биржи могли устареть.",
      "DEX keepers тратят gas на cancel/create при движении цены.",
      "AGPL-3.0 — учитывайте copyleft.",
    ],
    fitFor: [
      "Изучение классического MM-band дизайна",
      "Референс по Ethereum gas pricing стратегиям",
    ],
    notFor: [
      "Новый production без форка и обновления коннекторов",
      "Только Hyperliquid/perp без EVM",
    ],
    confidence: "high",
    matchNotes:
      "Прямое совпадение с «market maker + realtime gas на Ethereum». GitHub: sky-ecosystem/market-maker-keeper (redirect с makerdao).",
  },
  {
    id: "trading-toolkit",
    alias: "trading-toolkit",
    name: "TradingInPython",
    shortName: "TIP",
    category: "toolkit",
    maturity: "active",
    summary:
      "Открытая Python-платформа теханализа, бэктеста и пользовательских скриптов (в т.ч. Keras/JAX agent).",
    verifiedSummary:
      "SoDevLog/PyTrading — продукт TradingInPython: мультитаймфрейм-графики, индикаторы (MACD, RSI, Ichimoku, VWAP…), SMC, бэктест, портфель, алерты, встроенный script runner. Пример agent_ia.py — MLP Keras (JAX) → score BUY/SELL/HOLD по RSI/MACD/STOCH. Topic на GitHub: trading-toolkit. Заявленные в исходном списке «агентские кошельки / copy-trading» в этом репо не подтверждены; близкий toolkit с agent wallets + copy-trade: mogons/noraz-agent.",
    sourceClaim:
      "Инфраструктура для автономной торговли, поддерживающая агентские кошельки и функции копи-трейдинга.",
    repo: {
      owner: "SoDevLog",
      name: "PyTrading",
      url: "https://github.com/SoDevLog/PyTrading",
      defaultBranch: "main",
    },
    relatedLinks: [
      {
        label: "Официальный сайт TradingInPython",
        url: "https://trading-in-python.sodevlog.com/",
      },
      {
        label: "noraz-agent — agent wallets + copy-trade toolkit",
        url: "https://github.com/mogons/noraz-agent",
      },
      {
        label: "user_scripts / agent_ia.py",
        url: "https://github.com/SoDevLog/PyTrading/blob/main/TradingInPython/_internal/user_scripts/agent_ia.py",
      },
    ],
    language: "Python",
    license: null,
    stars: 11,
    forks: 0,
    openIssues: 0,
    archived: false,
    lastPush: "2026-10-21T12:56:31Z",
    topics: [
      "trading-toolkit",
      "technical-analysis",
      "backtesting",
      "deep-learning",
      "keras",
      "jax",
    ],
    exchanges: ["Stock market data (платформа ориентирована на акции)"],
    markets: ["Equities / OHLC datasets"],
    realtime: {
      websocket: false,
      rest: true,
      notes:
        "Данные через API платформы и скрипты; realtime crypto WS не является ядром продукта.",
    },
    features: [
      "Мультитаймфрейм TA",
      "Бэктест стратегий",
      "SMC-детекция",
      "AI-предикты (Keras/TF, Kalman)",
      "Script interpreter + UserScriptAPI",
      "Портфель и email-алерты",
    ],
    outputs: [
      {
        id: "indicators",
        label: "Индикаторные ряды",
        description:
          "RSI, MACD, Bollinger, Ichimoku, VWAP и др. поверх OHLCV.",
      },
      {
        id: "backtest-report",
        label: "Отчёт бэктеста",
        description: "Результаты симуляции стратегии на истории.",
      },
      {
        id: "ai-signals",
        label: "AI сигналы",
        description:
          "score ∈ [0,1] → BUY (>0.6) / SELL (<0.4) / HOLD из agent_ia.py.",
      },
      {
        id: "alerts",
        label: "Алерты",
        description: "Price/volume alerts и heatmap мониторинга.",
      },
    ],
    inputs: [
      "OHLCV / списки тикеров",
      "Пользовательские Python-скрипты (main())",
      "Данные приложения через UserScriptAPI",
    ],
    stack: ["Python", "Keras", "JAX", "pandas", "desktop platform"],
    installHint:
      "Скачать релиз TradingInPython с GitHub/сайта; скрипты класть в user_scripts и запускать из Monitoring → Scripts.",
    riskNotes: [
      "Исходный claim про agent wallets/copy-trade не подтверждён кодом PyTrading.",
      "Не финансовый совет; бэктест ≠ live PnL.",
    ],
    fitFor: [
      "Обучение TA и написание скриптов на Python",
      "Эксперименты с Keras-агентом сигналов",
      "Бэктест идей до автоматизации",
    ],
    notFor: [
      "On-chain copy-trading кошельков (смотрите noraz-agent)",
      "Hyperliquid grid execution",
    ],
    confidence: "medium",
    matchNotes:
      "Имя TradingInPython + topic trading-toolkit → SoDevLog/PyTrading. Описание из списка частично относится к другому toolkit (noraz-agent); оба указаны в relatedLinks.",
  },
  {
    id: "ftui",
    alias: "ftui",
    name: "FTUI — Terminal UI for Freqtrade",
    shortName: "FTUI",
    category: "monitoring",
    maturity: "alpha",
    summary:
      "Текстовый UI (Textual/Rich) для пассивного мониторинга нескольких Freqtrade-ботов из терминала.",
    verifiedSummary:
      "freqtrade/ftui by Froggleston — pip-пакет ftui, Linux-only (alpha). Читает REST API ботов через freqtrade-client (без CORS-плясок FreqUI), прелоадит trade dataframes. Экраны: Dashboard (сводка), View Bots (trades/closed/tags/performance/logs/sysinfo), Settings, Help. Управление ботом пока не поддерживается — только мониторинг. Конфиг example.yaml: список servers (name, user, pass, ip, port).",
    sourceClaim:
      "Удобный терминальный интерфейс для управления и мониторинга бота Freqtrade прямо из командной строки, без необходимости открывать браузер.",
    repo: {
      owner: "freqtrade",
      name: "ftui",
      url: "https://github.com/freqtrade/ftui",
      defaultBranch: "main",
    },
    relatedLinks: [
      {
        label: "Freqtrade docs / community showcase",
        url: "https://www.freqtrade.io/en/stable/",
      },
      {
        label: "PyPI ftui",
        url: "https://pypi.org/project/ftui/",
      },
      {
        label: "example.yaml",
        url: "https://github.com/freqtrade/ftui/blob/main/example.yaml",
      },
    ],
    language: "Python",
    license: "MIT",
    stars: 247,
    forks: 40,
    openIssues: 3,
    archived: false,
    lastPush: "2026-02-09T14:04:14Z",
    topics: ["alpha", "crypto", "freqtrade", "textual", "tui"],
    exchanges: ["Любые, на которых крутится Freqtrade"],
    markets: ["Зависит от стратегий FT"],
    realtime: {
      websocket: false,
      rest: true,
      notes:
        "Периодический опрос REST API Freqtrade; данные сделок кэшируются в memory dataframes.",
    },
    features: [
      "Мультисерверный мониторинг",
      "Dashboard + per-bot tabs",
      "Hotkeys D/B/S/H/Q",
      "freqtrade-client (без CORS)",
      "pip install ftui",
    ],
    outputs: [
      {
        id: "dashboard-stats",
        label: "Сводная статистика",
        description: "Агрегированные метрики по всем подключённым ботам.",
      },
      {
        id: "open-closed-trades",
        label: "Open / closed trades",
        description: "Таблицы сделок, tag summary, performance.",
      },
      {
        id: "bot-logs",
        label: "Логи и sysinfo",
        description: "Логи инстанса и системная информация бота.",
      },
    ],
    inputs: [
      "config.yaml со списком REST endpoint ботов",
      "username / password / ip / port каждого FT",
    ],
    stack: ["Python ≥3.10", "Textual", "Rich", "freqtrade-client"],
    installHint:
      "pip install ftui && создать config.yaml по example.yaml && ftui -y config.yaml",
    riskNotes: [
      "Alpha: баги и неполный feature set.",
      "Пассивный мониторинг — start/stop/forcebuy через FTUI пока нельзя (в отличие от claim «управления»).",
      "Только Linux на момент документации.",
    ],
    fitFor: [
      "SSH/серверный мониторинг без браузера",
      "Несколько FT на разных хостах в одном TUI",
    ],
    notFor: [
      "Полноценная замена FreqUI для управления",
      "Windows (официально не поддержан)",
    ],
    confidence: "high",
    matchNotes:
      "Точное совпадение Froggleston/ftui → официальный freqtrade/ftui. Уточнение: мониторинг, не полный control.",
  },
  {
    id: "bot-academy",
    alias: "bot-academy",
    name: "Bot Academy",
    shortName: "Academy",
    category: "education",
    maturity: "active",
    summary:
      "Блог и набор репозиториев stash86 о реальном опыте Freqtrade: стратегии, pair selection, dry-run циклы.",
    verifiedSummary:
      "Bot Academy (botacademy.ddns.net) — блог Stefano / stash86, рекомендован в community showcase Freqtrade. Фокус: опыт live/dry Freqtrade, методология «сначала сторона и пары, потом фильтры», разборы убыточных сделок. Код-спутники: MultiMA_TSL (~181★), freqtrade_stuff (~71★), форк freqtrade, ft-dashboard. Отдельного монорепо stash86/bot-academy нет — «academy» = блог + экосистема репозиториев.",
    sourceClaim:
      "Образовательный репозиторий и блог с разбором реальных проектов криптоботов, что является отличным стартом для самостоятельного обучения.",
    repo: {
      owner: "stash86",
      name: "MultiMA_TSL",
      url: "https://github.com/stash86/MultiMA_TSL",
      defaultBranch: "main",
    },
    relatedLinks: [
      {
        label: "Bot Academy — блог",
        url: "https://botacademy.ddns.net/about/",
      },
      {
        label: "Current strategy approach (2026)",
        url: "https://botacademy.ddns.net/2026/04/26/20260426-current-strategy-approach/",
      },
      {
        label: "freqtrade_stuff",
        url: "https://github.com/stash86/freqtrade_stuff",
      },
      {
        label: "Freqtrade community showcase",
        url: "https://www.freqtrade.io/en/stable/",
      },
    ],
    language: "Python",
    license: "GPL-3.0",
    stars: 181,
    forks: 0,
    openIssues: 0,
    archived: false,
    lastPush: "2026-04-19T08:00:54Z",
    topics: ["freqtrade", "strategy", "education"],
    exchanges: ["Через Freqtrade (Binance, Bybit, Hyperliquid, …)"],
    markets: ["Spot / futures по конфигу FT"],
    realtime: {
      websocket: false,
      rest: true,
      notes:
        "Образовательный контент + стратегии; realtime обеспечивает сам Freqtrade при запуске.",
    },
    features: [
      "Посты с разбором подходов к стратегиям",
      "MultiMA_TSL и связанные стратегии",
      "Акцент на pair selection vs переоптимизацию индикаторов",
      "Цикл dry-run → анализ лоссов → итерация",
    ],
    outputs: [
      {
        id: "strategy-code",
        label: "Код стратегий",
        description:
          "Публичные Freqtrade-стратегии (напр. MultiMA_TSL) для изучения и форка.",
      },
      {
        id: "method-notes",
        label: "Методологические заметки",
        description:
          "Пошаговый подход: long/short → пары → blank always-enter → фильтры → reset dry-run.",
      },
      {
        id: "trade-analysis",
        label: "Разбор сделок",
        description:
          "Качественный анализ убыточных входов и внешних данных (funding, L/S ratio).",
      },
    ],
    inputs: [
      "Freqtrade + historical data",
      "Желание читать англ./опыт автора критически (DYOR)",
    ],
    stack: ["Freqtrade", "Python", "Blog / GitHub"],
    installHint:
      "Читать botacademy.ddns.net; клонировать MultiMA_TSL / freqtrade_stuff в user_data/strategies своего Freqtrade.",
    riskNotes: [
      "Опыт одного автора; не гарантия прибыли.",
      "Стратегии устаревают — всегда dry-run и свой анализ.",
    ],
    fitFor: [
      "Старт в Freqtrade после официальных docs",
      "Понимание, почему «красивый бэктест» ломается в live",
    ],
    notFor: [
      "Готовый turnkey profit bot",
      "Не-Freqtrade стеки без адаптации",
    ],
    confidence: "high",
    matchNotes:
      "Официально в showcase Freqtrade как «Bot Academy (by stash86)». Канонический «репозиторий» — набор stash86/* + блог; MultiMA_TSL взят как главный кодовый якорь.",
  },
];

export const catalogMeta = {
  title: "Crypto Bot Intelligence",
  subtitle: "Обработанные профили открытых торговых проектов",
  generatedAt: "2026-10-21",
  sourceList: [
    "Hyperliquid Grid Bot (grid-bot)",
    "Market Maker Bot (market-maker-bot)",
    "TradingInPython (trading-toolkit)",
    "FTUI (Froggleston/ftui)",
    "Bot Academy (stash86)",
  ],
  disclaimer:
    "Не финансовый совет. Данные собраны из публичных README/GitHub и могут устареть. Торговля криптовалютой связана с риском потери капитала.",
};

export function getProjectById(id: string) {
  return projects.find((p) => p.id === id);
}

export function projectsAsExportPayload() {
  return {
    meta: catalogMeta,
    count: projects.length,
    projects,
  };
}
