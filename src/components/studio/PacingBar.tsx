import type { CampaignPacing, PaceStatus } from "@/lib/studio/agency";

// Visual read on whether a campaign is on track: a goal progress bar with a
// marker showing where a steady pace "should" be by now. Pure presentational.

const compact = (n: number) => {
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "k";
  return String(Math.round(n));
};

const STATUS: Record<PaceStatus, { label: string; chip: string; bar: string }> = {
  "not-started": { label: "Not started", chip: "bg-slate-100 text-slate-600", bar: "bg-slate-300" },
  behind: { label: "Behind", chip: "bg-red-100 text-red-700", bar: "bg-red-500" },
  "at-risk": { label: "At risk", chip: "bg-amber-100 text-amber-700", bar: "bg-amber-500" },
  "on-track": { label: "On track", chip: "bg-emerald-100 text-emerald-700", bar: "bg-emerald-500" },
  ahead: { label: "Ahead", chip: "bg-indigo-100 text-indigo-700", bar: "bg-indigo-500" },
  complete: { label: "Complete", chip: "bg-slate-900 text-white", bar: "bg-slate-900" },
};

export function PacingBar({ pacing, className = "" }: { pacing: CampaignPacing; className?: string }) {
  const s = STATUS[pacing.status];

  if (pacing.status === "not-started") {
    return (
      <div className={className}>
        <div className="flex items-center justify-between text-xs">
          <span className={`rounded-full px-2 py-0.5 font-semibold ${s.chip}`}>{s.label}</span>
          <span className="text-slate-500">Starts in {pacing.daysUntilStart} days</span>
        </div>
      </div>
    );
  }

  const fill = Math.min(100, pacing.goalPct);
  const marker = Math.min(100, pacing.timePct);

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs">
        <span className={`rounded-full px-2 py-0.5 font-semibold ${s.chip}`}>{s.label}</span>
        <span className="text-slate-500">
          {pacing.status === "complete"
            ? `${pacing.goalPct}% of goal delivered`
            : `Day ${pacing.daysElapsed} of ${pacing.daysTotal} · ${pacing.goalPct}% to goal`}
        </span>
      </div>

      <div className="relative mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${s.bar}`} style={{ width: `${fill}%` }} />
        {pacing.status !== "complete" && (
          <div
            className="absolute top-[-2px] h-3 w-0.5 bg-slate-400"
            style={{ left: `${marker}%` }}
            title="Where a steady pace should be by now"
          />
        )}
      </div>

      <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-400">
        <span>{compact(pacing.delivered)} delivered</span>
        {pacing.status !== "complete" && <span>pace {pacing.paceRatio}×</span>}
        <span>{compact(pacing.target)} target</span>
      </div>
    </div>
  );
}
