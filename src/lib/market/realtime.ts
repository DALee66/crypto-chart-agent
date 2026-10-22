export const DEFAULT_SYMBOL = "BTC";
export const QUICK_PICKS = ["BTC", "ETH", "SOL", "DOGE", "XRP", "LINK", "AVAX"] as const;

export type AssetSnapshot = {
  symbol: string;
  midPx: number;
  markPx: number;
  oraclePx: number;
  prevDayPx: number;
  dayChangePct: number;
  dayNotionalVolumeUsd: number;
  dayBaseVolume: number;
  funding: number;
  fundingAnnualizedPct: number;
  openInterest: number;
  premium: number;
  premiumBps: number;
  impactBid: number | null;
  impactAsk: number | null;
  maxLeverage: number;
};

export type GasSnapshot = {
  gwei: number;
  provider: string;
};

export type DecisionHint = {
  id: string;
  title: string;
  body: string;
  severity: "info" | "watch" | "caution";
  symbols: string[];
};

export type TradeSidePlan = {
  side: "buy" | "sell";
  title: string;
  entry: number;
  stop: number;
  targets: { label: string; price: number; note: string }[];
  rationale: string;
};

export type TradeRecommendation = {
  symbol: string;
  bias: "buy" | "sell" | "neutral";
  biasLabel: string;
  summary: string;
  buy: TradeSidePlan;
  sell: TradeSidePlan;
  disclaimer: string;
};

export type MarketSnapshot = {
  updatedAt: string;
  selectedSymbol: string;
  availableSymbols: string[];
  source: {
    prices: string;
    gas: string;
  };
  /** Selected asset first, then quick compares if present */
  assets: AssetSnapshot[];
  selected: AssetSnapshot;
  gas: GasSnapshot | null;
  gasError: string | null;
  hints: DecisionHint[];
  recommendation: TradeRecommendation;
};

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

function roundPrice(n: number, symbol: string) {
  if (!Number.isFinite(n)) return n;
  if (symbol === "BTC") return Math.round(n * 10) / 10;
  if (n >= 100) return Math.round(n * 100) / 100;
  if (n >= 1) return Math.round(n * 1000) / 1000;
  return Math.round(n * 1e6) / 1e6;
}

type HlBundle = {
  universe: { name: string; maxLeverage?: number }[];
  ctxs: Record<string, unknown>[];
};

