"use client";

import { useDeferredValue, useMemo, useState, useTransition } from "react";
import {
  CATEGORY_LABELS,
  MATURITY_LABELS,
  catalogMeta,
  type Maturity,
  type ProjectCategory,
  type ProcessedProject,
} from "@/data/projects";
import { LiveFeedPanel } from "@/components/live-feed-panel";
import type { ProjectWithLive } from "@/lib/github";
import { cn, formatDate, formatNumber } from "@/lib/utils";
import {
  ArrowUpRight,
  Cable,
  Download,
  Filter,
  GitBranch,
  Layers,
  LoaderCircle,
  Radio,
  RefreshCw,
  Search,
  ShieldAlert,
} from "lucide-react";

type Props = {
  initialProjects: ProjectWithLive[];
};

const CATEGORIES = Object.keys(CATEGORY_LABELS) as ProjectCategory[];
const MATURITIES = Object.keys(MATURITY_LABELS) as Maturity[];

export function CatalogApp({ initialProjects }: Props) {
  const [projects, setProjects] = useState(initialProjects);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [category, setCategory] = useState<ProjectCategory | "all">("all");
  const [maturity, setMaturity] = useState<Maturity | "all">("all");
  const [selectedId, setSelectedId] = useState(initialProjects[0]?.id ?? "");
  const [liveAt, setLiveAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    return projects.filter((p) => {
      if (category !== "all" && p.category !== category) return false;
      if (maturity !== "all" && p.maturity !== maturity) return false;
      if (!q) return true;
      const hay = [
        p.name,
        p.alias,
        p.summary,
        p.verifiedSummary,
        p.language,
        ...p.features,
        ...p.exchanges,
        ...p.topics,
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [projects, deferredQuery, category, maturity]);

  const selected =
    filtered.find((p) => p.id === selectedId) ?? filtered[0] ?? null;

  function refreshLive() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/projects?live=1");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setProjects(data.projects);
        setLiveAt(data.meta?.servedAt ?? new Date().toISOString());
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Не удалось обновить GitHub-метрики"
        );
      }
    });
  }

  function downloadJson() {
    const payload = {
      meta: {
        ...catalogMeta,
        exportedAt: new Date().toISOString(),
        liveAt,
      },
      count: projects.length,
      projects,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `crypto-bot-intelligence-${catalogMeta.generatedAt}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,#1a3d32_0%,transparent_55%),radial-gradient(ellipse_at_90%_10%,#243447_0%,transparent_45%),linear-gradient(165deg,#0b1210_0%,#101820_48%,#0d1418_100%)]" />
        <div className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(rgba(214,232,198,0.35)_1px,transparent_1px),linear-gradient(90deg,rgba(214,232,198,0.35)_1px,transparent_1px)] [background-size:48px_48px]" />
      </div>

      <header className="mx-auto max-w-7xl px-4 pb-8 pt-10 sm:px-6 lg:px-8 lg:pt-14">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
            <p className="font-display text-sm font-semibold tracking-[0.22em] text-lime-300/90 uppercase animate-fade-up">
              Crypto Bot Intelligence
            </p>
            <h1 className="font-display mt-3 text-4xl leading-[1.05] font-bold tracking-tight text-stone-100 sm:text-5xl lg:text-6xl animate-fade-up [animation-delay:80ms]">
              Обработанные данные
              <span className="block text-lime-200/95">пяти открытых ботов</span>
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-stone-300/90 sm:text-lg animate-fade-up [animation-delay:140ms]">
              Сводка по репозиториям из вашего списка: что реально умеет каждый
              проект, какие данные отдаёт, стек и риски — с проверкой claims
              против README и GitHub.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 animate-fade-up [animation-delay:180ms]">
            <button
              type="button"
              onClick={refreshLive}
              disabled={isPending}
              className="inline-flex items-center gap-2 rounded-md border border-lime-400/30 bg-lime-400/10 px-4 py-2.5 text-sm font-medium text-lime-100 transition hover:bg-lime-400/20 disabled:opacity-60"
            >
              {isPending ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              Live GitHub
            </button>
            <button
              type="button"
              onClick={downloadJson}
              className="inline-flex items-center gap-2 rounded-md border border-stone-500/40 bg-stone-900/50 px-4 py-2.5 text-sm font-medium text-stone-100 transition hover:border-stone-400/60"
            >
              <Download className="size-4" />
              Export JSON
            </button>
            <a
              href="/api/projects?format=json"
              className="inline-flex items-center gap-2 rounded-md border border-stone-500/40 bg-stone-900/50 px-4 py-2.5 text-sm font-medium text-stone-100 transition hover:border-stone-400/60"
            >
              <Cable className="size-4" />
              API
            </a>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-3 text-xs text-stone-400 animate-fade-up [animation-delay:220ms]">
          <span className="rounded border border-stone-600/50 px-2.5 py-1">
            Снимок: {catalogMeta.generatedAt}
          </span>
          <span className="rounded border border-stone-600/50 px-2.5 py-1">
            Проектов: {projects.length}
          </span>
          {liveAt && (
            <span className="rounded border border-lime-500/30 px-2.5 py-1 text-lime-200/80">
              Live: {formatDate(liveAt)}
            </span>
          )}
        </div>

        {error && (
          <p className="mt-4 flex items-center gap-2 text-sm text-amber-200">
            <ShieldAlert className="size-4 shrink-0" />
            {error}
          </p>
        )}
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <section className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center">
          <label className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-stone-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск: Hyperliquid, gas, Freqtrade, WebSocket…"
              className="w-full rounded-md border border-stone-600/50 bg-stone-950/60 py-2.5 pr-3 pl-10 text-sm text-stone-100 outline-none placeholder:text-stone-500 focus:border-lime-400/50"
            />
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="size-4 text-stone-500" />
            <select
              value={category}
              onChange={(e) =>
                setCategory(e.target.value as ProjectCategory | "all")
              }
              className="rounded-md border border-stone-600/50 bg-stone-950/60 px-3 py-2.5 text-sm text-stone-100"
            >
              <option value="all">Все категории</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
            <select
              value={maturity}
              onChange={(e) =>
                setMaturity(e.target.value as Maturity | "all")
              }
              className="rounded-md border border-stone-600/50 bg-stone-950/60 px-3 py-2.5 text-sm text-stone-100"
            >
              <option value="all">Любая зрелость</option>
              {MATURITIES.map((m) => (
                <option key={m} value={m}>
                  {MATURITY_LABELS[m]}
                </option>
              ))}
            </select>
          </div>
        </section>

        {filtered.length === 0 ? (
          <EmptyState query={query} />
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
            <aside className="flex flex-col gap-3">
              {filtered.map((project, index) => (
                <ProjectRow
                  key={project.id}
                  project={project}
                  active={selected?.id === project.id}
                  index={index}
                  onSelect={() => setSelectedId(project.id)}
                />
              ))}
            </aside>

            {selected && <ProjectDetail project={selected} />}
          </div>
        )}

        <ComparisonTable projects={filtered} onSelect={setSelectedId} />

        <footer className="mt-14 border-t border-stone-700/40 pt-6 text-sm leading-relaxed text-stone-500">
          <p>{catalogMeta.disclaimer}</p>
          <p className="mt-2">
            Исходный список: {catalogMeta.sourceList.join(" · ")}
          </p>
        </footer>
      </main>
    </div>
  );
}

function EmptyState({ query }: { query: string }) {
  return (
    <div className="rounded-lg border border-dashed border-stone-600/60 px-6 py-16 text-center">
      <p className="font-display text-xl text-stone-200">Ничего не найдено</p>
      <p className="mt-2 text-sm text-stone-400">
        {query
          ? `Нет проектов по запросу «${query}». Сбросьте фильтры или уточните поиск.`
          : "Измените фильтры категории или зрелости."}
      </p>
    </div>
  );
}

function ProjectRow({
  project,
  active,
  index,
  onSelect,
}: {
  project: ProjectWithLive;
  active: boolean;
  index: number;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      style={{ animationDelay: `${index * 40}ms` }}
      className={cn(
        "group animate-fade-up rounded-lg border px-4 py-4 text-left transition",
        active
          ? "border-lime-400/45 bg-lime-400/10 shadow-[0_0_0_1px_rgba(190,242,100,0.12)]"
          : "border-stone-700/50 bg-stone-950/40 hover:border-stone-500/60 hover:bg-stone-900/50"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.18em] text-lime-300/80 uppercase">
            {project.alias}
          </p>
          <h2 className="font-display mt-1 text-lg font-semibold text-stone-100">
            {project.name}
          </h2>
        </div>
        <span className="shrink-0 rounded border border-stone-600/50 px-2 py-0.5 text-[11px] text-stone-300">
          {MATURITY_LABELS[project.maturity]}
        </span>
      </div>
      <p className="mt-2 line-clamp-2 text-sm text-stone-400">
        {project.summary}
      </p>
      <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-stone-500">
        <span>{project.language}</span>
        <span>·</span>
        <span>{formatNumber(project.stars)} ★</span>
        <span>·</span>
        <span>{CATEGORY_LABELS[project.category]}</span>
        {project.realtime.websocket && (
          <>
            <span>·</span>
            <span className="inline-flex items-center gap-1 text-lime-300/70">
              <Radio className="size-3" /> WS
            </span>
          </>
        )}
      </div>
    </button>
  );
}

function ProjectDetail({ project }: { project: ProcessedProject & ProjectWithLive }) {
  return (
    <article className="animate-panel rounded-lg border border-stone-600/45 bg-stone-950/55 p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.2em] text-lime-300/85 uppercase">
            {project.alias} · confidence {project.confidence}
          </p>
          <h2 className="font-display mt-2 text-3xl font-bold text-stone-50">
            {project.shortName}
          </h2>
          <p className="mt-1 text-stone-400">{project.name}</p>
        </div>
        <a
          href={project.repo.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-md border border-stone-500/50 px-3 py-2 text-sm text-stone-100 transition hover:border-lime-400/40 hover:text-lime-100"
        >
          <GitBranch className="size-4" />
          {project.repo.owner}/{project.repo.name}
          <ArrowUpRight className="size-3.5 opacity-70" />
        </a>
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Stars" value={formatNumber(project.stars)} />
        <Stat label="Forks" value={formatNumber(project.forks)} />
        <Stat label="Issues" value={formatNumber(project.openIssues)} />
        <Stat label="Push" value={formatDate(project.lastPush)} />
      </dl>

      <LiveFeedPanel projectId={project.id} />

      <section className="mt-8 space-y-6">
        <Block title="Исходный claim">
          <p className="text-stone-400 italic">&ldquo;{project.sourceClaim}&rdquo;</p>
        </Block>

        <Block title="Проверенное резюме">
          <p className="text-stone-200 leading-relaxed">
            {project.verifiedSummary}
          </p>
          <p className="mt-2 text-sm text-stone-500">{project.matchNotes}</p>
        </Block>

        <Block title="Выходные данные (что обрабатывает / отдаёт)">
          <ul className="grid gap-3 sm:grid-cols-2">
            {project.outputs.map((o) => (
              <li
                key={o.id}
                className="rounded-md border border-stone-700/50 bg-stone-900/40 px-3 py-3"
              >
                <p className="text-sm font-medium text-lime-100/90">{o.label}</p>
                <p className="mt-1 text-xs leading-relaxed text-stone-400">
                  {o.description}
                </p>
              </li>
            ))}
          </ul>
        </Block>

        <div className="grid gap-6 sm:grid-cols-2">
          <Block title="Возможности">
            <TagList items={project.features} />
          </Block>
          <Block title="Стек">
            <TagList items={project.stack} />
          </Block>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <Block title="Realtime">
            <p className="text-sm text-stone-300">
              WebSocket:{" "}
              <strong className="text-stone-100">
                {project.realtime.websocket ? "да" : "нет"}
              </strong>
              {" · "}
              REST:{" "}
              <strong className="text-stone-100">
                {project.realtime.rest ? "да" : "нет"}
              </strong>
            </p>
            <p className="mt-2 text-xs text-stone-500">{project.realtime.notes}</p>
          </Block>
          <Block title="Биржи / рынки">
            <TagList items={[...project.exchanges, ...project.markets]} />
          </Block>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <Block title="Подходит для">
            <BulletList items={project.fitFor} tone="positive" />
          </Block>
          <Block title="Не подходит для">
            <BulletList items={project.notFor} tone="muted" />
          </Block>
        </div>

        <Block title="Риски">
          <BulletList items={project.riskNotes} tone="warn" />
        </Block>

        <Block title="Быстрый старт">
          <pre className="overflow-x-auto rounded-md border border-stone-700/50 bg-black/40 p-3 font-mono text-xs text-lime-100/80 whitespace-pre-wrap">
            {project.installHint}
          </pre>
        </Block>

        {project.relatedLinks.length > 0 && (
          <Block title="Связанные ссылки">
            <ul className="space-y-2">
              {project.relatedLinks.map((link) => (
                <li key={link.url}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-lime-200/90 underline-offset-2 hover:underline"
                  >
                    {link.label}
                    <ArrowUpRight className="size-3.5" />
                  </a>
                </li>
              ))}
            </ul>
          </Block>
        )}

        {project.liveError && (
          <p className="text-sm text-amber-200">Live: {project.liveError}</p>
        )}
      </section>
    </article>
  );
}

function ComparisonTable({
  projects,
  onSelect,
}: {
  projects: ProjectWithLive[];
  onSelect: (id: string) => void;
}) {
  if (projects.length === 0) return null;

  return (
    <section className="mt-12">
      <div className="mb-4 flex items-center gap-2">
        <Layers className="size-5 text-lime-300/80" />
        <h2 className="font-display text-2xl font-semibold text-stone-100">
          Сравнительная матрица
        </h2>
      </div>
      <div className="overflow-x-auto rounded-lg border border-stone-700/50">
        <table className="min-w-[720px] w-full border-collapse text-left text-sm">
          <thead className="bg-stone-900/80 text-stone-400">
            <tr>
              <th className="px-3 py-3 font-medium">Проект</th>
              <th className="px-3 py-3 font-medium">Категория</th>
              <th className="px-3 py-3 font-medium">Язык</th>
              <th className="px-3 py-3 font-medium">WS</th>
              <th className="px-3 py-3 font-medium">★</th>
              <th className="px-3 py-3 font-medium">Лицензия</th>
              <th className="px-3 py-3 font-medium">Статус</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => (
              <tr
                key={p.id}
                className="cursor-pointer border-t border-stone-800/80 transition hover:bg-lime-400/5"
                onClick={() => onSelect(p.id)}
              >
                <td className="px-3 py-3 font-medium text-stone-100">
                  {p.shortName}
                  <span className="mt-0.5 block text-xs font-normal text-stone-500">
                    {p.alias}
                  </span>
                </td>
                <td className="px-3 py-3 text-stone-300">
                  {CATEGORY_LABELS[p.category]}
                </td>
                <td className="px-3 py-3 text-stone-300">{p.language}</td>
                <td className="px-3 py-3 text-stone-300">
                  {p.realtime.websocket ? "да" : "—"}
                </td>
                <td className="px-3 py-3 text-stone-300">
                  {formatNumber(p.stars)}
                </td>
                <td className="px-3 py-3 text-stone-300">
                  {p.license ?? "n/a"}
                </td>
                <td className="px-3 py-3 text-stone-300">
                  {p.archived ? "archived" : MATURITY_LABELS[p.maturity]}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Block({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="text-xs font-semibold tracking-[0.16em] text-stone-500 uppercase">
        {title}
      </h3>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-stone-700/45 bg-stone-900/35 px-3 py-2">
      <dt className="text-[10px] tracking-wider text-stone-500 uppercase">
        {label}
      </dt>
      <dd className="mt-0.5 font-mono text-sm text-stone-100">{value}</dd>
    </div>
  );
}

function TagList({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <li
          key={item}
          className="rounded border border-stone-600/45 bg-stone-900/50 px-2 py-1 text-xs text-stone-300"
        >
          {item}
        </li>
      ))}
    </ul>
  );
}

function BulletList({
  items,
  tone,
}: {
  items: string[];
  tone: "positive" | "muted" | "warn";
}) {
  const color =
    tone === "positive"
      ? "text-lime-100/85"
      : tone === "warn"
        ? "text-amber-100/85"
        : "text-stone-400";
  return (
    <ul className={cn("space-y-1.5 text-sm", color)}>
      {items.map((item) => (
        <li key={item} className="flex gap-2">
          <span className="mt-1.5 size-1 shrink-0 rounded-full bg-current opacity-70" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
