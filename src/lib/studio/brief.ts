import type { BriefSignal, CreatorData, Media, Severity, WeeklyBrief } from "./types";
import { generateExperiment, mediaMetrics, benchmark } from "./metrics";

// The Monday Brief. Pure, deterministic risk detection over the numbers we
// already have — no AI, no external calls, no cost. It answers three questions
// an agency (or creator) asks every Monday: what changed, what's at risk, and
// what to do this week. A future LLM layer may only *reword* this output; it
// never computes it. That keeps the product explainable and free to run.

const DAY = 86400000;
const round1 = (x: number) => Math.round(x * 10) / 10;
const pctChange = (a: number, b: number) => (b > 0 ? round1(((a - b) / b) * 100) : a > 0 ? 100 : 0);

interface WindowSum {
  reach: number;
  views: number;
  likes: number;
  comments: number;
  saved: number;
  shares: number;
  follows: number;
  profileVisits: number;
  posts: number;
}

function emptyWindow(): WindowSum {
  return { reach: 0, views: 0, likes: 0, comments: 0, saved: 0, shares: 0, follows: 0, profileVisits: 0, posts: 0 };
}

/** Sum media insights over the trailing `days` window vs the prior window. */
function windowSums(media: Media[], asOf: string, days: number) {
  const now = new Date(asOf + "T00:00:00Z").getTime();
  const win = days * DAY;
  const cur = emptyWindow();
  const prev = emptyWindow();
  for (const m of media) {
    const t = new Date(m.timestamp).getTime();
    const bucket = t > now - win ? cur : t > now - 2 * win ? prev : null;
    if (!bucket) continue;
    const i = m.insights;
    bucket.reach += i.reach;
    bucket.views += i.views;
    bucket.likes += i.likes;
    bucket.comments += i.comments;
    bucket.saved += i.saved;
    bucket.shares += i.shares;
    bucket.follows += i.follows;
    bucket.profileVisits += i.profileVisits;
    bucket.posts += 1;
  }
  return { cur, prev };
}

/** Follower count now vs `days` ago, from the daily snapshot history. */
function followerWindow(data: CreatorData, days: number) {
  const snaps = data.snapshots;
  const last = snaps[snaps.length - 1]?.followers ?? data.account.followersCount;
  const target = new Date(data.asOf + "T00:00:00Z").getTime() - days * DAY;
  const older = snaps.filter((s) => Date.parse(s.date) <= target);
  const ago = (older.length ? older[older.length - 1] : snaps[0])?.followers ?? last;
  const delta = last - ago;
  return { last, ago, delta, pct: pctChange(last, ago) };
}

const engRate = (w: WindowSum) =>
  w.reach > 0 ? ((w.likes + w.comments + w.saved + w.shares) / w.reach) * 100 : 0;

const SEVERITY_ORDER: Record<Severity, number> = { high: 0, medium: 1, good: 2 };

