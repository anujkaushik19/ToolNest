import { getStudioData, generateBrief } from "@/lib/studio";
import type { BriefSignal, Severity } from "@/lib/studio/types";
import { Card, PageHeader, DeltaPill } from "@/components/studio/ui";
import { ArrowRight, Check, Target, TriangleAlert, Trophy } from "lucide-react";

const AREA_LABEL: Record<BriefSignal["area"], string> = {
  growth: "Growth",
  reach: "Reach",
  engagement: "Engagement",
  conversion: "Conversion",
  cadence: "Consistency",
  content: "Content",
};

const SEVERITY_STYLE: Record<Severity, { chip: string; icon: typeof TriangleAlert; label: string; card: string }> = {
  high: { chip: "bg-red-100 text-red-700", icon: TriangleAlert, label: "Needs attention", card: "border-red-200" },
  medium: { chip: "bg-amber-100 text-amber-700", icon: TriangleAlert, label: "Watch", card: "border-amber-200" },
  good: { chip: "bg-emerald-100 text-emerald-700", icon: Check, label: "Working", card: "border-emerald-200" },
};

export default async function BriefPage() {
  const data = await getStudioData();
  const brief = generateBrief(data);
  const risks = brief.signals.filter((s) => s.severity !== "good");
  const wins = brief.signals.filter((s) => s.severity === "good");

  return (
    <div>
      <PageHeader title="Monday Brief" subtitle={`Week of ${brief.periodLabel}`} />

      {/* Headline + momentum */}
      <Card className="p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
              <Target className="h-5 w-5" />
            </span>
            <div>
              <p className="text-lg font-bold text-slate-900">{brief.headline}</p>
              <p className="mt-0.5 text-sm text-slate-500">
                {data.account.username ? `@${data.account.username}` : "Your account"}
                {data.isDemo ? " · demo data" : ""}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Momentum label="Followers" value={`${brief.momentum.followersDelta >= 0 ? "+" : ""}${brief.momentum.followersDelta.toLocaleString()}`} pct={brief.momentum.followersPct} />
            <Momentum label="Reach" value={`${brief.momentum.reachPct >= 0 ? "+" : ""}${brief.momentum.reachPct}%`} pct={brief.momentum.reachPct} />
            <Momentum label="Engagement" value={`${brief.momentum.engagementPct >= 0 ? "+" : ""}${brief.momentum.engagementPct}%`} pct={brief.momentum.engagementPct} />
          </div>
        </div>
      </Card>

      {/* Focus this week */}
      <Card className="mt-4 p-6">
        <div className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Your focus this week</div>
        <ol className="mt-3 space-y-3">
          {brief.focus.map((f, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                {i + 1}
              </span>
              <p className="text-sm font-medium text-slate-800">{f}</p>
            </li>
          ))}
        </ol>
      </Card>

      {/* Risks */}
      {risks.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">What needs your attention</h2>
          <div className="space-y-3">
            {risks.map((s) => (
              <SignalCard key={s.id} signal={s} />
            ))}
          </div>
        </div>
      )}

      {/* Wins */}
      {wins.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
            <Trophy className="h-4 w-4 text-amber-500" /> What&apos;s working
          </h2>
          <div className="space-y-3">
            {wins.map((s) => (
              <SignalCard key={s.id} signal={s} />
            ))}
          </div>
        </div>
      )}

      <p className="mt-6 text-xs text-slate-400">
        This brief is generated from your own account history with transparent rules — no guesswork, no AI. It refreshes as new daily snapshots come in.
      </p>
    </div>
  );
}

function Momentum({ label, value, pct }: { label: string; value: string; pct: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-center">
      <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-0.5 text-sm font-bold text-slate-900">{value}</div>
      <div className="mt-1 flex justify-center">
        <DeltaPill pct={pct} />
      </div>
    </div>
  );
}

function SignalCard({ signal }: { signal: BriefSignal }) {
  const style = SEVERITY_STYLE[signal.severity];
  const Icon = style.icon;
  return (
    <Card className={`border p-5 ${style.card}`}>
      <div className="flex items-start gap-3">
        <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${style.chip}`}>
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${style.chip}`}>{style.label}</span>
            <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{AREA_LABEL[signal.area]}</span>
            {signal.metric && (
              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">{signal.metric}</span>
            )}
          </div>
          <h3 className="mt-2 text-sm font-bold text-slate-900">{signal.title}</h3>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">{signal.detail}</p>
          {signal.action && (
            <div className="mt-3 flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2">
              <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
              <p className="text-xs font-medium text-slate-700">{signal.action}</p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
