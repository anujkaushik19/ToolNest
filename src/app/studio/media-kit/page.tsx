import { getStudioData } from "@/lib/studio";
import { benchmark, mediaMetrics } from "@/lib/studio/metrics";
import { Card, PageHeader, compact } from "@/components/studio/ui";
import { MapPin, Users } from "lucide-react";

export default async function MediaKitPage() {
  const data = await getStudioData();
  const a = data.account;
  const bench = benchmark(data.media);

  const n = data.media.length || 1;
  const avgReach = Math.round(data.media.reduce((s, m) => s + m.insights.reach, 0) / n);
  const avgViews = Math.round(data.media.reduce((s, m) => s + m.insights.views, 0) / n);
  const engagement =
    data.media.reduce((s, m) => s + mediaMetrics(m, bench).engagementRate, 0) / n;

  const fallback = { label: "—", value: 0 };
  const topGender = [...data.demographics.gender].sort((x, y) => y.value - x.value)[0] ?? fallback;
  const topAge = [...data.demographics.age].sort((x, y) => y.value - x.value)[0] ?? fallback;
  const topCountry = data.demographics.countries[0] ?? fallback;

  const top3 = data.media
    .map((m) => ({ m, x: mediaMetrics(m, bench) }))
    .sort((p, q) => q.x.score - p.x.score)
    .slice(0, 3);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <PageHeader title="Media Kit" subtitle="A shareable one-pager for brand collaborations." />
        <button className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
          Export PDF
        </button>
      </div>

      <Card className="overflow-hidden">
        <div className="bg-gradient-to-br from-indigo-600 to-fuchsia-600 px-8 py-8 text-white">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 text-2xl font-bold">
              {a.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-2xl font-bold">{a.name}</h2>
              <p className="text-white/80">@{a.username} · {a.niche}</p>
            </div>
          </div>
          <p className="mt-4 max-w-xl text-sm text-white/90">{a.biography}</p>
        </div>

        <div className="grid grid-cols-2 gap-px bg-slate-100 md:grid-cols-4">
          <Big label="Followers" value={compact(a.followersCount)} />
          <Big label="Avg reach / post" value={compact(avgReach)} />
          <Big label="Avg views" value={compact(avgViews)} />
          <Big label="Engagement rate" value={`${engagement.toFixed(1)}%`} />
        </div>

        <div className="grid grid-cols-1 gap-6 p-8 md:grid-cols-2">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Users className="h-4 w-4 text-indigo-600" /> Audience
            </h3>
            <div className="mt-3 space-y-2 text-sm text-slate-600">
              <Row label="Largest gender" value={`${topGender.label} (${topGender.value}%)`} />
              <Row label="Core age group" value={`${topAge.label} (${topAge.value}%)`} />
              <Row label="Top location" value={`${topCountry.label} (${topCountry.value}%)`} />
            </div>
          </div>
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <MapPin className="h-4 w-4 text-fuchsia-600" /> Reach
            </h3>
            <div className="mt-3 space-y-2 text-sm text-slate-600">
              <Row label="Saves per 1k views" value={String(bench.savesPer1k)} />
              <Row label="Shares per 1k views" value={String(bench.sharesPer1k)} />
              <Row label="Follows per 1k views" value={String(bench.followsPer1k)} />
            </div>
          </div>
        </div>

        <div className="px-8 pb-8">
          <h3 className="text-sm font-semibold text-slate-900">Top performing content</h3>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {top3.map(({ m, x }) => (
              <div key={m.id} className="rounded-xl border border-slate-200 p-4">
                <div className="h-24 rounded-lg" style={{ backgroundColor: m.tileColor }} />
                <p className="mt-2 truncate text-xs font-semibold text-slate-900">“{m.hook}”</p>
                <p className="mt-1 text-xs text-slate-500">{compact(m.insights.views)} views · {x.score}/100</p>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}

function Big({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white px-5 py-5 text-center">
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      <div className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-50 py-1.5 last:border-0">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold text-slate-900">{value}</span>
    </div>
  );
}