export function generateBrief(data: CreatorData): WeeklyBrief {
  const asOf = new Date(data.asOf + "T00:00:00Z");
  const weekAgo = new Date(asOf.getTime() - 7 * DAY);
  const periodLabel = `${weekAgo.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${asOf.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;

  const { cur, prev } = windowSums(data.media, data.asOf, 7);
  const fol = followerWindow(data, 7);
  const reachPct = pctChange(cur.reach, prev.reach);
  const followsPct = pctChange(cur.follows, prev.follows);
  const engCur = engRate(cur);
  const engPrev = engRate(prev);
  const engPct = engPrev > 0 ? round1(((engCur - engPrev) / engPrev) * 100) : 0;

  const now = asOf.getTime();
  const lastPostT = data.media.reduce((mx, m) => Math.max(mx, new Date(m.timestamp).getTime()), 0);
  const daysSince = lastPostT ? Math.floor((now - lastPostT) / DAY) : 99;

  const signals: BriefSignal[] = [];
  const hasPrev = prev.posts > 0;

  // 1. Follower momentum
  if (fol.delta < 0) {
    signals.push({
      id: "growth-loss",
      severity: "high",
      area: "growth",
      title: `You lost ${Math.abs(fol.delta).toLocaleString()} followers this week`,
      detail: `Net followers went from ${fol.ago.toLocaleString()} to ${fol.last.toLocaleString()}. A losing week usually points to a content miss or a drop in posting — the signals below narrow it down.`,
      metric: `${fol.pct}% followers`,
      action: "Review this week's lowest-reach posts and lean back into a format that reliably grows you.",
    });
  } else if (fol.ago > 0 && fol.pct < 0.4) {
    signals.push({
      id: "growth-stall",
      severity: "medium",
      area: "growth",
      title: "Follower growth has stalled",
      detail: `You added just ${fol.delta.toLocaleString()} followers (${fol.pct}%) this week. Flat weeks are the moment to run a deliberate experiment rather than coast.`,
      metric: `+${fol.pct}% followers`,
      action: "Ship one high-intent post built around your best-converting topic this week.",
    });
  } else if (fol.pct >= 2) {
    signals.push({
      id: "growth-strong",
      severity: "good",
      area: "growth",
      title: `Followers up ${fol.pct}% this week (+${fol.delta.toLocaleString()})`,
      detail: "Growth is accelerating. Bank what worked and repeat the format while it's hot.",
      metric: `+${fol.pct}% followers`,
    });
  }

  // 2. Reach momentum
  if (hasPrev && reachPct <= -15) {
    signals.push({
      id: "reach-drop",
      severity: "high",
      area: "reach",
      title: `Reach fell ${Math.abs(reachPct)}% week-over-week`,
      detail: `Fewer people are seeing your content (${cur.reach.toLocaleString()} vs ${prev.reach.toLocaleString()} reached). This is the earliest warning sign of lost momentum.`,
      metric: `${reachPct}% reach WoW`,
      action: "Post a proven high-reach format early this week to rebuild distribution.",
    });
  } else if (hasPrev && reachPct <= -7) {
    signals.push({
      id: "reach-soft",
      severity: "medium",
      area: "reach",
      title: `Reach is softening (${reachPct}% WoW)`,
      detail: `Distribution slipped from ${prev.reach.toLocaleString()} to ${cur.reach.toLocaleString()} reached. Not alarming yet, but worth a corrective post.`,
      metric: `${reachPct}% reach WoW`,
      action: "Re-use a hook style that overperformed in the last month.",
    });
  } else if (hasPrev && reachPct >= 15) {
    signals.push({
      id: "reach-up",
      severity: "good",
      area: "reach",
      title: `Reach is climbing (+${reachPct}% WoW)`,
      detail: `You reached ${cur.reach.toLocaleString()} this week, up from ${prev.reach.toLocaleString()}. The algorithm is favoring you — feed it more of the same.`,
      metric: `+${reachPct}% reach WoW`,
    });
  }

  // 3. Posting cadence
  if (daysSince >= 7) {
    signals.push({
      id: "cadence-gap",
      severity: "high",
      area: "cadence",
      title: `No new post in ${daysSince} days`,
      detail: "Consistency is the single biggest lever on reach. Long gaps train the algorithm to stop showing your content.",
      metric: `${daysSince}d since last post`,
      action: "Publish at least one post in the next 48 hours to restart distribution.",
    });
  } else if (daysSince >= 4) {
    signals.push({
      id: "cadence-slow",
      severity: "medium",
      area: "cadence",
      title: `It's been ${daysSince} days since your last post`,
      detail: "You're drifting from a steady cadence. A predictable rhythm keeps reach compounding.",
      metric: `${daysSince}d since last post`,
      action: "Lock in a posting day this week and prep a post today.",
    });
  }

  // 4. Conversion leak — views up but follows lagging
  if (hasPrev && reachPct >= 8 && followsPct <= reachPct - 8) {
    signals.push({
      id: "conversion-leak",
      severity: "medium",
      area: "conversion",
      title: "Views are up, but new follows aren't converting",
      detail: `Reach grew ${reachPct}% while new follows moved ${followsPct >= 0 ? "+" : ""}${followsPct}%. People are watching but not committing — the gap is your CTA and profile value.`,
      metric: `${followsPct}% follows vs ${reachPct}% reach`,
      action: "Add an explicit reason-to-follow in your hook and pin a profile-worthy value post.",
    });
  }

  // 5. Engagement fade
  if (hasPrev && cur.reach > 0 && engPct <= -12) {
    signals.push({
      id: "engagement-fade",
      severity: "medium",
      area: "engagement",
      title: `Engagement rate is cooling (${engPct}%)`,
      detail: `Your audience is reacting less per view (${round1(engCur)}% vs ${round1(engPrev)}% last week). Content is landing flatter — invite a response.`,
      metric: `${engPct}% engagement rate`,
      action: "Open with a question or a bold claim to pull comments in the first line.",
    });
  }

  // 6. Content win — best post of the week
  const bench = benchmark(data.media);
  const weekMedia = data.media.filter((m) => new Date(m.timestamp) >= weekAgo);
  const topPost = weekMedia
    .map((m) => ({ m, x: mediaMetrics(m, bench) }))
    .sort((a, b) => b.x.score - a.x.score)[0];
  if (topPost && topPost.x.score >= 60) {
    signals.push({
      id: "content-win",
      severity: "good",
      area: "content",
      title: `Your "${topPost.m.hook}" ${topPost.m.format} is this week's standout (${topPost.x.score}/100)`,
      detail: `It drove ${topPost.x.savesPer1k} saves and ${topPost.x.followsPer1k} follows per 1,000 views — above your own average. This is a format worth repeating.`,
      metric: `${topPost.x.score}/100`,
    });
  }

  // Never return an empty brief — reassure when nothing needs attention.
  if (!signals.some((s) => s.severity !== "good")) {
    signals.push({
      id: "steady",
      severity: "good",
      area: "growth",
      title: "Momentum looks healthy — nothing urgent this week",
      detail: "No risk signals fired. Keep your posting rhythm and run one small experiment to keep compounding.",
    });
  }

  signals.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);

  const highs = signals.filter((s) => s.severity === "high").length;
  const meds = signals.filter((s) => s.severity === "medium").length;
  const headline =
    highs > 0
      ? `${highs} thing${highs > 1 ? "s" : ""} need${highs > 1 ? "" : "s"} your attention this week`
      : meds > 0
        ? `${meds} thing${meds > 1 ? "s" : ""} to watch, but nothing urgent`
        : "Momentum looks healthy — keep the loop running";

  const focus: string[] = [];
  for (const s of signals) {
    if (s.action && !focus.includes(s.action)) focus.push(s.action);
    if (focus.length >= 3) break;
  }
  if (focus.length < 3) {
    const exp = generateExperiment(data);
    if (!focus.includes(exp.action)) focus.push(exp.action);
  }

  return {
    periodLabel,
    headline,
    momentum: {
      followersDelta: fol.delta,
      followersPct: fol.pct,
      reachPct,
      engagementPct: engPct,
    },
    signals,
    focus,
  };
}