async function fetchHlBundle(): Promise<HlBundle> {
  const res = await fetch("https://api.hyperliquid.xyz/info", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "metaAndAssetCtxs" }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Hyperliquid HTTP ${res.status}`);
  const data = (await res.json()) as [
    { universe: { name: string; maxLeverage?: number }[] },
    Record<string, unknown>[],
  ];
  return { universe: data[0].universe, ctxs: data[1] };
}

function parseAsset(
  bundle: HlBundle,
  symbol: string
): AssetSnapshot | null {
  const idx = bundle.universe.findIndex(
    (u) => u.name.toUpperCase() === symbol.toUpperCase()
  );
  if (idx < 0) return null;
  const ctx = bundle.ctxs[idx];
  const midPx = num(ctx.midPx);
  const markPx = num(ctx.markPx);
  const oraclePx = num(ctx.oraclePx);
  const prevDayPx = num(ctx.prevDayPx);
  const funding = num(ctx.funding);
  const premium = num(ctx.premium);
  const impact = Array.isArray(ctx.impactPxs)
    ? (ctx.impactPxs as unknown[]).map(num)
    : [];

  return {
    symbol: bundle.universe[idx].name,
    midPx,
    markPx,
    oraclePx,
    prevDayPx,
    dayChangePct: prevDayPx > 0 ? ((midPx - prevDayPx) / prevDayPx) * 100 : NaN,
    dayNotionalVolumeUsd: num(ctx.dayNtlVlm),
    dayBaseVolume: num(ctx.dayBaseVlm),
    funding,
    fundingAnnualizedPct: funding * 24 * 365 * 100,
    openInterest: num(ctx.openInterest),
    premium,
    premiumBps: premium * 10_000,
    impactBid: Number.isFinite(impact[0]) ? impact[0] : null,
    impactAsk: Number.isFinite(impact[1]) ? impact[1] : null,
    maxLeverage: Number(bundle.universe[idx].maxLeverage ?? 0),
  };
}

async function fetchEthGas(): Promise<GasSnapshot> {
  const res = await fetch("https://ethereum.publicnode.com", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "eth_gasPrice",
      params: [],
      id: 1,
    }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`ETH RPC HTTP ${res.status}`);
  const data = (await res.json()) as { result?: string };
  if (!data.result) throw new Error("Пустой eth_gasPrice");
  return {
    gwei: Number(BigInt(data.result)) / 1e9,
    provider: "ethereum.publicnode.com",
  };
}

function buildHints(assets: AssetSnapshot[], gas: GasSnapshot | null): DecisionHint[] {
  const hints: DecisionHint[] = [];
  for (const a of assets) {
    if (Math.abs(a.dayChangePct) >= 3) {
      hints.push({
        id: `move-${a.symbol}`,
        title: `${a.symbol}: сильное движение за сутки`,
        body: `Цена ${a.dayChangePct >= 0 ? "выросла" : "снизилась"} на ${Math.abs(a.dayChangePct).toFixed(2)}% к предыдущему дню. Проверьте рабочий диапазон стратегии.`,
        severity: Math.abs(a.dayChangePct) >= 6 ? "caution" : "watch",
        symbols: [a.symbol],
      });
    }
    if (Math.abs(a.fundingAnnualizedPct) >= 15) {
      hints.push({
        id: `funding-${a.symbol}`,
        title: `${a.symbol}: заметный funding`,
        body: `Годовая оценка funding ≈ ${a.fundingAnnualizedPct.toFixed(1)}%. Влияет на стоимость удержания позиции.`,
        severity: Math.abs(a.fundingAnnualizedPct) >= 40 ? "caution" : "watch",
        symbols: [a.symbol],
      });
    }
    if (Math.abs(a.premiumBps) >= 5) {
      hints.push({
        id: `premium-${a.symbol}`,
        title: `${a.symbol}: премия к oracle`,
        body: `Премия ${a.premiumBps.toFixed(1)} bps — рынок ${a.premiumBps > 0 ? "дороже" : "дешевле"} оракула.`,
        severity: "info",
        symbols: [a.symbol],
      });
    }
  }
  if (gas && gas.gwei >= 20) {
    hints.push({
      id: "gas-high",
      title: "Высокий газ Ethereum",
      body: `≈ ${gas.gwei.toFixed(2)} Gwei — частые перестановки на L1 дорогие.`,
      severity: gas.gwei >= 50 ? "caution" : "watch",
      symbols: ["ETH"],
    });
  } else if (gas) {
    hints.push({
      id: "gas-ok",
      title: "Газ в умеренной зоне",
      body: `≈ ${gas.gwei.toFixed(3)} Gwei — издержки L1 относительно низкие.`,
      severity: "info",
      symbols: ["ETH"],
    });
  }
  if (hints.length === 0) {
    hints.push({
      id: "calm",
      title: "Без явных тревожных сигналов",
      body: "Суточное движение, funding и премия в спокойной зоне для выбранного набора.",
      severity: "info",
      symbols: assets.map((a) => a.symbol),
    });
  }
  return hints.slice(0, 6);
}

export function buildTradeRecommendation(asset: AssetSnapshot): TradeRecommendation {
  const mid = asset.midPx;
  const step = Math.max(
    Math.abs(mid - asset.prevDayPx) * 0.35,
    mid * 0.003,
    (asset.impactAsk != null && asset.impactBid != null
      ? (asset.impactAsk - asset.impactBid) * 2
      : mid * 0.001)
  );

  const buyEntry = roundPrice(asset.impactBid ?? mid * 0.999, asset.symbol);
  const sellEntry = roundPrice(asset.impactAsk ?? mid * 1.001, asset.symbol);

  const buy: TradeSidePlan = {
    side: "buy",
    title: "Рекомендация к покупке (long)",
    entry: buyEntry,
    stop: roundPrice(buyEntry - step * 1.2, asset.symbol),
    targets: [
      {
        label: "Цель 1",
        price: roundPrice(buyEntry + step, asset.symbol),
        note: "Ближайший ориентир — возврат/расширение к зоне mid/mark",
      },
      {
        label: "Цель 2",
        price: roundPrice(buyEntry + step * 2, asset.symbol),
        note: "Расширение хода; фиксируйте часть позиции",
      },
    ],
    rationale:
      asset.premiumBps < 0
        ? "Рынок чуть дешевле oracle — сценарий откупа от impact bid."
        : "Вход от нижней границы стакана (impact bid) с короткими целями.",
  };

  const sell: TradeSidePlan = {
    side: "sell",
    title: "Рекомендация к продаже (short)",
    entry: sellEntry,
    stop: roundPrice(sellEntry + step * 1.2, asset.symbol),
    targets: [
      {
        label: "Цель 1",
        price: roundPrice(sellEntry - step, asset.symbol),
        note: "Ближайший ориентир — возврат к mid/нижней границе спреда",
      },
      {
        label: "Цель 2",
        price: roundPrice(sellEntry - step * 2, asset.symbol),
        note: "Расширение хода вниз; частичная фиксация",
      },
    ],
    rationale:
      asset.premiumBps > 0
        ? "Рынок чуть дороже oracle — сценарий продажи от impact ask."
        : "Вход от верхней границы стакана (impact ask) с короткими целями.",
  };

  let bias: TradeRecommendation["bias"] = "neutral";
  let biasLabel = "Нейтрально";
  let summary =
    "Явного перекоса нет: смотрите обе стороны от текущей цены и свои риск-лимиты.";

  const score =
    (asset.dayChangePct > 1 ? 1 : asset.dayChangePct < -1 ? -1 : 0) +
    (asset.funding > 0.00005 ? -1 : asset.funding < -0.00005 ? 1 : 0) +
    (asset.premiumBps > 3 ? -1 : asset.premiumBps < -3 ? 1 : 0);

  if (score >= 2) {
    bias = "buy";
    biasLabel = "Склонность к покупке";
    summary = `${asset.symbol}: метрики смещены в пользу сценария long (движение/funding/премия). Ближайшие цели — ниже.`;
  } else if (score <= -2) {
    bias = "sell";
    biasLabel = "Склонность к продаже";
    summary = `${asset.symbol}: метрики смещены в пользу сценария short. Ближайшие цели — ниже.`;
  }

  return {
    symbol: asset.symbol,
    bias,
    biasLabel,
    summary,
    buy,
    sell,
    disclaimer:
      "Ориентиры рассчитаны из live mid/impact/суточного хода. Не финансовый совет и не сигнал к обязательной сделке.",
  };
}

export async function collectMarketSnapshot(
  selectedSymbol = DEFAULT_SYMBOL
): Promise<MarketSnapshot> {
  const bundle = await fetchHlBundle();
  const availableSymbols = bundle.universe
    .map((u) => u.name)
    .filter((n) => !n.startsWith("@") && !n.startsWith("#"))
    .sort((a, b) => a.localeCompare(b));

  const wanted = selectedSymbol.trim().toUpperCase() || DEFAULT_SYMBOL;
  let selected = parseAsset(bundle, wanted);
  if (!selected) {
    selected = parseAsset(bundle, DEFAULT_SYMBOL);
    if (!selected) throw new Error(`Монета ${wanted} не найдена на Hyperliquid`);
  }

  const compareNames = QUICK_PICKS.filter(
    (s) => s !== selected.symbol && availableSymbols.includes(s)
  ).slice(0, 3);

  const assets: AssetSnapshot[] = [selected];
  for (const name of compareNames) {
    const a = parseAsset(bundle, name);
    if (a) assets.push(a);
  }

  let gas: GasSnapshot | null = null;
  let gasError: string | null = null;
  try {
    gas = await fetchEthGas();
  } catch (e) {
    gasError = e instanceof Error ? e.message : "gas error";
  }

  return {
    updatedAt: new Date().toISOString(),
    selectedSymbol: selected.symbol,
    availableSymbols,
    source: {
      prices: "Hyperliquid public API (metaAndAssetCtxs) — mainnet",
      gas: "Ethereum JSON-RPC eth_gasPrice (publicnode)",
    },
    assets,
    selected,
    gas,
    gasError,
    hints: buildHints([selected], gas),
    recommendation: buildTradeRecommendation(selected),
  };
}

export const ATTRIBUTE_GLOSSARY: {
  key: string;
  title: string;
  meaning: string;
  decisionUse: string;
}[] = [
  {
    key: "midPx",
    title: "Средняя цена (mid)",
    meaning: "Середина между лучшей покупкой и продажей на Hyperliquid прямо сейчас.",
    decisionUse: "Базовая точка для сеток, входа и оценки «где рынок».",
  },
  {
    key: "markPx",
    title: "Маркировочная цена (mark)",
    meaning: "Цена, по которой биржа считает PnL и ликвидации перпетуалов.",
    decisionUse: "Важнее mid для риска позиции и стопов.",
  },
  {
    key: "oraclePx",
    title: "Оракул",
    meaning: "Внешняя справочная цена, с которой биржа сверяет рынок.",
    decisionUse: "Помогает понять, не «перекошен» ли локальный стакан.",
  },
  {
    key: "dayChangePct",
    title: "Изменение за сутки",
    meaning: "На сколько % mid ушёл от цены закрытия предыдущего дня.",
    decisionUse: "Сильный ход → проверить диапазон сетки и лимиты риска.",
  },
  {
    key: "dayNotionalVolumeUsd",
    title: "Оборот за сутки ($)",
    meaning: "Сколько долларов прошло через инструмент за день.",
    decisionUse: "Ликвидность: чем выше, тем проще входить/выходить крупнее.",
  },
  {
    key: "openInterest",
    title: "Открытый интерес",
    meaning: "Суммарный размер открытых перпетуальных позиций.",
    decisionUse: "Рост OI при движении цены = более «нагруженный» рынок.",
  },
  {
    key: "funding",
    title: "Funding (ставка финансирования)",
    meaning: "Периодический платёж между лонгами и шортами.",
    decisionUse: "Влияет на стоимость удержания позиции.",
  },
  {
    key: "fundingAnnualizedPct",
    title: "Funding в годовых %",
    meaning: "Та же ставка в удобном годовом масштабе.",
    decisionUse: "Быстро сравнить «дорого ли держать» long/short.",
  },
  {
    key: "premiumBps",
    title: "Премия (bps)",
    meaning: "Насколько mid дороже/дешевле oracle, в базисных пунктах.",
    decisionUse: "Перекупленность/перепроданность относительно оракула.",
  },
  {
    key: "impactPxs",
    title: "Impact bid / ask",
    meaning: "Оценка цен при заметном объёме.",
    decisionUse: "Грубая оценка проскальзывания и зоны входа.",
  },
  {
    key: "gasGwei",
    title: "Газ Ethereum (Gwei)",
    meaning: "Текущая цена газа в сети Ethereum.",
    decisionUse: "Издержки частых отмен/перестановок ордеров на L1.",
  },
  {
    key: "entryTarget",
    title: "Вход и цели",
    meaning: "Расчётные уровни покупки/продажи от live mid и impact.",
    decisionUse: "Ближайшие ориентиры, не гарантия исполнения.",
  },
];
