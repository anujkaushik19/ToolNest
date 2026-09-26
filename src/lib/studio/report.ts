import { getCampaign, rosterHealth, type Campaign, type CreatorHealth } from "./agency";
import { benchmark, mediaMetrics } from "./metrics";
import type { CreatorData, Severity } from "./types";

// The client deliverable. This turns a campaign's live numbers into a single,
// self-contained report an agency can hand to a brand — no dashboard, no login.
// Everything here is deterministic and derived from data the agency already
// has, so a report costs ₹0 to produce and reads the same every time.

const DAY = 86_400_000;
const pct = (cur: number, prev: number) => (prev > 0 ? Math.round(((cur - prev) / prev) * 100) : 0);

function reachWindow(data: CreatorData, days = 7) {
  const now = new Date(data.asOf + "T00:00:00Z").getTime();
  const win = days * DAY;
  let cur = 0;
  let prev = 0;
  for (const m of data.media) {
    const t = new Date(m.timestamp).getTime();
    if (t > now - win) cur += m.insights.reach;
    else if (t > now - 2 * win) prev += m.insights.reach;
  }
  return { cur, prev };
}

function engagementRate(data: CreatorData, days = 7) {
  const now = new Date(data.asOf + "T00:00:00Z").getTime();
  const win = days * DAY;
  let eng = 0;
  let reach = 0;
  for (const m of data.media) {
    if (new Date(m.timestamp).getTime() <= now - win) continue;
    const i = m.insights;
    eng += i.likes + i.comments + i.saved + i.shares;
    reach += i.reach;
  }
  return reach > 0 ? (eng / reach) * 100 : 0;
}

function followerWindow(data: CreatorData) {
  const s = data.snapshots;
  if (!s.length) return { now: data.account.followersCount, then: data.account.followersCount };
  const now = s[s.length - 1].followers;
  const then = (s[s.length - 8] ?? s[0]).followers;
  return { now, then };
}

function postsThisWeek(data: CreatorData) {
  const now = new Date(data.asOf + "T00:00:00Z").getTime();
  return data.media.filter((m) => new Date(m.timestamp).getTime() > now - 7 * DAY).length;
}

