import type {
  ContentFormat,
  ContentTopic,
  CreatorData,
  DaySnapshot,
  Demographics,
  Media,
  MediaInsights,
} from "./types";

// Deterministic PRNG so the demo dataset is identical on server and client
// (no hydration mismatch) and stable across renders.
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ANCHOR = new Date("2026-09-21T00:00:00Z");
const DAYS = 90;

// Topic character: how each content type tends to perform for an education niche.
const TOPICS: {
  topic: ContentTopic;
  format: ContentFormat;
  weight: number;
  viewsMul: number;
  saveTilt: number;
  pvTilt: number;
  followTilt: number;
}[] = [
  { topic: "Tutorial", format: "Reel", weight: 3, viewsMul: 1.0, saveTilt: 1.9, pvTilt: 1.8, followTilt: 1.9 },
  { topic: "Tips", format: "Carousel", weight: 3, viewsMul: 0.8, saveTilt: 2.1, pvTilt: 1.5, followTilt: 1.5 },
  { topic: "Story time", format: "Reel", weight: 2, viewsMul: 1.4, saveTilt: 0.7, pvTilt: 0.9, followTilt: 0.7 },
  { topic: "Behind the scenes", format: "Reel", weight: 2, viewsMul: 1.1, saveTilt: 0.9, pvTilt: 1.1, followTilt: 1.0 },
  { topic: "Talking head", format: "Reel", weight: 2, viewsMul: 0.75, saveTilt: 0.8, pvTilt: 0.9, followTilt: 0.9 },
  { topic: "Trend", format: "Reel", weight: 2, viewsMul: 1.9, saveTilt: 0.5, pvTilt: 0.6, followTilt: 0.45 },
];

const TILE: Record<ContentTopic, string> = {
  Tutorial: "#6366f1",
  Tips: "#0ea5e9",
  "Story time": "#f59e0b",
  "Behind the scenes": "#10b981",
  "Talking head": "#8b5cf6",
  Trend: "#ec4899",
};

const HOOKS = [
  "The mistake that cost me 6 months",
  "Do this before you post your next Reel",
  "3 things I wish I knew earlier",
  "Stop doing this in your videos",
  "Here's how I actually did it",
  "You're doing this wrong (here's the fix)",
  "The fastest way to learn this",
  "Watch this before you start",
];

const CAPTIONS = [
  "Save this for later 📌",
  "Which one surprised you? 👇",
  "Follow for more like this.",
  "Tag someone who needs this.",
  "Full breakdown in comments.",
  "Try this and tell me how it goes.",
];

