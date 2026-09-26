// Data shapes for the Creator Studio. These mirror the Instagram Graph API so
// the demo data source can later be swapped for real API responses unchanged.

export type MediaType = "REEL" | "IMAGE" | "CAROUSEL" | "VIDEO";
export type ContentTopic =
  | "Tutorial"
  | "Tips"
  | "Story time"
  | "Behind the scenes"
  | "Talking head"
  | "Trend";
export type ContentFormat = "Reel" | "Carousel" | "Image";

export interface IgAccount {
  username: string;
  name: string;
  biography: string;
  niche: string;
  followersCount: number;
  followsCount: number;
  mediaCount: number;
}

export interface DaySnapshot {
  date: string; // yyyy-mm-dd
  followers: number;
  reach: number;
  profileViews: number;
  accountsEngaged: number;
}

export interface MediaInsights {
  reach: number;
  views: number; // Reel plays
  likes: number;
  comments: number;
  saved: number;
  shares: number;
  profileVisits: number;
  follows: number;
  avgWatchTimeSec: number;
}

export interface Media {
  id: string;
  mediaType: MediaType;
  format: ContentFormat;
  topic: ContentTopic;
  caption: string;
  hook: string;
  timestamp: string; // ISO
  weekday: number; // 0-6
  hour: number; // 0-23
  durationSec: number;
  tileColor: string;
  // Populated for real connected accounts; absent for demo data.
  permalink?: string;
  thumbnailUrl?: string;
  mediaUrl?: string;
  insights: MediaInsights;
}

export interface Demographics {
  age: { label: string; value: number }[];
  gender: { label: string; value: number }[];
  cities: { label: string; value: number }[];
  countries: { label: string; value: number }[];
}

export interface CreatorData {
  account: IgAccount;
  snapshots: DaySnapshot[];
  media: Media[];
  demographics: Demographics;
  isDemo: boolean;
  asOf: string;
}

// ---- analysis result types ----

export interface MediaMetrics {
  savesPer1k: number;
  sharesPer1k: number;
  profileVisitsPer1k: number;
  followsPer1k: number;
  engagementRate: number; // %
  score: number; // 0-100 vs the creator's own benchmark
}

export interface Benchmark {
  savesPer1k: number;
  sharesPer1k: number;
  profileVisitsPer1k: number;
  followsPer1k: number;
  avgViews: number;
}

export interface TopicStat {
  topic: ContentTopic;
  posts: number;
  avgViews: number;
  savesPer1k: number;
  profileVisitsPer1k: number;
  followsPer1k: number;
  score: number;
}

export interface Insight {
  id: string;
  tone: "positive" | "watch" | "negative";
  title: string;
  detail: string;
}

export interface ContentIdea {
  id: string;
  title: string;
  format: ContentFormat;
  topic: ContentTopic;
  hook: string;
  reason: string;
}

export interface Experiment {
  hypothesis: string;
  action: string;
  metricLabel: string;
  baseline: number;
  successCriteria: string[];
}

// ---- Monday Brief (deterministic risk detection) ----

export type Severity = "high" | "medium" | "good";
export type SignalArea =
  | "growth"
  | "reach"
  | "engagement"
  | "conversion"
  | "cadence"
  | "content";

export interface BriefSignal {
  id: string;
  severity: Severity;
  area: SignalArea;
  title: string; // one-line headline
  detail: string; // plain-language explanation
  metric?: string; // e.g. "-18% reach WoW"
  action?: string; // what to do about it
}

export interface WeeklyBrief {
  periodLabel: string; // e.g. "Sep 15 – Sep 21"
  headline: string;
  momentum: {
    followersDelta: number;
    followersPct: number;
    reachPct: number;
    engagementPct: number;
  };
  signals: BriefSignal[]; // sorted: high → medium → good
  focus: string[]; // 1–3 prioritized actions for the week
}
