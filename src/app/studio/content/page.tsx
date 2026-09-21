import { getStudioData } from "@/lib/studio";
import { benchmark, mediaMetrics, topicStats } from "@/lib/studio/metrics";
import type { ContentFormat } from "@/lib/studio/types";
import { Card, CardHead, PageHeader, ScorePill, compact } from "@/components/studio/ui";
import { TopicBars } from "@/components/studio/Charts";

export default async function ContentPage() {
  const data = await getStudioData();
  const bench = benchmark(data.media);
  const topics = topicStats(data.media, bench);

  const colorFor = (topic: string) =>
    data.media.find((m) => m.topic === topic)?.tileColor ?? "#6366f1";

  const barData = topics.map((t) => ({ topic: t.topic, score: t.score, color: colorFor(t.topic) }));

  const formats: ContentFormat[] = ["Reel", "Carousel", "Image"];
  const formatStats = formats
    .map((f) => {
      const list = data.media.filter((m) => m.format === f);
      if (!list.length) return null;
      const avgViews = list.reduce((s, m) => s + m.insights.views, 0) / list.length;
      const score = list.reduce((s, m) => s + mediaMetrics(m, bench).score, 0) / list.length;
      const follows =
        list.reduce(
          (s, m) => s + (m.insights.views ? (m.insights.follows / m.insights.views) * 1000 : 0),
          0,
        ) / list.length;
      return { format: f, posts: list.length, avgViews, score: Math.round(score), follows };
    })
    .filter(Boolean) as {
    format: ContentFormat;
    posts: number;
    avgViews: number;
    score: number;
    follows: number;
  }[];

  return (
    <div>
      <PageHeader
        title="What's Working"
        subtitle="Which topics and formats earn the most saves, profile visits and follows per view."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHead title="Topic performance" subtitle="Score vs your own average (0–100)" />
          <div className="px-3 pb-4 pt-2">
            <TopicBars data={barData} />
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:col-span-2 lg:grid-cols-1">
          {formatStats.map((f) => (
            <Card key={f.format} className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-900">{f.format}</span>
                <ScorePill score={f.score} />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <Metric label="Avg views" value={compact(f.avgViews)} />
                <Metric label="Follows / 1k" value={f.follows.toFixed(1)} />
                <Metric label="Posts" value={String(f.posts)} />
              </div>
            </Card>
          ))}
        </div>
      </div>

      <Card className="mt-6 overflow-hidden">
        <CardHead title="Topic breakdown" subtitle="Ranked by score" />
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y border-slate-100 text-left text-xs text-slate-500">
                <th className="px-5 py-2 font-medium">Topic</th>
                <th className="px-3 py-2 font-medium">Posts</th>
                <th className="px-3 py-2 font-medium">Avg views</th>
                <th className="px-3 py-2 font-medium">Saves / 1k</th>
                <th className="px-3 py-2 font-medium">Visits / 1k</th>
                <th className="px-3 py-2 font-medium">Follows / 1k</th>
                <th className="px-5 py-2 text-right font-medium">Score</th>
              </tr>
            </thead>
            <tbody>
              {topics.map((t) => (
                <tr key={t.topic} className="border-b border-slate-50 last:border-0">
                  <td className="px-5 py-3 font-medium text-slate-900">
                    <span className="inline-flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colorFor(t.topic) }} />
                      {t.topic}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-slate-600">{t.posts}</td>
                  <td className="px-3 py-3 text-slate-600">{compact(t.avgViews)}</td>
                  <td className="px-3 py-3 text-slate-600">{t.savesPer1k}</td>
                  <td className="px-3 py-3 text-slate-600">{t.profileVisitsPer1k}</td>
                  <td className="px-3 py-3 text-slate-600">{t.followsPer1k}</td>
                  <td className="px-5 py-3 text-right">
                    <ScorePill score={t.score} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <div className="text-slate-500">{label}</div>
      <div className="mt-0.5 text-sm font-bold text-slate-900">{value}</div>
    </div>
  );
}
