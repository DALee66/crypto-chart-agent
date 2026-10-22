"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { BotSimulationPanel } from "@/components/bot-simulation-panel";
import {
  ATTRIBUTE_GLOSSARY,
  DEFAULT_SYMBOL,
  QUICK_PICKS,
  type AssetSnapshot,
  type DecisionHint,
  type MarketSnapshot,
  type TradeSidePlan,
} from "@/lib/market/realtime";
import { cn } from "@/lib/utils";
import {
  Activity,
  AlertTriangle,
  BookOpen,
  Fuel,
  Info,
  RefreshCw,
  Scale,
  Target,
  TrendingDown,
  TrendingUp,
  Wifi,
  WifiOff,
} from "lucide-react";

const POLL_MS = 3000;

function fmtPrice(n: number, symbol: string) {
  if (!Number.isFinite(n)) return "—";
  if (symbol === "BTC" || n >= 1000) {
    return n.toLocaleString("en-US", { maximumFractionDigits: 1 });
  }
  if (n >= 1) return n.toLocaleString("en-US", { maximumFractionDigits: 3 });
  return n.toLocaleString("en-US", { maximumFractionDigits: 6 });
}

function fmtUsd(n: number) {
  if (!Number.isFinite(n)) return "—";
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

function fmtPct(n: number, digits = 2) {
  if (!Number.isFinite(n)) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(digits)}%`;
}

function fmtOi(n: number, symbol: string) {
  if (!Number.isFinite(n)) return "—";
  return `${n.toLocaleString("en-US", { maximumFractionDigits: 2 })} ${symbol}`;
}

export function DecisionDashboard() {
  const [symbol, setSymbol] = useState(DEFAULT_SYMBOL);
  const [draft, setDraft] = useState(DEFAULT_SYMBOL);
  const [data, setData] = useState<MarketSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch(
          `/api/market?symbol=${encodeURIComponent(symbol)}`,
          { cache: "no-store" }
        );
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.detail || json.error || `HTTP ${res.status}`);
        }
        if (cancelled) return;
        setData(json as MarketSnapshot);
        setError(null);
        setConnected(true);
        setLoading(false);
      } catch (e) {
        if (cancelled) return;
        setConnected(false);
        setLoading(false);
        setError(e instanceof Error ? e.message : "Ошибка загрузки рынка");
      }
    };

    void load();
    const t = setInterval(() => void load(), POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [symbol]);

  const selected = data?.selected ?? null;
  const compares = useMemo(
    () => data?.assets.filter((a) => a.symbol !== data.selectedSymbol) ?? [],
    [data]
  );

  function applySymbol(next: string) {
    const cleaned = next.trim().toUpperCase();
    if (!cleaned) return;
    setDraft(cleaned);
    setSymbol(cleaned);
    setLoading(true);
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_15%_0%,#1a3d32_0%,transparent_50%),radial-gradient(ellipse_at_90%_5%,#243447_0%,transparent_40%),linear-gradient(165deg,#0b1210_0%,#101820_50%,#0d1418_100%)]" />
        <div className="absolute inset-0 opacity-[0.06] [background-image:linear-gradient(rgba(214,232,198,0.4)_1px,transparent_1px),linear-gradient(90deg,rgba(214,232,198,0.4)_1px,transparent_1px)] [background-size:56px_56px]" />
      </div>

      <header className="mx-auto max-w-7xl px-4 pb-6 pt-10 sm:px-6 lg:px-8 lg:pt-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <p className="font-display text-sm font-semibold tracking-[0.22em] text-lime-300/90 uppercase">
              Decision Desk
            </p>
            <h1 className="font-display mt-2 text-4xl font-bold tracking-tight text-stone-100 sm:text-5xl">
              Данные для решений
            </h1>
            <p className="mt-3 text-base leading-relaxed text-stone-300/90">
              Реальный рынок Hyperliquid и газ Ethereum. Выберите монету — блоки
              ниже перестроятся под неё. Внизу — симуляция контуров ботов.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded border px-2.5 py-1.5",
                connected
                  ? "border-lime-400/40 text-lime-200"
                  : "border-amber-400/40 text-amber-200"
              )}
            >
              {connected ? (
                <Wifi className="size-3.5" />
              ) : (
                <WifiOff className="size-3.5" />
              )}
              {connected ? "Live · 3с" : "Нет связи"}
            </span>
            {data && (
              <span className="rounded border border-stone-600/50 px-2.5 py-1.5 text-stone-400">
                {new Date(data.updatedAt).toLocaleTimeString("ru-RU")}
              </span>
            )}
          </div>
        </div>

        <CoinPicker
          draft={draft}
          setDraft={setDraft}
          symbol={symbol}
          available={data?.availableSymbols ?? [...QUICK_PICKS]}
          onApply={applySymbol}
        />

        {data && (
          <p className="mt-3 text-xs text-stone-500">
            Источники: {data.source.prices}; {data.source.gas}
          </p>
        )}
        {error && (
          <p className="mt-3 flex items-center gap-2 text-sm text-amber-200">
            <AlertTriangle className="size-4" />
            {error}
          </p>
        )}
      </header>

      <main className="mx-auto max-w-7xl space-y-8 px-4 pb-20 sm:px-6 lg:px-8">
        {loading && !data ? (
          <p className="flex items-center gap-2 text-stone-400">
            <RefreshCw className="size-4 animate-spin" />
            Загрузка рынка…
          </p>
        ) : data && selected ? (
          <>
            <Block
              icon={<TrendingUp className="size-5 text-lime-300" />}
              title="1. Операционный срез рынка"
              subtitle={`Выбранная монета ${selected.symbol} — цена и активность прямо сейчас`}
            >
              <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
                <AssetCard asset={selected} featured />
                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                  {compares.map((a) => (
                    <button
                      key={a.symbol}
                      type="button"
                      onClick={() => applySymbol(a.symbol)}
                      className="text-left transition hover:opacity-90"
                    >
                      <AssetCard asset={a} compact />
                    </button>
                  ))}
                </div>
              </div>
            </Block>

            <Block
              icon={<Target className="size-5 text-lime-300" />}
              title="2. Рекомендации: покупка и продажа"
              subtitle={`Ближайшие цели для ${selected.symbol} от live mid / impact — ориентиры, не приказ`}
            >
              <div className="mb-4 rounded-lg border border-stone-700/50 bg-stone-900/40 px-4 py-3">
                <p className="text-sm font-semibold text-stone-100">
                  {data.recommendation.biasLabel} · {selected.symbol}
                </p>
                <p className="mt-1 text-sm text-stone-300">
                  {data.recommendation.summary}
                </p>
                <p className="mt-2 text-xs text-stone-500">
                  {data.recommendation.disclaimer}
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <SidePlanCard
                  plan={data.recommendation.buy}
                  symbol={selected.symbol}
                  accent="buy"
                />
                <SidePlanCard
                  plan={data.recommendation.sell}
                  symbol={selected.symbol}
                  accent="sell"
                />
              </div>
            </Block>

            <Block
              icon={<Scale className="size-5 text-lime-300" />}
              title="3. Риск и перегрев"
              subtitle={`Funding, открытый интерес и премия — ${selected.symbol}`}
            >
              <div className="overflow-x-auto rounded-lg border border-stone-700/50">
                <table className="min-w-[640px] w-full text-left text-sm">
                  <thead className="bg-stone-900/70 text-stone-500">
                    <tr>
                      <th className="px-3 py-2.5 font-medium">Крипта</th>
                      <th className="px-3 py-2.5 font-medium">Funding</th>
                      <th className="px-3 py-2.5 font-medium">≈ год</th>
                      <th className="px-3 py-2.5 font-medium">Открытый интерес</th>
                      <th className="px-3 py-2.5 font-medium">Премия</th>
                      <th className="px-3 py-2.5 font-medium">Плечо max</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.assets.map((a) => (
                      <tr
                        key={a.symbol}
                        className={cn(
                          "border-t border-stone-800/80",
                          a.symbol === selected.symbol && "bg-lime-400/5"
                        )}
                      >
                        <td className="px-3 py-3">
                          <CryptoBadge symbol={a.symbol} />
                        </td>
                        <td className="px-3 py-3 font-mono text-stone-200">
                          {(a.funding * 100).toFixed(4)}%
                        </td>
                        <td className="px-3 py-3 font-mono text-stone-200">
                          {fmtPct(a.fundingAnnualizedPct, 1)}
                        </td>
                        <td className="px-3 py-3 font-mono text-stone-200">
                          {fmtOi(a.openInterest, a.symbol)}
                        </td>
                        <td className="px-3 py-3 font-mono text-stone-200">
                          {a.premiumBps.toFixed(2)} bps
                        </td>
                        <td className="px-3 py-3 font-mono text-stone-300">
                          {a.maxLeverage}x
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Block>

            <Block
              icon={<Fuel className="size-5 text-lime-300" />}
              title="4. Издержки исполнения"
              subtitle="Газ Ethereum — для оценки L1 / маркет-мейкинга"
            >
              {data.gas ? (
                <div className="flex flex-wrap items-end gap-6">
                  <div>
                    <p className="text-xs tracking-wider text-stone-500 uppercase">
                      Сеть
                    </p>
                    <p className="mt-1 font-display text-2xl text-stone-100">
                      ETH · Ethereum L1
                    </p>
                  </div>
                  <div>
                    <p className="text-xs tracking-wider text-stone-500 uppercase">
                      Газ сейчас
                    </p>
                    <p className="mt-1 font-mono text-3xl text-lime-200">
                      {data.gas.gwei < 1
                        ? data.gas.gwei.toFixed(3)
                        : data.gas.gwei.toFixed(2)}{" "}
                      <span className="text-lg text-stone-400">Gwei</span>
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-amber-200">
                  Газ недоступен: {data.gasError ?? "нет данных"}
                </p>
              )}
            </Block>

            <Block
              icon={<Activity className="size-5 text-lime-300" />}
              title="5. Подсказки к решению"
              subtitle="Авторазбор метрик выбранной монеты"
            >
              <ul className="grid gap-3 md:grid-cols-2">
                {data.hints.map((h) => (
                  <HintCard key={h.id} hint={h} />
                ))}
              </ul>
            </Block>

            <Block
              icon={<BookOpen className="size-5 text-lime-300" />}
              title="6. Расшифровка атрибутов"
              subtitle="Что означает каждое поле"
            >
              <ul className="grid gap-3 md:grid-cols-2">
                {ATTRIBUTE_GLOSSARY.map((item) => (
                  <li
                    key={item.key}
                    className="rounded-lg border border-stone-700/45 bg-stone-950/45 px-4 py-3"
                  >
                    <p className="text-sm font-semibold text-lime-100/90">
                      {item.title}{" "}
                      <span className="font-mono text-[11px] font-normal text-stone-500">
                        {item.key}
                      </span>
                    </p>
                    <p className="mt-1.5 text-sm text-stone-300">{item.meaning}</p>
                    <p className="mt-2 text-xs text-stone-500">
                      <span className="text-stone-400">Для решения: </span>
                      {item.decisionUse}
                    </p>
                  </li>
                ))}
              </ul>
            </Block>

            <BotSimulationPanel symbol={selected.symbol} />
          </>
        ) : null}

        <footer className="border-t border-stone-700/40 pt-6 text-sm text-stone-500">
          Не финансовый совет. Рекомендации и симуляции — ориентиры на базе
          публичных данных рынка.
        </footer>
      </main>
    </div>
  );
}

function CoinPicker({
  draft,
  setDraft,
  symbol,
  available,
  onApply,
}: {
  draft: string;
  setDraft: (v: string) => void;
  symbol: string;
  available: string[];
  onApply: (v: string) => void;
}) {
  return (
    <div className="mt-6 rounded-xl border border-stone-700/50 bg-stone-950/50 p-4">
      <p className="text-xs font-semibold tracking-[0.16em] text-stone-500 uppercase">
        Монета для отображения
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {QUICK_PICKS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onApply(s)}
            className={cn(
              "rounded-md border px-3 py-1.5 text-sm font-medium transition",
              symbol === s
                ? "border-lime-400/50 bg-lime-400/15 text-lime-100"
                : "border-stone-600/50 text-stone-300 hover:border-stone-400/60"
            )}
          >
            {s}
          </button>
        ))}
      </div>
      <form
        className="mt-3 flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          onApply(draft);
        }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value.toUpperCase())}
          list="hl-symbols"
          placeholder="Например DOGE"
          className="min-w-[10rem] flex-1 rounded-md border border-stone-600/50 bg-stone-900/60 px-3 py-2 text-sm text-stone-100 outline-none focus:border-lime-400/50"
        />
        <datalist id="hl-symbols">
          {available.slice(0, 200).map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
        <button
          type="submit"
          className="rounded-md border border-lime-400/40 bg-lime-400/10 px-4 py-2 text-sm font-medium text-lime-100 hover:bg-lime-400/20"
        >
          Показать
        </button>
      </form>
    </div>
  );
}

function Block({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <section className="animate-fade-up rounded-xl border border-stone-700/45 bg-stone-950/40 p-5 sm:p-6">
      <div className="mb-4 flex items-start gap-3">
        <div className="mt-0.5">{icon}</div>
        <div>
          <h2 className="font-display text-xl font-semibold text-stone-100">
            {title}
          </h2>
          <p className="mt-1 text-sm text-stone-400">{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function CryptoBadge({ symbol }: { symbol: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded border border-lime-400/25 bg-lime-400/10 px-2 py-0.5 text-xs font-semibold tracking-wide text-lime-100">
      <span className="size-1.5 rounded-full bg-lime-300" />
      {symbol}
    </span>
  );
}

function AssetCard({
  asset,
  featured,
  compact,
}: {
  asset: AssetSnapshot;
  featured?: boolean;
  compact?: boolean;
}) {
  const up = asset.dayChangePct >= 0;
  return (
    <article
      className={cn(
        "rounded-lg border border-stone-700/50 bg-stone-900/40 p-4",
        featured && "border-lime-400/30 bg-lime-400/[0.04]",
        compact && "p-3"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <CryptoBadge symbol={asset.symbol} />
        <span
          className={cn(
            "font-mono text-sm font-medium",
            up ? "text-lime-300" : "text-rose-300"
          )}
        >
          {fmtPct(asset.dayChangePct)}
        </span>
      </div>
      <p
        className={cn(
          "mt-3 font-display font-bold text-stone-50",
          compact ? "text-xl" : "text-3xl"
        )}
      >
        {fmtPrice(asset.midPx, asset.symbol)}
      </p>
      <p className="mt-1 text-xs text-stone-500">средняя (mid) · Hyperliquid</p>
      {!compact && (
        <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
          <Metric label="Mark" value={fmtPrice(asset.markPx, asset.symbol)} />
          <Metric label="Oracle" value={fmtPrice(asset.oraclePx, asset.symbol)} />
          <Metric label="Оборот 24ч" value={fmtUsd(asset.dayNotionalVolumeUsd)} />
          <Metric
            label="Impact"
            value={
              asset.impactBid != null && asset.impactAsk != null
                ? `${fmtPrice(asset.impactBid, asset.symbol)} / ${fmtPrice(asset.impactAsk, asset.symbol)}`
                : "—"
            }
          />
        </dl>
      )}
    </article>
  );
}

function SidePlanCard({
  plan,
  symbol,
  accent,
}: {
  plan: TradeSidePlan;
  symbol: string;
  accent: "buy" | "sell";
}) {
  const buy = accent === "buy";
  return (
    <div
      className={cn(
        "rounded-lg border p-4",
        buy
          ? "border-lime-400/35 bg-lime-400/[0.06]"
          : "border-rose-400/30 bg-rose-400/[0.05]"
      )}
    >
      <div className="flex items-center gap-2">
        {buy ? (
          <TrendingUp className="size-4 text-lime-300" />
        ) : (
          <TrendingDown className="size-4 text-rose-300" />
        )}
        <p className="font-display text-lg font-semibold text-stone-100">
          {plan.title}
        </p>
        <CryptoBadge symbol={symbol} />
      </div>
      <p className="mt-2 text-sm text-stone-300">{plan.rationale}</p>
      <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <Metric label="Вход" value={fmtPrice(plan.entry, symbol)} />
        <Metric label="Защитный стоп" value={fmtPrice(plan.stop, symbol)} />
      </dl>
      <ul className="mt-3 space-y-2">
        {plan.targets.map((t) => (
          <li
            key={t.label}
            className="rounded border border-stone-700/45 bg-stone-950/40 px-3 py-2"
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xs font-semibold tracking-wide text-stone-400 uppercase">
                {t.label}
              </span>
              <span className="font-mono text-sm text-stone-100">
                {fmtPrice(t.price, symbol)}
              </span>
            </div>
            <p className="mt-1 text-xs text-stone-500">{t.note}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-stone-700/40 px-2 py-1.5">
      <dt className="text-[10px] tracking-wider text-stone-500 uppercase">
        {label}
      </dt>
      <dd className="mt-0.5 font-mono text-stone-200">{value}</dd>
    </div>
  );
}

function HintCard({ hint }: { hint: DecisionHint }) {
  const tone =
    hint.severity === "caution"
      ? "border-amber-400/35 bg-amber-400/5"
      : hint.severity === "watch"
        ? "border-sky-400/30 bg-sky-400/5"
        : "border-stone-600/45 bg-stone-900/40";
  return (
    <li className={cn("rounded-lg border px-4 py-3", tone)}>
      <div className="flex flex-wrap items-center gap-2">
        {hint.severity === "caution" ? (
          <AlertTriangle className="size-4 text-amber-200" />
        ) : (
          <Info className="size-4 text-stone-400" />
        )}
        <p className="text-sm font-semibold text-stone-100">{hint.title}</p>
        {hint.symbols.map((s) => (
          <CryptoBadge key={s} symbol={s} />
        ))}
      </div>
      <p className="mt-2 text-sm leading-relaxed text-stone-300">{hint.body}</p>
    </li>
  );
}
