import Link from "next/link";
import { notFound } from "next/navigation";
import { getCampaign, portfolioSignals, rosterHealth } from "@/lib/studio/agency";
import type { CreatorData, Severity } from "@/lib/studio/types";
import { Card, PageHeader, StatCard, compact, fmt } from "@/components/studio/ui";
import { ArrowLeft, ArrowRight, FileText, TriangleAlert } from "lucide-react";

function weekReach(data: CreatorData): number {
  const asOf = new Date(data.asOf + "T00:00:00Z").getTime();
  return data.media
    .filter((m) => new Date(m.timestamp).getTime() > asOf - 7 * 86400000)
    .reduce((s, m) => s + m.insights.reach, 0);
}

const BADGE: Record<Severity, { cls: string; label: string }> = {
  high: { cls: "bg-red-100 text-red-700", label: "Needs attention" },
  medium: { cls: "bg-amber-100 text-amber-700", label: "Watch" },
  good: { cls: "bg-emerald-100 text-emerald-700", label: "Healthy" },
};

export default async function CampaignDetailPage({ params }: { params: { id: string } }) {
  const campaign = getCampaign(params.id);
  if (!campaign) notFound();

  const members = rosterHealth().filter((h) => campaign.creatorUsernames.includes(h.data.account.username));
  const signals = portfolioSignals(campaign.creatorUsernames);
  const combinedFollowers = members.reduce((s, h) => s + h.data.account.followersCount, 0);
  const combinedReach = members.reduce((s, h) => s + weekReach(h.data), 0);
  const highs = signals.filter((s) => s.severity === "high").length;

  return (
    <div>
      <Link href="/studio/agency/campaigns" className="mb-4 inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800">
        <ArrowLeft className="h-3.5 w-3.5" /> All campaigns
      </Link>

      <div className="mb-6 flex items-center gap-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-indigo-600">{campaign.brand}</span>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${campaign.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
          {campaign.status}
        </span>
        <Link
          href={`/report/${campaign.id}`}
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-700"
        >
          <FileText className="h-3.5 w-3.5" /> Generate client report
        </Link>
      </div>
      <PageHeader title={campaign.name} subtitle={campaign.goal} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Creators" value={String(members.length)} />
        <StatCard label="Combined followers" value={compact(combinedFollowers)} hint={`${fmt(combinedFollowers)}`} />
        <StatCard label="Reach this week" value={compact(combinedReach)} />
        <StatCard label="Urgent signals" value={String(highs)} hint={`${signals.length} total to review`} />
      </div>

      {/* Campaign risks */}
      <div className="mt-8">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
          <TriangleAlert className="h-4 w-4 text-amber-500" /> Signals in this campaign
        </h2>
        {signals.length === 0 ? (
          <Card className="p-6 text-sm text-slate-600">All creators in this campaign are healthy this week.</Card>
        ) : (
          <div className="space-y-3">
            {signals.map((s) => (
              <Card key={`${s.username}-${s.id}`} className="p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${BADGE[s.severity].cls}`}>
                    {s.severity === "high" ? "Urgent" : "Watch"}
                  </span>
                  <span className="text-sm font-semibold text-slate-900">@{s.username}</span>
                  {s.metric && <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">{s.metric}</span>}
                </div>
                <p className="mt-1.5 text-sm font-medium text-slate-800">{s.title}</p>
                {s.action && (
                  <p className="mt-1 flex items-start gap-1.5 text-xs text-slate-500">
                    <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-500" /> {s.action}
                  </p>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Members */}
      <div className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Creators in this campaign</h2>
        <Card className="overflow-hidden">
          <div className="divide-y divide-slate-100">
            {members.map((h) => (
              <div key={h.data.account.username} className="flex items-center gap-4 px-5 py-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-sm font-bold text-white">
                  {h.data.account.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-slate-900">{h.data.account.name}</div>
                  <div className="truncate text-xs text-slate-500">@{h.data.account.username} · {h.data.account.niche}</div>
                </div>
                <div className="hidden w-24 text-right sm:block">
                  <div className="text-sm font-semibold text-slate-900">{compact(h.data.account.followersCount)}</div>
                  <div className="text-[11px] text-slate-400">followers</div>
                </div>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${BADGE[h.worst].cls}`}>
                  {BADGE[h.worst].label}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
