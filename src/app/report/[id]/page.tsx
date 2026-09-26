import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buildCampaignReport } from "@/lib/studio/report";
import { PrintButton } from "@/components/studio/PrintButton";
import { ArrowRight, Award, Sparkles, Target, TrendingDown, TrendingUp } from "lucide-react";

// Standalone, print-first campaign report. It sits outside the /studio layout on
// purpose: no sidebar, no app chrome — just the deliverable a brand receives.

export const dynamic = "force-dynamic";

const fmt = (n: number) => n.toLocaleString("en-US");
const compact = (n: number) => {
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "k";
  return String(Math.round(n));
};
const signed = (n: number) => (n >= 0 ? `+${compact(n)}` : `-${compact(Math.abs(n))}`);

function Delta({ value, suffix = "%" }: { value: number; suffix?: string }) {
  const up = value >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-1 text-sm font-semibold ${up ? "text-emerald-600" : "text-red-600"}`}>
      <Icon className="h-3.5 w-3.5" />
      {up ? "+" : ""}
      {value}
      {suffix}
    </span>
  );
}

export default function CampaignReportPage({ params }: { params: { id: string } }) {
  const report = buildCampaignReport(params.id);
  if (!report) notFound();

  const { campaign, totals, topCreator, bestPost, highlights, optimizations, creators } = report;

  return (
    <main className="min-h-screen bg-slate-100 py-8 text-slate-900 print:bg-white print:py-0">
      {/* Toolbar — hidden when printing */}
      <div className="mx-auto mb-6 flex max-w-3xl items-center justify-between px-6 print:hidden">
        <Link
          href={`/studio/agency/campaigns/${campaign.id}`}
          className="text-sm font-semibold text-slate-500 hover:text-slate-800"
        >
          ← Back to campaign
        </Link>
        <PrintButton />
      </div>

      {/* The sheet */}
      <div className="mx-auto max-w-3xl bg-white px-10 py-10 shadow-sm ring-1 ring-slate-200 print:max-w-none print:px-0 print:shadow-none print:ring-0">
        {/* Header */}
        <header className="flex items-start justify-between border-b border-slate-200 pb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-indigo-600">
              <span>{campaign.brand}</span>
              <span className="text-slate-300">·</span>
              <span className="text-slate-500">Campaign performance report</span>
            </div>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">{campaign.name}</h1>
            <p className="mt-1 text-sm text-slate-500">
              Reporting period {report.periodLabel} · Generated {report.generatedOn}
            </p>
          </div>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-lg font-bold text-white">
            T
          </div>
        </header>

        {/* Headline KPIs */}
        <section className="grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-slate-200 sm:grid-cols-4 mt-6">
          <Kpi label="Combined reach" value={compact(totals.reach)} extra={<Delta value={totals.reachPct} />} />
          <Kpi label="New followers" value={signed(totals.followersDelta)} sub="this week" />
          <Kpi label="Engagement rate" value={`${totals.engagementRate}%`} sub="reach-weighted" />
          <Kpi label="Posts published" value={fmt(totals.posts)} sub={`${totals.creators} creators`} />
        </section>

        {/* Executive summary */}
        <section className="mt-8">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
            <Sparkles className="h-4 w-4 text-indigo-500" /> What worked this week
          </h2>
          <ul className="space-y-2">
            {highlights.map((h, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                <span>{h}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Standouts */}
        {(topCreator || bestPost) && (
          <section className="mt-6 grid gap-4 sm:grid-cols-2">
            {topCreator && (
              <div className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  <Award className="h-4 w-4 text-amber-500" /> Top creator
                </div>
                <p className="mt-2 text-base font-semibold text-slate-900">{topCreator.name}</p>
                <p className="text-xs text-slate-500">@{topCreator.username}</p>
                <p className="mt-2 text-sm text-slate-600">
                  {compact(topCreator.weekReach)} reach · <Delta value={topCreator.reachPct} />
                </p>
              </div>
            )}
            {bestPost && (
              <div className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  <Target className="h-4 w-4 text-indigo-500" /> Best-performing post
                </div>
                <p className="mt-2 line-clamp-2 text-base font-semibold text-slate-900">&ldquo;{bestPost.hook}&rdquo;</p>
                <p className="text-xs text-slate-500">
                  {bestPost.format} · @{bestPost.username}
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  {compact(bestPost.reach)} reach · {compact(bestPost.saves)} saves · score {bestPost.score}/100
                </p>
              </div>
            )}
          </section>
        )}

        {/* Per-creator table */}
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Creator breakdown</h2>
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Creator</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Reach</th>
                  <th className="px-4 py-2.5 text-right font-semibold">WoW</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Eng.</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Posts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {creators.map((c) => (
                  <tr key={c.username}>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{c.name}</div>
                      <div className="text-xs text-slate-400">@{c.username}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">{compact(c.weekReach)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={c.reachPct >= 0 ? "text-emerald-600" : "text-red-600"}>
                        {c.reachPct >= 0 ? "+" : ""}
                        {c.reachPct}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">{c.engagementRate}%</td>
                    <td className="px-4 py-3 text-right text-slate-600">{c.posts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* What's next */}
        {optimizations.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
              <ArrowRight className="h-4 w-4 text-indigo-500" /> What we&apos;re optimising next
            </h2>
            <ul className="space-y-2">
              {optimizations.map((o, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
                  <span>{o}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Footer */}
        <footer className="mt-10 border-t border-slate-200 pt-4 text-xs text-slate-400">
          Prepared for {campaign.brand} · {campaign.goal}
        </footer>
      </div>
    </main>
  );
}

function Kpi({ label, value, sub, extra }: { label: string; value: string; sub?: string; extra?: ReactNode }) {
  return (
    <div className="bg-white px-4 py-4">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-2xl font-bold text-slate-900">{value}</span>
        {extra}
      </div>
      {sub && <div className="text-[11px] text-slate-400">{sub}</div>}
    </div>
  );
}
