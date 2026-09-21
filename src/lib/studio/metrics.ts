import type {
  Benchmark,
  ContentIdea,
  CreatorData,
  Experiment,
  Insight,
  Media,
  MediaMetrics,
  TopicStat,
} from "./types";

const per1k = (x: number, views: number) => (views > 0 ? (x / views) * 1000 : 0);
const round1 = (x: number) => Math.round(x * 10) / 10;
const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

export function mediaMetrics(m: Media, bench: Benchmark): MediaMetrics {
  const i = m.insights;
  const savesPer1k = per1k(i.saved, i.views);
  const sharesPer1k = per1k(i.shares, i.views);
  const profileVisitsPer1k = per1k(i.profileVisits, i.views);
  const followsPer1k = per1k(i.follows, i.views);
  const engagementRate =
    i.reach > 0 ? ((i.likes + i.comments + i.saved + i.shares) / i.reach) * 100 : 0;

  // Composite score vs the creator's own benchmark (1.0 ratio ≈ 50).
  const ratios = [
    bench.savesPer1k ? savesPer1k / bench.savesPer1k : 1,
    bench.sharesPer1k ? sharesPer1k / bench.sharesPer1k : 1,
    bench.profileVisitsPer1k ? profileVisitsPer1k / bench.profileVisitsPer1k : 1,
    bench.followsPer1k ? followsPer1k / bench.followsPer1k : 1,
  ];
  const avgRatio = ratios.reduce((a, b) => a + b, 0) / ratios.length;
  const score = clamp(Math.round(50 * avgRatio), 1, 100);

  return {
    savesPer1k: round1(savesPer1k),
    sharesPer1k: round1(sharesPer1k),
    profileVisitsPer1k: round1(profileVisitsPer1k),
    followsPer1k: round1(followsPer1k),
    engagementRate: round1(engagementRate),
    score,
  };
}

export function benchmark(media: Media[]): Benchmark {
  if (!media.length) {
    return { savesPer1k: 0, sharesPer1k: 0, profileVisitsPer1k: 0, followsPer1k: 0, avgViews: 0 };
  }
  const avg = (fn: (m: Media) => number) =>
    media.reduce((s, m) => s + fn(m), 0) / media.length;
  return {
    savesPer1k: round1(avg((m) => per1k(m.insights.saved, m.insights.views))),
    sharesPer1k: round1(avg((m) => per1k(m.insights.shares, m.insights.views))),
    profileVisitsPer1k: round1(avg((m) => per1k(m.insights.profileVisits, m.insights.views))),
    followsPer1k: round1(avg((m) => per1k(m.insights.follows, m.insights.views))),
    avgViews: Math.round(avg((m) => m.insights.views)),
  };
}

export function topicStats(media: Media[], bench: Benchmark): TopicStat[] {
  const groups = new Map<string, Media[]>();
  for (const m of media) {
    if (!groups.has(m.topic)) groups.set(m.topic, []);
    groups.get(m.topic)!.push(m);
  }
  const stats: TopicStat[] = [];
  for (const [topic, list] of Array.from(groups.entries())) {
    const avg = (fn: (m: Media) => number) =>
      list.reduce((s: number, m: Media) => s + fn(m), 0) / list.length;
    const score =
      list.reduce((s: number, m: Media) => s + mediaMetrics(m, bench).score, 0) / list.length;
    stats.push({
      topic: topic as TopicStat["topic"],
      posts: list.length,
      avgViews: Math.round(avg((m) => m.insights.views)),
      savesPer1k: round1(avg((m) => per1k(m.insights.saved, m.insights.views))),
      profileVisitsPer1k: round1(avg((m) => per1k(m.insights.profileVisits, m.insights.views))),
      followsPer1k: round1(avg((m) => per1k(m.insights.follows, m.insights.views))),
      score: Math.round(score),
    });
  }
  return stats.sort((a, b) => b.score - a.score);
}

/** Reach aggregated by weekday × time-block for the best-time heatmap. */
export function bestTimes(media: Media[]) {
  const blocks = ["6-9", "9-12", "12-15", "15-18", "18-21", "21-24"];
  const grid: { weekday: number; block: string; reach: number; posts: number }[] = [];
  for (let d = 0; d < 7; d++) {
    for (const block of blocks) {
      grid.push({ weekday: d, block, reach: 0, posts: 0 });
    }
  }
  const blockOf = (h: number) => clamp(Math.floor((h - 6) / 3), 0, blocks.length - 1);
  for (const m of media) {
    const cell = grid.find((g) => g.weekday === m.weekday && g.block === blocks[blockOf(m.hour)]);
    if (cell) {
      cell.reach += m.insights.reach;
      cell.posts += 1;
    }
  }
  return { blocks, grid };
}

export function followerGrowth(data: CreatorData) {
  const s = data.snapshots;
  const first = s[0]?.followers ?? 0;
  const last = s[s.length - 1]?.followers ?? 0;
  const gained = last - first;
  const pct = first > 0 ? (gained / first) * 100 : 0;
  return { first, last, gained, pct: round1(pct) };
}

