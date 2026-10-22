"use client";

import { useEffect, useRef, useState } from "react";
import type { FeedEvent, ProjectFeedSnapshot } from "@/lib/feeds/types";
import { cn, formatDate } from "@/lib/utils";
import { Activity, Pause, Play, Radio, RefreshCw, Wifi, WifiOff } from "lucide-react";

type Props = {
  projectId: string;
};

type Transport = "poll" | "sse" | "off";

export function LiveFeedPanel({ projectId }: Props) {
  const [feed, setFeed] = useState<ProjectFeedSnapshot | null>(null);
  const [history, setHistory] = useState<FeedEvent[]>([]);
  const [transport, setTransport] = useState<Transport>("off");
  const [paused, setPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const pausedRef = useRef(paused);
  const sseGotDataRef = useRef(false);
  pausedRef.current = paused;

  function applyFeed(next: ProjectFeedSnapshot) {
    setFeed(next);
    setHistory((prev) => {
      const merged = [...next.events, ...prev];
      const seen = new Set<string>();
      const deduped: FeedEvent[] = [];
      for (const ev of merged) {
        if (seen.has(ev.id)) continue;
        seen.add(ev.id);
        deduped.push(ev);
        if (deduped.length >= 40) break;
      }
      return deduped;
    });
  }

  async function fetchSnapshot() {
    const res = await fetch(
      `/api/feeds?project=${encodeURIComponent(projectId)}`,
      { cache: "no-store" }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as {
      error?: string;
      feeds?: ProjectFeedSnapshot[];
    };
    if (data.error) throw new Error(data.error);
    const next = data.feeds?.[0];
    if (!next) throw new Error("Пустой ответ фида");
    return next;
  }

  useEffect(() => {
    let cancelled = false;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let es: EventSource | null = null;
    sseGotDataRef.current = false;

    setFeed(null);
    setHistory([]);
    setError(null);
    setLoading(true);
    setTransport("off");

    const tick = async () => {
      if (pausedRef.current || cancelled) return;
      try {
        const next = await fetchSnapshot();
        if (cancelled) return;
        setError(null);
        setLoading(false);
        applyFeed(next);
        setTransport((t) => (t === "sse" ? "sse" : "poll"));
      } catch (e) {
        if (cancelled) return;
        setLoading(false);
        setError(e instanceof Error ? e.message : "Ошибка загрузки фида");
      }
    };

    void tick();
    pollTimer = setInterval(() => {
      void tick();
    }, 2500);

    // SSE — бонус, если туннель его не буферизует
    try {
      es = new EventSource(
        `/api/feeds/stream?project=${encodeURIComponent(projectId)}&interval=2500`
      );
      es.onmessage = (msg) => {
        if (pausedRef.current || cancelled) return;
        try {
          const data = JSON.parse(msg.data) as {
            error?: string;
            feeds?: ProjectFeedSnapshot[];
          };
          if (data.error || !data.feeds?.[0]) return;
          sseGotDataRef.current = true;
          setTransport("sse");
          setLoading(false);
          setError(null);
          applyFeed(data.feeds[0]);
        } catch {
          /* ignore parse errors from SSE */
        }
      };
      es.onerror = () => {
        if (!sseGotDataRef.current) {
          /* polling already covers this */
        }
      };
    } catch {
      /* EventSource unavailable */
    }

    return () => {
      cancelled = true;
      if (pollTimer) clearInterval(pollTimer);
      es?.close();
    };
  }, [projectId]);

  const sourceBadge =
    feed?.source === "live"
      ? "live"
      : feed?.source === "hybrid"
        ? "hybrid"
        : "sim";

  const connected = transport !== "off" && !error;

  return (
    <section className="mt-8 rounded-lg border border-lime-400/25 bg-lime-400/[0.04] p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Activity className="size-4 text-lime-300" />
          <h3 className="font-display text-lg font-semibold text-stone-100">
            Поток данных бота → UI
          </h3>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded border px-2 py-1",
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
            {transport === "sse"
              ? "SSE+poll"
              : transport === "poll"
                ? "Poll on"
                : "connecting"}
          </span>
          {feed && (
            <span className="rounded border border-stone-600/50 px-2 py-1 text-stone-300 uppercase tracking-wide">
              {sourceBadge}
            </span>
          )}
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            className="inline-flex items-center gap-1 rounded border border-stone-600/50 px-2 py-1 text-stone-200 hover:border-lime-400/40"
          >
            {paused ? (
              <>
                <Play className="size-3.5" /> Resume
              </>
            ) : (
              <>
                <Pause className="size-3.5" /> Pause
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              void (async () => {
                try {
                  const next = await fetchSnapshot();
                  applyFeed(next);
                  setError(null);
                  setLoading(false);
                  setTransport((t) => (t === "off" ? "poll" : t));
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Ошибка");
                }
              })();
            }}
            className="inline-flex items-center gap-1 rounded border border-stone-600/50 px-2 py-1 text-stone-200 hover:border-lime-400/40"
          >
            <RefreshCw className="size-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {feed?.note && (
        <p className="mt-3 text-xs leading-relaxed text-stone-400">{feed.note}</p>
      )}

      {error && <p className="mt-2 text-xs text-amber-200">{error}</p>}

      {loading && !feed && (
        <p className="mt-4 flex items-center gap-2 text-sm text-stone-400">
          <RefreshCw className="size-4 animate-spin" />
          Загрузка метрик…
        </p>
      )}

      {feed && (
        <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {Object.entries(feed.metrics).map(([key, value]) => (
            <div
              key={key}
              className="rounded-md border border-stone-700/50 bg-stone-950/50 px-2.5 py-2"
            >
              <dt className="text-[10px] tracking-wider text-stone-500 uppercase">
                {key}
              </dt>
              <dd className="mt-0.5 font-mono text-sm text-lime-100/90">
                {formatMetric(value)}
              </dd>
            </div>
          ))}
        </dl>
      )}

      <div className="mt-4">
        <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.14em] text-stone-500 uppercase">
          <Radio className="size-3.5" />
          События
          {feed?.updatedAt && (
            <span className="font-normal normal-case tracking-normal text-stone-600">
              · обновлено {formatDate(feed.updatedAt)}{" "}
              {new Date(feed.updatedAt).toLocaleTimeString("ru-RU")}
            </span>
          )}
        </p>
        {history.length === 0 ? (
          <p className="text-sm text-stone-500">
            {loading ? "Загрузка…" : "Пока нет событий — нажмите Refresh"}
          </p>
        ) : (
          <ul className="max-h-64 space-y-2 overflow-y-auto pr-1">
            {history.map((ev) => (
              <li
                key={ev.id}
                className="rounded-md border border-stone-700/45 bg-stone-950/55 px-3 py-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-stone-100">{ev.label}</p>
                  <span className="text-[10px] text-stone-500">
                    {ev.source} · {ev.kind} ·{" "}
                    {new Date(ev.ts).toLocaleTimeString("ru-RU")}
                  </span>
                </div>
                <pre className="mt-1 overflow-x-auto font-mono text-[11px] leading-relaxed text-stone-400 whitespace-pre-wrap">
                  {JSON.stringify(ev.payload, null, 0)}
                </pre>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function formatMetric(value: string | number | boolean | null) {
  if (value === null) return "—";
  if (typeof value === "number") {
    if (Number.isInteger(value)) return String(value);
    return value.toLocaleString("en-US", {
      maximumFractionDigits: 4,
      useGrouping: false,
    });
  }
  return String(value);
}
