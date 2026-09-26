import type { ContentFormat, ContentTopic, CreatorData, Media, MediaType } from "./types";

// Turns a creator's own exported CSV into the same CreatorData shape the demo
// and connected accounts use — so the exact same deterministic Monday Brief runs
// on it. Pure and browser-safe (types only): no DB, no network, ₹0.
//
// A posts CSV only carries content performance (reach, views, engagement), not a
// follower time-series. We deliberately leave snapshots empty and followers at 0
// so the brief never invents a follower-growth signal it can't support — it
// surfaces reach, cadence, engagement and content signals, which the data *does*
// support, and nudges the user to connect for the rest.

export type CsvMapping = Record<string, number>;

export interface CsvInput {
  headers: string[];
  rows: string[][];
  mapping: CsvMapping;
}

export interface CsvConversion {
  data: CreatorData;
  warnings: string[];
  postCount: number;
  spanDays: number;
}

const DAY = 86_400_000;

function num(v: string | undefined): number {
  if (!v) return 0;
  const n = Number(v.replace(/[,%\s]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

const dayStr = (d: Date) => d.toISOString().slice(0, 10);

export function csvToCreatorData(input: CsvInput, opts?: { username?: string; name?: string }): CsvConversion {
  const { rows, mapping } = input;
  const g = (r: string[], f: string) => (f in mapping ? num(r[mapping[f]]) : 0);
  const has = (f: string) => f in mapping;
  const warnings: string[] = [];

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  // Parse each row's date; synthesize an even cadence when none is present.
  const dates: (number | null)[] = rows.map((r) => {
    if (!has("date")) return null;
    const t = Date.parse(r[mapping.date]);
    return Number.isFinite(t) ? t : null;
  });
  if (!dates.some((d) => d !== null)) {
    warnings.push("No date column found — posts were spaced evenly to estimate cadence.");
  }

  const media: Media[] = rows.map((r, idx) => {
    const reach = g(r, "reach");
    const views = g(r, "views") || reach;
    const t = dates[idx] ?? today.getTime() - (rows.length - 1 - idx) * 3 * DAY;
    const d = new Date(t);
    const label = (has("label") ? r[mapping.label] : r[0]) || `Post ${idx + 1}`;
    const format: ContentFormat = views > reach * 1.15 ? "Reel" : "Image";
    const mediaType: MediaType = format === "Reel" ? "REEL" : "IMAGE";
    return {
      id: `csv-${idx}`,
      mediaType,
      format,
      topic: "Tips" as ContentTopic,
      caption: label,
      hook: label.slice(0, 80),
      timestamp: d.toISOString(),
      weekday: d.getUTCDay(),
      hour: 12,
      durationSec: format === "Reel" ? 30 : 0,
      tileColor: "#6366f1",
      insights: {
        reach: reach || views,
        views,
        likes: g(r, "likes"),
        comments: g(r, "comments"),
        saved: g(r, "saves"),
        shares: g(r, "shares"),
        profileVisits: 0,
        follows: 0,
        avgWatchTimeSec: 0,
      },
    };
  });

  const times = media.map((m) => Date.parse(m.timestamp));
  const asOfT = times.length ? Math.max(...times) : today.getTime();
  const minT = times.length ? Math.min(...times) : asOfT;
  const asOf = dayStr(new Date(asOfT));
  const spanDays = Math.max(1, Math.round((asOfT - minT) / DAY));

  if (!has("followers")) {
    warnings.push("No follower column — connect Instagram to unlock follower-growth signals.");
  }
  if (spanDays < 14) {
    warnings.push("Under two weeks of posts — week-over-week reach trends need a longer history.");
  }

  const data: CreatorData = {
    account: {
      username: opts?.username ?? "",
      name: opts?.name ?? "Your account",
      biography: "",
      niche: "",
      followersCount: 0, // 0 = unknown; keeps the brief from inventing growth signals
      followsCount: 0,
      mediaCount: media.length,
    },
    snapshots: [],
    media,
    demographics: { age: [], gender: [], cities: [], countries: [] },
    isDemo: false,
    asOf,
  };

  return { data, warnings, postCount: media.length, spanDays };
}
