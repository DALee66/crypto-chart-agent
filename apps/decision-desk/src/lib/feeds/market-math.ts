export type Candle = {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
};

export async function fetchCandles(
  coin: string,
  interval = "15m",
  lookbackHours = 48
): Promise<Candle[]> {
  const end = Date.now();
  const start = end - lookbackHours * 3600 * 1000;
  const res = await fetch("https://api.hyperliquid.xyz/info", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "candleSnapshot",
      req: { coin, interval, startTime: start, endTime: end },
    }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`candles HTTP ${res.status}`);
  const raw = (await res.json()) as Record<string, unknown>[];
  return raw.map((r) => ({
    t: Number(r.t),
    o: Number(r.o),
    h: Number(r.h),
    l: Number(r.l),
    c: Number(r.c),
    v: Number(r.v),
  }));
}

export type AssetCtx = {
  symbol: string;
  midPx: number;
  markPx: number;
  oraclePx: number;
  prevDayPx: number;
  dayChangePct: number;
  dayNotionalVolumeUsd: number;
  funding: number;
  fundingAnnualizedPct: number;
  openInterest: number;
  premiumBps: number;
};

export async function fetchAssetCtx(symbol: string): Promise<AssetCtx> {
  const res = await fetch("https://api.hyperliquid.xyz/info", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "metaAndAssetCtxs" }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`meta HTTP ${res.status}`);
  const data = (await res.json()) as [
    { universe: { name: string }[] },
    Record<string, unknown>[],
  ];
  const idx = data[0].universe.findIndex(
    (u) => u.name.toUpperCase() === symbol.toUpperCase()
  );
  if (idx < 0) throw new Error(`Нет инструмента ${symbol}`);
  const ctx = data[1][idx];
  const midPx = Number(ctx.midPx);
  const prevDayPx = Number(ctx.prevDayPx);
  const funding = Number(ctx.funding);
  return {
    symbol: data[0].universe[idx].name,
    midPx,
    markPx: Number(ctx.markPx),
    oraclePx: Number(ctx.oraclePx),
    prevDayPx,
    dayChangePct: prevDayPx > 0 ? ((midPx - prevDayPx) / prevDayPx) * 100 : 0,
    dayNotionalVolumeUsd: Number(ctx.dayNtlVlm),
    funding,
    fundingAnnualizedPct: funding * 24 * 365 * 100,
    openInterest: Number(ctx.openInterest),
    premiumBps: Number(ctx.premium) * 10_000,
  };
}

export function rsi(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50;
  let gains = 0;
  let losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  if (losses === 0) return 100;
  const rs = gains / losses;
  return 100 - 100 / (1 + rs);
}

export function ema(values: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const out: number[] = [];
  let prev = values[0];
  out.push(prev);
  for (let i = 1; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k);
    out.push(prev);
  }
  return out;
}

export function macdHist(closes: number[]): number {
  if (closes.length < 35) return 0;
  const e12 = ema(closes, 12);
  const e26 = ema(closes, 26);
  const macdLine = e12.map((v, i) => v - e26[i]);
  const signal = ema(macdLine, 9);
  const last = macdLine.length - 1;
  return macdLine[last] - signal[last];
}

export function stochK(candles: Candle[], period = 14): number {
  if (candles.length < period) return 50;
  const slice = candles.slice(-period);
  const hi = Math.max(...slice.map((c) => c.h));
  const lo = Math.min(...slice.map((c) => c.l));
  const close = slice[slice.length - 1].c;
  if (hi === lo) return 50;
  return ((close - lo) / (hi - lo)) * 100;
}

/** Paper long: enter every bar, exit next — real OHLC path */
export function paperLongStats(candles: Candle[]) {
  let wins = 0;
  let losses = 0;
  let pnlPct = 0;
  const trades: { entry: number; exit: number; pnlPct: number }[] = [];
  for (let i = 1; i < candles.length; i++) {
    const entry = candles[i - 1].c;
    const exit = candles[i].c;
    if (!(entry > 0)) continue;
    const ret = ((exit - entry) / entry) * 100;
    pnlPct += ret;
    if (ret >= 0) wins += 1;
    else losses += 1;
    trades.push({ entry, exit, pnlPct: ret });
  }
  return {
    trades: trades.length,
    wins,
    losses,
    winRate: trades.length ? (wins / trades.length) * 100 : 0,
    totalPnlPct: pnlPct,
    lastTrades: trades.slice(-5),
  };
}

export function scoreFromMarket(
  rsiV: number,
  macdH: number,
  stoch: number,
  dayChangePct: number,
  fundingAnnualizedPct: number,
  premiumBps: number
) {
  // Map indicators into 0..1 like agent_ia style
  let score = 0.5;
  score += (50 - rsiV) / 200; // RSI low -> buy bias
  score += Math.tanh(macdH) * 0.08;
  score += (stoch - 50) / 400;
  score += Math.max(-0.08, Math.min(0.08, dayChangePct / 100));
  // Positive funding (longs pay) slightly against buy
  score -= Math.max(-0.06, Math.min(0.06, fundingAnnualizedPct / 500));
  score -= Math.max(-0.05, Math.min(0.05, premiumBps / 200));
  score = Math.max(0.05, Math.min(0.95, score));
  const signal = score > 0.6 ? "BUY" : score < 0.4 ? "SELL" : "HOLD";
  return { score: Number(score.toFixed(3)), signal: signal as "BUY" | "SELL" | "HOLD" };
}
