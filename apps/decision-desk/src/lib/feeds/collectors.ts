import type { FeedEvent, FeedSource, ProjectFeedSnapshot } from "./types";
import {
  fetchAssetCtx,
  fetchCandles,
  macdHist,
  paperLongStats,
  rsi,
  scoreFromMarket,
  stochK,
} from "./market-math";

function id(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function event(
  projectId: string,
  source: FeedSource,
  kind: string,
  label: string,
  payload: Record<string, unknown>
): FeedEvent {
  return {
    id: id(kind),
    projectId,
    source,
    ts: new Date().toISOString(),
    kind,
    label,
    payload,
  };
}

async function fetchHyperliquidMids(
  symbols: string[] = ["BTC", "ETH", "SOL"]
): Promise<Record<string, number>> {
  const res = await fetch("https://api.hyperliquid.xyz/info", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "allMids" }),
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error(`Hyperliquid HTTP ${res.status}`);
  const data = (await res.json()) as Record<string, string>;
  const out: Record<string, number> = {};
  for (const key of symbols) {
    const hit = data[key] ?? data[key.toUpperCase()];
    if (hit != null) out[key.toUpperCase()] = Number(hit);
  }
  return out;
}

async function fetchEthGasGwei(): Promise<number> {
  const res = await fetch("https://ethereum.publicnode.com", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "eth_gasPrice",
      params: [],
      id: 1,
    }),
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error(`ETH RPC HTTP ${res.status}`);
  const data = (await res.json()) as { result?: string; error?: unknown };
  if (!data.result) throw new Error("No eth_gasPrice result");
  return Number(BigInt(data.result)) / 1e9;
}

/** In-memory sim state so successive polls look continuous. */
const sim = {
  gridFills: 0,
  gridInventory: 0.012,
  mmSpreadBps: 18,
  tipSignals: 0,
  ftProfit: 42.5,
  ftOpenTrades: 3,
  academyDryRuns: 1,
};

function buildGridLevels(mid: number, levels = 5, stepPct = 0.4) {
  const digits = mid >= 1000 ? 1 : mid >= 1 ? 3 : 6;
  const rows = [];
  for (let i = levels; i >= 1; i--) {
    rows.push({
      side: "buy",
      price: Number((mid * (1 - (stepPct * i) / 100)).toFixed(digits)),
      size: 0.001,
      status: i === 1 && Math.random() > 0.7 ? "partial" : "open",
    });
  }
  for (let i = 1; i <= levels; i++) {
    rows.push({
      side: "sell",
      price: Number((mid * (1 + (stepPct * i) / 100)).toFixed(digits)),
      size: 0.001,
      status: "open",
    });
  }
  return rows;
}

export async function collectGridBot(
  symbol = "BTC"
): Promise<ProjectFeedSnapshot> {
  const events: FeedEvent[] = [];
  const sym = symbol.toUpperCase();
  try {
    const mids = await fetchHyperliquidMids([sym, "BTC", "ETH", "SOL"]);
    const mid = mids[sym];
    if (!mid) throw new Error(`${sym} mid missing`);

    if (Math.random() > 0.55) {
      sim.gridFills += 1;
      sim.gridInventory += Math.random() > 0.5 ? 0.001 : -0.001;
      events.push(
        event("grid-bot", "hybrid", "fill", "Исполнение уровня сетки (симуляция)", {
          symbol: sym,
          side: Math.random() > 0.5 ? "buy" : "sell",
          price: mid,
          size: 0.001,
          fillNo: sim.gridFills,
        })
      );
    }

    const levels = buildGridLevels(mid);
    events.push(
      event("grid-bot", "live", "mid", `Рыночная цена ${sym}`, {
        symbol: sym,
        mid,
      })
    );
    events.push(
      event("grid-bot", "hybrid", "grid-snapshot", "Сетка ордеров вокруг цены", {
        symbol: sym,
        levels,
        inventory: Number(sim.gridInventory.toFixed(4)),
      })
    );

    return {
      projectId: "grid-bot",
      source: "hybrid",
      updatedAt: new Date().toISOString(),
      status: "ok",
      note: `Цена ${sym} — live Hyperliquid. Ордера и исполнения — симуляция на live mid.`,
      metrics: {
        symbol: sym,
        marketPrice: mid,
        fillsSimulated: sim.gridFills,
        inventory: Number(sim.gridInventory.toFixed(4)),
        openGridLevels: levels.length,
      },
      events: events.slice(-8),
    };
  } catch (e) {
    return {
      projectId: "grid-bot",
      source: "simulated",
      updatedAt: new Date().toISOString(),
      status: "degraded",
      note: `Hyperliquid недоступен (${e instanceof Error ? e.message : "error"}).`,
      metrics: { symbol: sym, fillsSimulated: sim.gridFills },
      events: [],
    };
  }
}

