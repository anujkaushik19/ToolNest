import { cache } from "react";
import { buildDemoData, type DemoOptions } from "./demo";
import { generateBrief } from "./brief";
import { isDbConfigured } from "@/lib/db";
import type { BriefSignal, CreatorData, Severity, WeeklyBrief } from "./types";

// The agency layer. An agency oversees many creators grouped into brand
// campaigns; this module rolls every creator's individual Monday Brief up into
// one portfolio view. Today it runs on a demo roster (₹0, no DB). When a
// database + connected creators exist, getRoster() will read those instead —
// the aggregation logic above it never changes.

export interface Campaign {
  id: string;
  name: string;
  brand: string;
  status: "active" | "planning" | "completed";
  startDate: string;
  endDate: string;
  goal: string;
  targetReach: number; // the reach the campaign is committed to deliver
  creatorUsernames: string[];
}

// Demo roster: five creators, each with a different trajectory so the command
// centre surfaces a realistic mix of wins and risks.
const ROSTER_SPEC: DemoOptions[] = [
  { seed: 20260921, username: "learn.with.arjun", name: "Arjun · Tech & Learning", niche: "Tech & Education", startFollowers: 16850, health: "growing" },
  { seed: 771233, username: "fitwithmeera", name: "Meera Kapoor", niche: "Fitness & Wellness", startFollowers: 48200, followsCount: 640, health: "declining" },
  { seed: 55412, username: "finance.by.raj", name: "Raj Malhotra", niche: "Personal Finance", startFollowers: 92400, followsCount: 310, health: "stalled" },
  { seed: 903117, username: "thecuratedhome", name: "Nisha · Home & Decor", niche: "Home & Lifestyle", startFollowers: 27600, followsCount: 980, health: "gap" },
  { seed: 218890, username: "streetstyle.sana", name: "Sana Sheikh", niche: "Fashion & Style", startFollowers: 61300, followsCount: 720, health: "steady" },
];

const CAMPAIGNS: Campaign[] = [
  {
    id: "nykaa-festive",
    name: "Nykaa Festive Push",
    brand: "Nykaa",
    status: "active",
    startDate: "2026-09-08",
    endDate: "2026-10-05",
    goal: "Drive festive-season awareness and saves across lifestyle creators.",
    targetReach: 3_000_000,
    creatorUsernames: ["fitwithmeera", "streetstyle.sana", "thecuratedhome"],
  },
  {
    id: "zerodha-basics",
    name: "Zerodha Money Basics",
    brand: "Zerodha",
    status: "active",
    startDate: "2026-09-01",
    endDate: "2026-09-30",
    goal: "Educate first-time investors with clear, trustworthy explainers.",
    targetReach: 4_800_000,
    creatorUsernames: ["finance.by.raj", "learn.with.arjun"],
  },
  {
    id: "boat-launch",
    name: "boAt Airdopes Launch",
    brand: "boAt",
    status: "planning",
    startDate: "2026-10-10",
    endDate: "2026-11-02",
    goal: "Build launch-week buzz with fast, trend-led Reels.",
    targetReach: 800_000,
    creatorUsernames: ["streetstyle.sana", "learn.with.arjun"],
  },
];

/** The creators the agency oversees. Demo today; DB-backed once connected. */
export const getRoster = cache((): CreatorData[] => {
  // isDbConfigured() is referenced so the DB-backed path is an obvious next
  // step; until then every environment uses the deterministic demo roster.
  void isDbConfigured;
  return ROSTER_SPEC.map((spec) => buildDemoData(spec));
});

export function getCampaigns(): Campaign[] {
  return CAMPAIGNS;
}

export function getCampaign(id: string): Campaign | undefined {
  return CAMPAIGNS.find((c) => c.id === id);
}

export interface CreatorHealth {
  data: CreatorData;
  brief: WeeklyBrief;
  worst: Severity;
  riskCount: number;
}

const SEVERITY_RANK: Record<Severity, number> = { high: 0, medium: 1, good: 2 };

function worstSeverity(signals: BriefSignal[]): Severity {
  return signals.reduce<Severity>(
    (w, s) => (SEVERITY_RANK[s.severity] < SEVERITY_RANK[w] ? s.severity : w),
    "good",
  );
}

