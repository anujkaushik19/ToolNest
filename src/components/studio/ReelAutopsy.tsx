"use client";

import { useMemo, useState } from "react";
import { Bookmark, Eye, Share2, UserPlus, Clock } from "lucide-react";
import type { CreatorData } from "@/lib/studio/types";
import { benchmark, mediaMetrics } from "@/lib/studio/metrics";
import { Card, ScorePill, compact } from "@/components/studio/ui";

type SortKey = "score" | "views" | "follows" | "recent";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "score", label: "Score" },
  { key: "views", label: "Views" },
  { key: "follows", label: "Follows / 1k" },
  { key: "recent", label: "Most recent" },
];

export default function ReelAutopsy({ data }: { data: CreatorData }) {
  const [sort, setSort] = useState<SortKey>("score");
  const bench = useMemo(() => benchmark(data.media), [data.media]);

  const rows = useMemo(() => {
    const reels = data.media.filter((m) => m.mediaType === "REEL" || m.mediaType === "VIDEO");
    const withMetrics = reels.map((m) => ({ m, x: mediaMetrics(m, bench) }));
    withMetrics.sort((a, b) => {
      if (sort === "views") return b.m.insights.views - a.m.insights.views;
      if (sort === "follows") return b.x.followsPer1k - a.x.followsPer1k;
      if (sort === "recent")
        return new Date(b.m.timestamp).getTime() - new Date(a.m.timestamp).getTime();
      return b.x.score - a.x.score;
    });
    return withMetrics;
  }, [data.media, bench, sort]);

  const best = rows.reduce((a, b) => (b.x.score > a.x.score ? b : a), rows[0]);
  const worst = rows.reduce((a, b) => (b.x.score < a.x.score ? b : a), rows[0]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Reel Autopsy</h1>
          <p className="mt-1 text-sm text-slate-500">
            Every Reel scored 0–100 against your own average. 50 = on par, higher = punching above.
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
          {SORTS.map((s) => (
            <button
              key={s.key}
              onClick={() => setSort(s.key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                sort === s.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {best && worst && (
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <Highlight label="Top performer" m={best} tone="emerald" />
          <Highlight label="Biggest opportunity" m={worst} tone="rose" />
        </div>
      )}

      <div className="space-y-3">
        {rows.map(({ m, x }) => (
          <Card key={m.id} className="p-4">
            <div className="flex items-start gap-4">
              <div
                className="hidden h-16 w-12 shrink-0 rounded-lg sm:block"
                style={{ backgroundColor: m.tileColor }}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                    {m.topic}
                  </span>
                  <span className="text-xs text-slate-400">
                    {new Date(m.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                </div>
                <p className="mt-1 truncate text-sm font-medium text-slate-900">“{m.hook}”</p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                  <Chip icon={<Eye className="h-3.5 w-3.5" />} v={compact(m.insights.views)} l="views" />
                  <Chip icon={<Bookmark className="h-3.5 w-3.5" />} v={x.savesPer1k.toString()} l="saves/1k" />
                  <Chip icon={<Share2 className="h-3.5 w-3.5" />} v={x.sharesPer1k.toString()} l="shares/1k" />
                  <Chip icon={<UserPlus className="h-3.5 w-3.5" />} v={x.followsPer1k.toString()} l="follows/1k" />
                  <Chip icon={<Clock className="h-3.5 w-3.5" />} v={`${m.insights.avgWatchTimeSec}s`} l="avg watch" />
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <ScorePill score={x.score} />
                <span className="text-[11px] text-slate-400">/ 100</span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Chip({ icon, v, l }: { icon: React.ReactNode; v: string; l: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="text-slate-400">{icon}</span>
      <span className="font-semibold text-slate-800">{v}</span>
      <span className="text-slate-400">{l}</span>
    </span>
  );
}

function Highlight({
  label,
  m,
  tone,
}: {
  label: string;
  m: { m: CreatorData["media"][number]; x: ReturnType<typeof mediaMetrics> };
  tone: "emerald" | "rose";
}) {
  const ring = tone === "emerald" ? "ring-emerald-200 bg-emerald-50" : "ring-rose-200 bg-rose-50";
  return (
    <div className={`rounded-2xl p-5 ring-1 ${ring}`}>
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 flex items-center justify-between gap-3">
        <p className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900">“{m.m.hook}”</p>
        <ScorePill score={m.x.score} />
      </div>
      <div className="mt-2 text-xs text-slate-600">
        {m.m.topic} · {compact(m.m.insights.views)} views · {m.x.followsPer1k} follows / 1k
      </div>
    </div>
  );
}
