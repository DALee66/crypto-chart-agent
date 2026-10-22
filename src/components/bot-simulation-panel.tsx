"use client";

import { useEffect, useState } from "react";
import {
  toBusinessBotCard,
  type BusinessBotCard,
} from "@/lib/feeds/business";
import { Bot, RefreshCw } from "lucide-react";

type Props = {
  symbol: string;
};

export function BotSimulationPanel({ symbol }: Props) {
  const [cards, setCards] = useState<BusinessBotCard[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const { collectAllFeeds } = await import("@/lib/feeds/collectors");
        const feeds = await collectAllFeeds(symbol);
        if (cancelled) return;
        setCards(feeds.map((f) => toBusinessBotCard(f, symbol)));
        setUpdatedAt(new Date().toISOString());
        setError(null);
        setLoading(false);
      } catch (e) {
        if (cancelled) return;
        setLoading(false);
        setError(e instanceof Error ? e.message : "Ошибка симуляции");
      }
    };

    void load();
    const t = setInterval(() => void load(), 3000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [symbol]);

  return (
    <section className="rounded-xl border border-stone-700/45 bg-stone-950/40 p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Bot className="mt-0.5 size-5 text-lime-300" />
          <div>
            <h2 className="font-display text-xl font-semibold text-stone-100">
              7. Симуляция контуров ботов
            </h2>
            <p className="mt-1 text-sm text-stone-400">
              Контуры для{" "}
              <span className="text-lime-200">{symbol}</span>. Сигнал, пульт и
              учебный paper-run — с live Hyperliquid; сетка ордеров по-прежнему
              симулируется поверх реальной цены.
            </p>
          </div>
        </div>
        {updatedAt && (
          <span className="text-xs text-stone-500">
            {new Date(updatedAt).toLocaleTimeString("ru-RU")}
          </span>
        )}
      </div>

      {loading && cards.length === 0 && (
        <p className="flex items-center gap-2 text-sm text-stone-400">
          <RefreshCw className="size-4 animate-spin" />
          Загрузка симуляции…
        </p>
      )}
      {error && <p className="text-sm text-amber-200">{error}</p>}

      <div className="grid gap-4 lg:grid-cols-2">
        {cards.map((card) => (
          <article
            key={card.id}
            className="rounded-lg border border-stone-700/50 bg-stone-900/40 p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-display text-lg font-semibold text-stone-100">
                  {card.title}
                </p>
                <p className="mt-0.5 text-xs text-stone-400">{card.role}</p>
              </div>
              <div className="flex flex-wrap gap-1.5 text-[11px]">
                <span className="rounded border border-lime-400/30 bg-lime-400/10 px-2 py-0.5 text-lime-100">
                  {card.crypto}
                </span>
                <span className="rounded border border-stone-600/50 px-2 py-0.5 text-stone-300">
                  {card.modeLabel}
                </span>
              </div>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-stone-500">
              {card.note}
            </p>
            <dl className="mt-3 grid grid-cols-2 gap-2">
              {card.metrics.map((m) => (
                <div
                  key={m.key}
                  className="rounded border border-stone-700/40 px-2.5 py-2"
                  title={m.hint}
                >
                  <dt className="text-[10px] tracking-wider text-stone-500 uppercase">
                    {m.label}
                  </dt>
                  <dd className="mt-0.5 font-mono text-sm text-stone-100">
                    {m.value}
                  </dd>
                  <p className="mt-1 text-[10px] leading-snug text-stone-600">
                    {m.hint}
                  </p>
                </div>
              ))}
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
}
