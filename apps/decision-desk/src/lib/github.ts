import { projects, type ProcessedProject } from "@/data/projects";

export type LiveGithubStats = {
  stars: number;
  forks: number;
  openIssues: number;
  archived: boolean;
  lastPush: string;
  language: string | null;
  license: string | null;
  description: string | null;
  fetchedAt: string;
};

export type ProjectWithLive = ProcessedProject & {
  live?: LiveGithubStats | null;
  liveError?: string;
};

async function fetchRepoStats(
  owner: string,
  name: string
): Promise<LiveGithubStats> {
  const res = await fetch(`https://api.github.com/repos/${owner}/${name}`, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "crypto-bot-intelligence",
    },
    next: { revalidate: 300 },
  });

  if (!res.ok) {
    throw new Error(`GitHub ${res.status} for ${owner}/${name}`);
  }

  const data = await res.json();
  return {
    stars: data.stargazers_count ?? 0,
    forks: data.forks_count ?? 0,
    openIssues: data.open_issues_count ?? 0,
    archived: Boolean(data.archived),
    lastPush: data.pushed_at ?? "",
    language: data.language ?? null,
    license: data.license?.spdx_id ?? null,
    description: data.description ?? null,
    fetchedAt: new Date().toISOString(),
  };
}

export async function enrichProjectsWithLive(
  live: boolean
): Promise<ProjectWithLive[]> {
  if (!live) {
    return projects.map((p) => ({ ...p, live: null }));
  }

  const results = await Promise.all(
    projects.map(async (p) => {
      try {
        const stats = await fetchRepoStats(p.repo.owner, p.repo.name);
        return {
          ...p,
          stars: stats.stars,
          forks: stats.forks,
          openIssues: stats.openIssues,
          archived: stats.archived,
          lastPush: stats.lastPush || p.lastPush,
          language: stats.language ?? p.language,
          license: stats.license ?? p.license,
          live: stats,
        } satisfies ProjectWithLive;
      } catch (e) {
        return {
          ...p,
          live: null,
          liveError: e instanceof Error ? e.message : "Live fetch failed",
        } satisfies ProjectWithLive;
      }
    })
  );

  return results;
}