function labelDate(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

export interface ReportCreatorRow {
  name: string;
  username: string;
  niche: string;
  followers: number;
  followersDelta: number;
  weekReach: number;
  reachPct: number;
  engagementRate: number;
  posts: number;
  worst: Severity;
}

export interface ReportBestPost {
  creatorName: string;
  username: string;
  hook: string;
  format: string;
  reach: number;
  views: number;
  saves: number;
  score: number;
}

export interface CampaignReport {
  campaign: Campaign;
  generatedOn: string;
  periodLabel: string;
  totals: {
    creators: number;
    followers: number;
    followersDelta: number;
    reach: number;
    reachPct: number;
    engagementRate: number;
    posts: number;
  };
  topCreator: ReportCreatorRow | null;
  bestPost: ReportBestPost | null;
  highlights: string[];
  optimizations: string[];
  creators: ReportCreatorRow[];
}

function toRow(h: CreatorHealth): ReportRow {
  const rw = reachWindow(h.data);
  const fw = followerWindow(h.data);
  return {
    row: {
      name: h.data.account.name,
      username: h.data.account.username,
      niche: h.data.account.niche,
      followers: h.data.account.followersCount,
      followersDelta: fw.now - fw.then,
      weekReach: rw.cur,
      reachPct: pct(rw.cur, rw.prev),
      engagementRate: Math.round(engagementRate(h.data) * 10) / 10,
      posts: postsThisWeek(h.data),
      worst: h.worst,
    },
    curReach: rw.cur,
    prevReach: rw.prev,
  };
}

interface ReportRow {
  row: ReportCreatorRow;
  curReach: number;
  prevReach: number;
}

function bestPostAcross(members: CreatorHealth[]): ReportBestPost | null {
  let best: ReportBestPost | null = null;
  for (const h of members) {
    const now = new Date(h.data.asOf + "T00:00:00Z").getTime();
    const bench = benchmark(h.data.media);
    for (const m of h.data.media) {
      if (new Date(m.timestamp).getTime() <= now - 14 * DAY) continue;
      const mm = mediaMetrics(m, bench);
      if (!best || mm.score > best.score || (mm.score === best.score && m.insights.reach > best.reach)) {
        best = {
          creatorName: h.data.account.name,
          username: h.data.account.username,
          hook: m.hook,
          format: m.format,
          reach: m.insights.reach,
          views: m.insights.views,
          saves: m.insights.saved,
          score: mm.score,
        };
      }
    }
  }
  return best;
}

/** Build the full client report for a campaign, or null if it doesn't exist. */
export function buildCampaignReport(id: string): CampaignReport | null {
  const campaign = getCampaign(id);
  if (!campaign) return null;

  const members = rosterHealth().filter((h) =>
    campaign.creatorUsernames.includes(h.data.account.username),
  );

  const parsed = members.map(toRow);
  const rows = parsed.map((p) => p.row);

  const totalReach = parsed.reduce((s, p) => s + p.curReach, 0);
  const prevReach = parsed.reduce((s, p) => s + p.prevReach, 0);
  const totalFollowers = rows.reduce((s, r) => s + r.followers, 0);
  const totalFollowersDelta = rows.reduce((s, r) => s + r.followersDelta, 0);
  const totalPosts = rows.reduce((s, r) => s + r.posts, 0);

  // Portfolio-weighted engagement rate (weighted by each creator's week reach).
  const engNum = parsed.reduce((s, p) => s + (p.row.engagementRate * p.curReach) / 100, 0);
  const portfolioEng = totalReach > 0 ? Math.round((engNum / totalReach) * 1000) / 10 : 0;

  const topCreator = rows.length
    ? rows.reduce((a, b) => (b.weekReach > a.weekReach ? b : a))
    : null;
  const bestPost = bestPostAcross(members);

  // Reference date: the roster shares one asOf; fall back to today if empty.
  const asOf = members[0]?.data.asOf ?? new Date().toISOString().slice(0, 10);
  const asOfDate = new Date(asOf + "T00:00:00Z");
  const weekAgo = new Date(asOfDate.getTime() - 6 * DAY);

  // What worked — lead with the portfolio headline, then each creator's wins.
  const highlights: string[] = [];
  if (rows.length) {
    highlights.push(
      `${rows.length} creators delivered a combined ${totalReach.toLocaleString("en-US")} reach this week` +
        (prevReach > 0 ? `, ${pct(totalReach, prevReach) >= 0 ? "up" : "down"} ${Math.abs(pct(totalReach, prevReach))}% vs the prior week.` : "."),
    );
  }
  for (const h of members) {
    for (const s of h.brief.signals) {
      if (s.severity !== "good") continue;
      highlights.push(`@${h.data.account.username}: ${s.title}`);
    }
  }

  // What we're optimising next — the open risks, worst first, de-duplicated.
  const seen = new Set<string>();
  const optimizations: string[] = [];
  const ranked = members
    .flatMap((h) => h.brief.signals.map((s) => ({ s, username: h.data.account.username })))
    .filter((x) => x.s.severity !== "good")
    .sort((a, b) => (a.s.severity === "high" ? -1 : 1) - (b.s.severity === "high" ? -1 : 1));
  for (const { s, username } of ranked) {
    const line = `@${username} — ${s.action ?? s.title}`;
    if (seen.has(line)) continue;
    seen.add(line);
    optimizations.push(line);
  }

  return {
    campaign,
    generatedOn: labelDate(asOfDate),
    periodLabel: `${labelDate(weekAgo)} – ${labelDate(asOfDate)}`,
    totals: {
      creators: rows.length,
      followers: totalFollowers,
      followersDelta: totalFollowersDelta,
      reach: totalReach,
      reachPct: pct(totalReach, prevReach),
      engagementRate: portfolioEng,
      posts: totalPosts,
    },
    topCreator,
    bestPost,
    highlights: highlights.slice(0, 5),
    optimizations: optimizations.slice(0, 5),
    creators: rows.sort((a, b) => b.weekReach - a.weekReach),
  };
}
