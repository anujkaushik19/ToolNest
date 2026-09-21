import { getStudioData } from "@/lib/studio";
import { benchmark, generateExperiment, generateInsights, mediaMetrics, periodDelta } from "@/lib/studio/metrics";
import { Card, CardHead, DeltaPill, PageHeader, compact } from "@/components/studio/ui";
import { ArrowRight, Trophy } from "lucide-react";

export default async function ReportPage() {
  const data = await getStudioData();
  const bench = benchmark(data.media);
  const asOf = new Date(data.asOf + "T00:00:00Z");
  const weekAgo = new Date(asOf.getTime() - 7 * 86400000);

  const snaps = data.snapshots;
  const last = snaps[snaps.length - 1]?.followers ?? 0;
  const ago7 = snaps[Math.max(0, snaps.length - 8)]?.followers ?? last;

  const reach = periodDelta(data.media, data.asOf, "reach", 7);
  const visits = periodDelta(data.media, data.asOf, "profileVisits", 7);
  const follows = periodDelta(data.media, data.asOf, "follows", 7);

  const weekMedia = data.media.filter((m) => new Date(m.timestamp) >= weekAgo);
  const topPost =
    weekMedia
      .map((m) => ({ m, x: mediaMetrics(m, bench) }))
      .sort((a, b) => b.x.score - a.x.score)[0] ?? null;

  const insight = generateInsights(data)[0];
  const experiment = generateExperiment(data);

  const range = `${weekAgo.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${asOf.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;

  return (
    <div>
      <PageHeader title="Weekly Report" subtitle={range} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi label="Followers gained" value={`${last - ago7 >= 0 ? "+" : ""}${(last - ago7).toLocaleString()}`} pct={ago7 ? ((last - ago7) / ago7) * 100 : 0} />
        <Kpi label="Reach" value={compact(reach.cur)} pct={reach.pct} />
        <Kpi label="Profile visits" value={compact(visits.cur)} pct={visits.pct} />
        <Kpi label="New follows" value={compact(follows.cur)} pct={follows.pct} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {topPost && (
          <Card className="p-6">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-amber-600">
              <Trophy className="h-4 w-4" /> Post of the week
            </div>
            <div className="mt-3 flex items-start gap-4">
              <div className="h-20 w-16 shrink-0 rounded-lg" style={{ backgroundColor: topPost.m.tileColor }} />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900">“{topPost.m.hook}”</p>
                <p className="mt-1 text-xs text-slate-500">{topPost.m.topic} · {topPost.m.format}</p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                  <span><b className="text-slate-900">{compact(topPost.m.insights.views)}</b> views</span>
                  <span><b className="text-slate-900">{topPost.x.savesPer1k}</b> saves/1k</span>
                  <span><b className="text-slate-900">{topPost.x.followsPer1k}</b> follows/1k</span>
                  <span><b className="text-slate-900">{topPost.x.score}</b>/100</span>
                </div>
              </div>
            </div>
          </Card>
        )}

        {insight && (
          <Card className="p-6">
            <div className="text-xs font-semibold uppercase tracking-wide text-indigo-600">This week&apos;s takeaway</div>
            <h3 className="mt-3 text-base font-bold text-slate-900">{insight.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{insight.detail}</p>
          </Card>
        )}
      </div>

      <Card className="mt-4 overflow-hidden">
        <CardHead title="Do this next week" />
        <div className="flex items-start gap-3 p-5 pt-3">
          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
            <ArrowRight className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-900">{experiment.action}</p>
            <p className="mt-1 text-xs text-slate-500">Target: beat {experiment.baseline} on {experiment.metricLabel.toLowerCase()}.</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

function Kpi({ label, value, pct }: { label: string; value: string; pct: number }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</span>
        <DeltaPill pct={pct} />
      </div>
      <div className="mt-2 text-xl font-bold text-slate-900">{value}</div>
    </Card>
  );
}