export async function collectMarketMaker(): Promise<ProjectFeedSnapshot> {
  try {
    const gasGwei = await fetchEthGasGwei();
    const bandMid = 1; // abstract DAI/USD style
    const bands = [
      { side: "buy", minMargin: 0.5, avgMargin: 1.0, maxMargin: 1.5, amount: 1200 },
      { side: "sell", minMargin: 0.5, avgMargin: 1.0, maxMargin: 1.5, amount: 1100 },
    ];
    sim.mmSpreadBps = 16 + Math.round(Math.random() * 6);

    return {
      projectId: "market-maker-bot",
      source: "hybrid",
      updatedAt: new Date().toISOString(),
      status: "ok",
      note: "eth_gasPrice — live public Ethereum RPC. Полосы ордеров — симуляция keeper bands.",
      metrics: {
        gasGwei: Number(gasGwei.toFixed(3)),
        spreadBps: sim.mmSpreadBps,
        bandMid,
        archivedKeeper: true,
      },
      events: [
        event("market-maker-bot", "live", "gas", "Ethereum gas price", {
          gwei: Number(gasGwei.toFixed(3)),
          provider: "ethereum.publicnode.com",
        }),
        event("market-maker-bot", "simulated", "bands", "Liquidity bands snapshot", {
          bands,
          spreadBps: sim.mmSpreadBps,
        }),
      ],
    };
  } catch (e) {
    const gas = 0.2 + Math.random() * 2;
    return {
      projectId: "market-maker-bot",
      source: "simulated",
      updatedAt: new Date().toISOString(),
      status: "degraded",
      note: `RPC gas недоступен (${e instanceof Error ? e.message : "error"}) — mock gas + bands.`,
      metrics: { gasGwei: Number(gas.toFixed(3)), spreadBps: sim.mmSpreadBps },
      events: [
        event("market-maker-bot", "simulated", "gas", "Mock gas", {
          gwei: Number(gas.toFixed(3)),
        }),
      ],
    };
  }
}

export async function collectTradingToolkit(
  symbol = "BTC"
): Promise<ProjectFeedSnapshot> {
  const sym = symbol.toUpperCase();
  try {
    const [ctx, candles] = await Promise.all([
      fetchAssetCtx(sym),
      fetchCandles(sym, "15m", 36),
    ]);
    const closes = candles.map((c) => c.c);
    const rsiV = Number(rsi(closes).toFixed(1));
    const macdH = Number(macdHist(closes).toFixed(4));
    const stoch = Number(stochK(candles).toFixed(1));
    const { score, signal } = scoreFromMarket(
      rsiV,
      macdH,
      stoch,
      ctx.dayChangePct,
      ctx.fundingAnnualizedPct,
      ctx.premiumBps
    );
    if (signal !== "HOLD") sim.tipSignals += 1;

    return {
      projectId: "trading-toolkit",
      source: "live",
      updatedAt: new Date().toISOString(),
      status: "ok",
      note: `Сигнал по live свечам Hyperliquid 15m и контексту ${sym} (RSI/MACD/Stoch + funding/премия).`,
      metrics: {
        symbol: sym,
        marketPrice: ctx.midPx,
        score,
        signal,
        rsi: rsiV,
        macdHistogram: macdH,
        stochasticK: stoch,
        dayChangePct: Number(ctx.dayChangePct.toFixed(2)),
        signalsEmitted: sim.tipSignals,
      },
      events: [
        event("trading-toolkit", "live", "ai-signal", `Сигнал ${signal} · ${sym}`, {
          score,
          signal,
          indicators: { rsi: rsiV, macdHist: macdH, stochK: stoch },
          market: {
            mid: ctx.midPx,
            fundingAnnPct: Number(ctx.fundingAnnualizedPct.toFixed(1)),
            premiumBps: Number(ctx.premiumBps.toFixed(2)),
          },
        }),
      ],
    };
  } catch (e) {
    return {
      projectId: "trading-toolkit",
      source: "simulated",
      updatedAt: new Date().toISOString(),
      status: "degraded",
      note: `Не удалось посчитать сигнал: ${e instanceof Error ? e.message : "error"}`,
      metrics: { symbol: sym },
      events: [],
    };
  }
}

