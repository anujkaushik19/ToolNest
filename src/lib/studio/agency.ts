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