function iso(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function buildDemoData(): CreatorData {
  const rand = mulberry32(20260921);
  const account = {
    username: "learn.with.arjun",
    name: "Arjun · Tech & Learning",
    biography: "I help you learn to code & grow online · new Reel every 2 days",
    niche: "Tech & Education",
    followersCount: 0, // filled after snapshots
    followsCount: 812,
    mediaCount: 0,
  };

  // Base follower level ~90 days ago; posts add follows on their day.
  const startFollowers = 16850;

  // 1) generate media across the window
  const media: Media[] = [];
  for (let day = DAYS - 1; day >= 0; day--) {
    // ~ post every other day
    if (rand() > 0.52) continue;
    const t = TOPICS[Math.floor(pickWeightedIndex(TOPICS, rand()))];
    const date = new Date(ANCHOR.getTime() - day * 86400000);
    const hour = 8 + Math.floor(rand() * 13); // 8:00 - 20:00
    date.setUTCHours(hour, Math.floor(rand() * 60), 0, 0);

    const followerScale = startFollowers + (DAYS - day) * 18;
    const noise = 0.7 + rand() * 0.9;
    const views = Math.round(followerScale * 2.4 * t.viewsMul * noise);
    const reach = Math.round(views * (0.86 + rand() * 0.1));
    const likes = Math.round(views * (0.03 + rand() * 0.03));
    const comments = Math.round(views * (0.002 + rand() * 0.004));
    const saved = Math.round(views * (0.004 * t.saveTilt) * (0.7 + rand() * 0.7));
    const shares = Math.round(views * (0.003 * t.saveTilt) * (0.7 + rand() * 0.7));
    const profileVisits = Math.round(views * (0.01 * t.pvTilt) * (0.7 + rand() * 0.7));
    const follows = Math.round(profileVisits * (0.08 * t.followTilt) * (0.7 + rand() * 0.7));
    const durationSec = t.format === "Carousel" ? 0 : 12 + Math.floor(rand() * 40);
    const avgWatchTimeSec = durationSec
      ? Math.min(durationSec, durationSec * (0.4 + rand() * 0.5))
      : 0;

    const insights: MediaInsights = {
      reach,
      views,
      likes,
      comments,
      saved,
      shares,
      profileVisits,
      follows,
      avgWatchTimeSec: Math.round(avgWatchTimeSec * 10) / 10,
    };

    media.push({
      id: `media_${day}_${media.length}`,
      mediaType: t.format === "Carousel" ? "CAROUSEL" : "REEL",
      format: t.format,
      topic: t.topic,
      caption: `${CAPTIONS[Math.floor(rand() * CAPTIONS.length)]}`,
      hook: HOOKS[Math.floor(rand() * HOOKS.length)],
      timestamp: date.toISOString(),
      weekday: date.getUTCDay(),
      hour,
      durationSec,
      tileColor: TILE[t.topic],
      insights,
    });
  }
  media.sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp));

  // 2) build daily snapshots; followers accumulate from post-driven follows + organic
  const followsByDay = new Map<string, number>();
  for (const m of media) followsByDay.set(iso(new Date(m.timestamp)), (followsByDay.get(iso(new Date(m.timestamp))) ?? 0) + m.insights.follows);

  const snapshots: DaySnapshot[] = [];
  let followers = startFollowers;
  for (let day = DAYS - 1; day >= 0; day--) {
    const date = new Date(ANCHOR.getTime() - day * 86400000);
    const key = iso(date);
    const organic = Math.round(4 + rand() * 10);
    followers += (followsByDay.get(key) ?? 0) + organic;
    const dayMedia = media.filter((m) => iso(new Date(m.timestamp)) === key);
    const reach =
      Math.round(followers * (0.25 + rand() * 0.2)) +
      dayMedia.reduce((s, m) => s + m.insights.reach, 0);
    snapshots.push({
      date: key,
      followers,
      reach,
      profileViews:
        Math.round(followers * (0.01 + rand() * 0.01)) +
        dayMedia.reduce((s, m) => s + m.insights.profileVisits, 0),
      accountsEngaged: Math.round(reach * (0.06 + rand() * 0.04)),
    });
  }

  account.followersCount = followers;
  account.mediaCount = media.length + 140; // lifetime posts

  const demographics: Demographics = {
    age: [
      { label: "13-17", value: 6 },
      { label: "18-24", value: 41 },
      { label: "25-34", value: 34 },
      { label: "35-44", value: 13 },
      { label: "45+", value: 6 },
    ],
    gender: [
      { label: "Male", value: 63 },
      { label: "Female", value: 35 },
      { label: "Other", value: 2 },
    ],
    cities: [
      { label: "Mumbai", value: 18 },
      { label: "Delhi", value: 15 },
      { label: "Bengaluru", value: 14 },
      { label: "Hyderabad", value: 9 },
      { label: "Pune", value: 7 },
    ],
    countries: [
      { label: "India", value: 72 },
      { label: "United States", value: 9 },
      { label: "UAE", value: 5 },
      { label: "United Kingdom", value: 4 },
      { label: "Canada", value: 3 },
    ],
  };

  return {
    account,
    snapshots,
    media,
    demographics,
    isDemo: true,
    asOf: iso(ANCHOR),
  };
}

function pickWeightedIndex(items: { weight: number }[], r: number): number {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let x = r * total;
  for (let i = 0; i < items.length; i++) {
    if ((x -= items[i].weight) <= 0) return i;
  }
  return items.length - 1;
}