async function tryFreqtradeStatus(): Promise<Record<string, unknown> | null> {
  const base = process.env.FREQTRADE_API_URL?.replace(/\/$/, "");
  if (!base) return null;
  const user = process.env.FREQTRADE_API_USER ?? "";
  const pass = process.env.FREQTRADE_API_PASS ?? "";
  const auth =
    user || pass
      ? "Basic " + Buffer.from(`${user}:${pass}`).toString("base64")
      : undefined;

  const res = await fetch(`${base}/api/v1/show_config`, {
    headers: auth ? { Authorization: auth } : undefined,
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error(`Freqtrade HTTP ${res.status}`);
  return (await res.json()) as Record<string, unknown>;
}

export async function collectFtui(
  symbol = "BTC"
): Promise<ProjectFeedSnapshot> {
  const sym = symbol.toUpperCase();
  try {
    const cfg = await tryFreqtradeStatus();
    if (cfg) {
      return {
        projectId: "ftui",
        source: "live",
        updatedAt: new Date().toISOString(),
        status: "ok",
        note: "Подключён живой Freqtrade REST (FREQTRADE_API_URL).",
        metrics: {
          symbol: sym,
          strategy: String(cfg.strategy ?? "n/a"),
          dryRun: Boolean(cfg.dry_run),
          timeframe: String(cfg.timeframe ?? "n/a"),
        },
        events: [
          event("ftui", "live", "show_config", "Freqtrade show_config", {
            strategy: cfg.strategy,
            dry_run: cfg.dry_run,
            timeframe: cfg.timeframe,
            stake_currency: cfg.stake_currency,
          }),
        ],
      };
    }
  } catch (e) {
    void e;
  }

  try {
    const [ctx, candles] = await Promise.all([
      fetchAssetCtx(sym),
      fetchCandles(sym, "15m", 12),
    ]);
    const last = candles[candles.length - 1];
    const prev = candles[candles.length - 2];
    const lastBarMovePct =
      prev && prev.c > 0 ? ((last.c - prev.c) / prev.c) * 100 : 0;
    const volSum = candles.reduce((s, c) => s + c.v, 0);

    return {
      projectId: "ftui",
      source: "live",
      updatedAt: new Date().toISOString(),
      status: "ok",
      note: `Пульт рынка по ${sym}: live Hyperliquid (цена, OI, funding, оборот, ход последней свечи). Не аккаунт Freqtrade — для FT задайте FREQTRADE_API_URL.`,
      metrics: {
        symbol: sym,
        marketPrice: ctx.midPx,
        dayChangePct: Number(ctx.dayChangePct.toFixed(2)),
        openInterest: Number(ctx.openInterest.toFixed(2)),
        fundingAnnPct: Number(ctx.fundingAnnualizedPct.toFixed(1)),
        dayVolumeUsd: Number(ctx.dayNotionalVolumeUsd.toFixed(0)),
        lastBarMovePct: Number(lastBarMovePct.toFixed(3)),
        recentBaseVolume: Number(volSum.toFixed(2)),
        health:
          Math.abs(ctx.dayChangePct) < 5 && Math.abs(ctx.fundingAnnualizedPct) < 40
            ? "спокойный"
            : "напряжённый",
      },
      events: [
        event("ftui", "live", "dashboard", `Мониторинг рынка · ${sym}`, {
          mid: ctx.midPx,
          mark: ctx.markPx,
          openInterest: ctx.openInterest,
          fundingAnnPct: Number(ctx.fundingAnnualizedPct.toFixed(1)),
          dayVolumeUsd: ctx.dayNotionalVolumeUsd,
          lastBarMovePct: Number(lastBarMovePct.toFixed(3)),
        }),
      ],
    };
  } catch (e) {
    return {
      projectId: "ftui",
      source: "simulated",
      updatedAt: new Date().toISOString(),
      status: "degraded",
      note: `Мониторинг недоступен: ${e instanceof Error ? e.message : "error"}`,
      metrics: { symbol: sym },
      events: [],
    };
  }
}

export async function collectBotAcademy(
  symbol = "BTC"
): Promise<ProjectFeedSnapshot> {
  const sym = symbol.toUpperCase();
  try {
    const [ctx, candles] = await Promise.all([
      fetchAssetCtx(sym),
      fetchCandles(sym, "15m", 48),
    ]);
    const stats = paperLongStats(candles);
    sim.academyDryRuns += 1;
    const side = ctx.dayChangePct >= 0 ? "long" : "short";
    const nextFilter =
      Math.abs(ctx.fundingAnnualizedPct) >= 20
        ? "funding_rate_filter"
        : stats.winRate < 45
          ? "pair_or_side_review"
          : "none";

    return {
      projectId: "bot-academy",
      source: "live",
      updatedAt: new Date().toISOString(),
      status: "ok",
      note: `Учебный paper-run на реальных свечах ${sym} 15m: вход на закрытии бара, выход на следующем (always-enter long). Wins/losses — по фактическому пути цены.`,
      metrics: {
        symbol: sym,
        marketPrice: ctx.midPx,
        side,
        dryRunCycle: sim.academyDryRuns,
        tradesAnalyzed: stats.trades,
        wins: stats.wins,
        losses: stats.losses,
        winRatePct: Number(stats.winRate.toFixed(1)),
        paperPnlPct: Number(stats.totalPnlPct.toFixed(2)),
        fundingAnnPct: Number(ctx.fundingAnnualizedPct.toFixed(1)),
        nextFilter,
      },
      events: [
        event("bot-academy", "live", "dry-run", `Разбор paper-run · ${sym}`, {
          cycle: sim.academyDryRuns,
          side,
          focusPair: `${sym}-PERP`,
          wins: stats.wins,
          losses: stats.losses,
          winRatePct: Number(stats.winRate.toFixed(1)),
          paperPnlPct: Number(stats.totalPnlPct.toFixed(2)),
          nextFilter,
          lastTrades: stats.lastTrades,
        }),
      ],
    };
  } catch (e) {
    return {
      projectId: "bot-academy",
      source: "simulated",
      updatedAt: new Date().toISOString(),
      status: "degraded",
      note: `Учебный контур недоступен: ${e instanceof Error ? e.message : "error"}`,
      metrics: { symbol: sym },
      events: [],
    };
  }
}

export async function collectAllFeeds(
  symbol = "BTC"
): Promise<ProjectFeedSnapshot[]> {
  const [grid, mm, tip, ftui, academy] = await Promise.all([
    collectGridBot(symbol),
    collectMarketMaker(),
    collectTradingToolkit(symbol),
    collectFtui(symbol),
    collectBotAcademy(symbol),
  ]);
  return [grid, mm, tip, ftui, academy];
}

export async function collectFeedById(
  projectId: string,
  symbol = "BTC"
): Promise<ProjectFeedSnapshot | null> {
  switch (projectId) {
    case "grid-bot":
      return collectGridBot(symbol);
    case "market-maker-bot":
      return collectMarketMaker();
    case "trading-toolkit":
      return collectTradingToolkit(symbol);
    case "ftui":
      return collectFtui(symbol);
    case "bot-academy":
      return collectBotAcademy(symbol);
    default:
      return null;
  }
}