/** Sum a media insight over the trailing N days vs the prior N days. */
export function periodDelta(media: Media[], asOf: string, key: keyof Media["insights"], days = 30) {
  const now = new Date(asOf + "T00:00:00Z").getTime();
  const win = days * 86400000;
  let cur = 0;
  let prev = 0;
  for (const m of media) {
    const t = new Date(m.timestamp).getTime();
    if (t > now - win) cur += m.insights[key] as number;
    else if (t > now - 2 * win) prev += m.insights[key] as number;
  }
  const pct = prev > 0 ? ((cur - prev) / prev) * 100 : 0;
  return { cur, prev, pct: round1(pct) };
}

export function generateInsights(data: CreatorData): Insight[] {
  const bench = benchmark(data.media);
  const topics = topicStats(data.media, bench);
  const insights: Insight[] = [];
  const growth = followerGrowth(data);

  if (topics.length >= 2) {
    const best = topics[0];
    const worst = topics[topics.length - 1];
    if (best.profileVisitsPer1k > worst.profileVisitsPer1k * 1.25) {
      const mult = round1(best.profileVisitsPer1k / Math.max(0.1, worst.profileVisitsPer1k));
      insights.push({
        id: "topic-pv",
        tone: "positive",
        title: `"${best.topic}" drives ${mult}× more profile visits than "${worst.topic}"`,
        detail: `Per 1,000 views, your ${best.topic.toLowerCase()} content sends far more people to your profile — the first step to a follow. Make more of it.`,
      });
    }
  }

  const reachDelta = periodDelta(data.media, data.asOf, "reach");
  const followsDelta = periodDelta(data.media, data.asOf, "follows");
  if (reachDelta.pct > 8 && followsDelta.pct < reachDelta.pct - 6) {
    insights.push({
      id: "reach-vs-follows",
      tone: "watch",
      title: "Views are up, but follows aren't keeping pace",
      detail: `Reach grew ${reachDelta.pct}% vs last month while new follows grew ${followsDelta.pct}%. Your content gets seen — tighten your CTA and profile-worthy value to convert viewers into followers.`,
    });
  }

  const saves = topics[0];
  if (saves) {
    insights.push({
      id: "saves-leader",
      tone: "positive",
      title: `${saves.topic} is your highest-scoring format (${saves.score}/100)`,
      detail: `It averages ${saves.savesPer1k} saves and ${saves.followsPer1k} follows per 1,000 views — your most efficient growth engine right now.`,
    });
  }

  insights.push({
    tone: growth.gained >= 0 ? "positive" : "negative",
    id: "growth",
    title: `${growth.gained >= 0 ? "+" : ""}${growth.gained.toLocaleString()} followers in the last 90 days (${growth.pct}%)`,
    detail: `You went from ${growth.first.toLocaleString()} to ${growth.last.toLocaleString()}. Keep the experiment loop running to compound this.`,
  });

  return insights;
}

export function generateIdeas(data: CreatorData): ContentIdea[] {
  const bench = benchmark(data.media);
  const topics = topicStats(data.media, bench);
  const top = topics.slice(0, 2);
  const templates = [
    "A step-by-step breakdown of",
    "The 3 biggest mistakes in",
    "How I would start over with",
    "A myth-busting take on",
    "A 30-second win for",
  ];
  const subjects = ["your first coding project", "learning in public", "landing your first client", "staying consistent", "a beginner portfolio", "productivity as a creator"];
  const hooks = [
    "Stop scrolling if you want to learn this",
    "I wish someone told me this sooner",
    "Do this before your next attempt",
    "Here's the shortcut nobody shares",
    "This changed everything for me",
  ];
  const ideas: ContentIdea[] = [];
  for (let i = 0; i < 6; i++) {
    const t = top[i % top.length] ?? topics[0];
    ideas.push({
      id: `idea_${i}`,
      title: `${templates[i % templates.length]} ${subjects[i % subjects.length]}`,
      format: t.topic === "Tips" ? "Carousel" : "Reel",
      topic: t.topic,
      hook: hooks[i % hooks.length],
      reason: `Builds on your "${t.topic}" content, which scores ${t.score}/100 and drives ${t.followsPer1k} follows per 1k views — above your ${bench.followsPer1k} average.`,
    });
  }
  return ideas;
}

export function generateExperiment(data: CreatorData): Experiment {
  const bench = benchmark(data.media);
  const topics = topicStats(data.media, bench);
  const best = topics[0];
  return {
    hypothesis: `More ${best?.topic.toLowerCase() ?? "educational"} Reels with a clear problem-based hook will lift profile visits per 1,000 views above your recent baseline.`,
    action: `Publish 3 ${best?.topic ?? "Tutorial"} Reels this week, each opening with a specific problem in the first 2 seconds.`,
    metricLabel: "Profile visits per 1,000 views",
    baseline: best?.profileVisitsPer1k ?? bench.profileVisitsPer1k,
    successCriteria: [
      `Beat a baseline of ${best?.profileVisitsPer1k ?? bench.profileVisitsPer1k} profile visits / 1k views`,
      "Keep topic and length similar so the comparison is fair",
      "Track follows per 1k views as the secondary signal",
    ],
  };
}
