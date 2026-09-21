import { getStudioData } from "@/lib/studio";
import {
  followerGrowth,
  periodDelta,
  generateInsights,
} from "@/lib/studio/metrics";
import { Card, CardHead, PageHeader, StatCard, compact } from "@/components/studio/ui";
import { Sparkline, TrendArea } from "@/components/studio/Charts";

const toneCls: Record<string, string> = {
  positive: "border-emerald-200 bg-emerald-50",
  watch: "border-amber-200 bg-amber-50",
  negative: "border-rose-200 bg-rose-50",
};
const toneDot: Record<string, string> = {
  positive: "bg-emerald-500",
  watch: "bg-amber-500",
  negative: "bg-rose-500",
};

export default async function StudioOverview() {
  const data = await getStudioData();
  const snaps = data.snapshots;

  const series = snaps.map((s) => ({
    date: s.date.slice(5).replace("-", "/"),
    followers: s.followers,
    reach: s.reach,
  }));
  const spark = series.slice(-14);

  // Follower delta over the last 30 days from daily snapshots.
  const last = snaps[snaps.length - 1]?.followers ?? 0;
  const ago30 = snaps[Math.max(0, snaps.length - 31)]?.followers ?? last;
  const followerPct = ago30 > 0 ? ((last - ago30) / ago30) * 100 : 0;

  const reach = periodDelta(data.media, data.asOf, "reach");
  const visits = periodDelta(data.media, data.asOf, "profileVisits");
  const follows = periodDelta(data.media, data.asOf, "follows");
  const growth = followerGrowth(data);
  const insights = generateInsights(data);

  return (
    <div>
      <PageHeader
        title="Overview"
        subtitle="Your last 90 days at a glance — the signals that actually move follower growth."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Followers"
          value={compact(last)}
          pct={followerPct}
          hint={`${growth.gained >= 0 ? "+" : ""}${growth.gained.toLocaleString()} in 90 days`}
          chart={<Sparkline data={spark} dataKey="followers" />}
        />
        <StatCard
          label="Reach (30d)"
          value={compact(reach.cur)}
          pct={reach.pct}
          hint="Unique accounts reached"
          chart={<Sparkline data={spark} dataKey="reach" color="#06b6d4" />}
        />
        <StatCard
          label="Profile visits (30d)"
          value={compact(visits.cur)}
          pct={visits.pct}
          hint="The step before a follow"
        />
        <StatCard
          label="New follows (30d)"
          value={compact(follows.cur)}
          pct={follows.pct}
          hint="From your content"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHead title="Follower growth" subtitle="Daily, last 90 days" />
          <div className="px-2 pb-3 pt-2">
            <TrendArea data={series} xKey="date" yKey="followers" />
          </div>
        </Card>
        <Card>
          <CardHead title="Reach" subtitle="Daily accounts reached" />
          <div className="px-2 pb-3 pt-2">
            <TrendArea data={series} xKey="date" yKey="reach" color="#06b6d4" />
          </div>
        </Card>
      </div>

      <div className="mt-6">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">What this means</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {insights.map((ins) => (
            <div
              key={ins.id}
              className={`rounded-2xl border p-4 ${toneCls[ins.tone]}`}
            >
              <div className="flex items-start gap-3">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${toneDot[ins.tone]}`} />
                <div>
                  <div className="text-sm font-semibold text-slate-900">{ins.title}</div>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">{ins.detail}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