/** Every creator with their computed brief and a health summary. */
export const rosterHealth = cache((): CreatorHealth[] => {
  return getRoster().map((data) => {
    const brief = generateBrief(data);
    return {
      data,
      brief,
      worst: worstSeverity(brief.signals),
      riskCount: brief.signals.filter((s) => s.severity !== "good").length,
    };
  });
});

export interface PortfolioSignal extends BriefSignal {
  username: string;
  creatorName: string;
}

/** All non-good signals across the roster, worst first — the agency's Monday. */
export function portfolioSignals(usernames?: string[]): PortfolioSignal[] {
  const set = usernames ? new Set(usernames) : null;
  const out: PortfolioSignal[] = [];
  for (const h of rosterHealth()) {
    if (set && !set.has(h.data.account.username)) continue;
    for (const s of h.brief.signals) {
      if (s.severity === "good") continue;
      out.push({ ...s, username: h.data.account.username, creatorName: h.data.account.name });
    }
  }
  return out.sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);
}

export function healthByUsername(username: string): CreatorHealth | undefined {
  return rosterHealth().find((h) => h.data.account.username === username);
}

const DAY = 86_400_000;

export type PaceStatus = "not-started" | "behind" | "at-risk" | "on-track" | "ahead" | "complete";

export interface CampaignPacing {
  status: PaceStatus;
  daysTotal: number;
  daysElapsed: number;
  daysRemaining: number;
  daysUntilStart: number;
  timePct: number; // share of the campaign window that has passed
  delivered: number; // reach delivered so far
  target: number;
  goalPct: number; // delivered vs target
  expected: number; // reach we'd expect by now at a steady pace
  paceRatio: number; // delivered vs expected (1.0 = exactly on pace)
}

/** The data's reference "now" — demo shares one anchor; keeps every view coherent. */
function referenceNow(): number {
  const asOf = getRoster()[0]?.asOf;
  return asOf ? new Date(asOf + "T00:00:00Z").getTime() : Date.now();
}

/** Sum reach delivered by a campaign's creators between start and the cap date. */
function deliveredReach(usernames: string[], startMs: number, capMs: number): number {
  const set = new Set(usernames);
  let total = 0;
  for (const data of getRoster()) {
    if (!set.has(data.account.username)) continue;
    for (const m of data.media) {
      const t = new Date(m.timestamp).getTime();
      if (t >= startMs && t <= capMs) total += m.insights.reach;
    }
  }
  return total;
}

/** Is the campaign on track to hit its reach target, given the time elapsed? */
export function pacing(campaign: Campaign): CampaignPacing {
  const now = referenceNow();
  const start = new Date(campaign.startDate + "T00:00:00Z").getTime();
  const end = new Date(campaign.endDate + "T00:00:00Z").getTime();
  const daysTotal = Math.max(1, Math.round((end - start) / DAY));

  // Not started yet.
  if (now < start) {
    return {
      status: "not-started",
      daysTotal,
      daysElapsed: 0,
      daysRemaining: daysTotal,
      daysUntilStart: Math.ceil((start - now) / DAY),
      timePct: 0,
      delivered: 0,
      target: campaign.targetReach,
      goalPct: 0,
      expected: 0,
      paceRatio: 0,
    };
  }

  const cap = Math.min(now, end);
  const delivered = deliveredReach(campaign.creatorUsernames, start, cap);
  const elapsed = Math.min(daysTotal, Math.max(0, Math.round((cap - start) / DAY)));
  const timeFraction = Math.min(1, elapsed / daysTotal);
  const expected = Math.round(campaign.targetReach * timeFraction);
  const paceRatio = expected > 0 ? delivered / expected : 0;
  const goalPct = campaign.targetReach > 0 ? Math.round((delivered / campaign.targetReach) * 100) : 0;

  let status: PaceStatus;
  if (now >= end) status = "complete";
  else if (paceRatio >= 1.1) status = "ahead";
  else if (paceRatio >= 0.95) status = "on-track";
  else if (paceRatio >= 0.8) status = "at-risk";
  else status = "behind";

  return {
    status,
    daysTotal,
    daysElapsed: elapsed,
    daysRemaining: Math.max(0, daysTotal - elapsed),
    daysUntilStart: 0,
    timePct: Math.round(timeFraction * 100),
    delivered,
    target: campaign.targetReach,
    goalPct,
    expected,
    paceRatio: Math.round(paceRatio * 100) / 100,
  };
}
