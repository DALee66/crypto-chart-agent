export type FeedSource = "live" | "simulated" | "hybrid";

export type FeedEvent = {
  id: string;
  projectId: string;
  source: FeedSource;
  ts: string;
  kind: string;
  label: string;
  payload: Record<string, unknown>;
};

export type ProjectFeedSnapshot = {
  projectId: string;
  source: FeedSource;
  updatedAt: string;
  status: "ok" | "degraded" | "error";
  note: string;
  metrics: Record<string, string | number | boolean | null>;
  events: FeedEvent[];
};

export type FeedsResponse = {
  updatedAt: string;
  mode: "stream-poll" | "snapshot";
  feeds: ProjectFeedSnapshot[];
};
