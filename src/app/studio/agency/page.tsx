import Link from "next/link";
import { getCampaigns, portfolioSignals, rosterHealth } from "@/lib/studio/agency";
import type { CreatorData, Severity } from "@/lib/studio/types";
import { Card, PageHeader, StatCard, compact, fmt } from "@/components/studio/ui";
import { ArrowRight, TriangleAlert, Users } from "lucide-react";

const AVATARS = ["from-indigo-500 to-fuchsia-500", "from-emerald-500 to-teal-500", "from-amber-500 to-orange-500", "from-sky-500 to-blue-600", "from-rose-500 to-pink-600"];

function weekReach(data: CreatorData): number {
  const asOf = new Date(data.asOf + "T00:00:00Z").getTime();
  return data.media
    .filter((m) => new Date(m.timestamp).getTime() > asOf - 7 * 86400000)
    .reduce((s, m) => s + m.insights.reach, 0);
}

function HealthBadge({ worst, riskCount }: { worst: Severity; riskCount: number }) {
  const map: Record<Severity, { cls: string; label: string }> = {
    high: { cls: "bg-red-100 text-red-700", label: "Needs attention" },
    medium: { cls: "bg-amber-100 text-amber-700", label: "Watch" },
    good: { cls: "bg-emerald-100 text-emerald-700", label: "Healthy" },
  };
  const m = map[worst];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${m.cls}`}>
      {m.label}
      {worst !== "good" && riskCount > 0 ? ` · ${riskCount}` : ""}
    </span>
  );
}

const SIG_STYLE: Record<Severity, string> = {
  high: "bg-red-100 text-red-700",
  medium: "bg-amber-100 text-amber-700",
  good: "bg-emerald-100 text-emerald-700",
};

export default async function AgencyPage() {
  const roster = rosterHealth();
  const signals = portfolioSignals();
  const campaigns = getCampaigns();

  const needAttention = roster.filter((h) => h.worst !== "good").length;
  const activeCampaigns = campaigns.filter((c) => c.status === "active").length;
  const totalReach = roster.reduce((s, h) => s + weekReach(h.data), 0);
  const totalFollowers = roster.reduce((s, h) => s + h.data.account.followersCount, 0);

  const highs = signals.filter((s) => s.severity === "high").length;

  return (
    <div>
      <PageHeader
        title="Agency Command Center"
        subtitle={highs > 0 ? `${highs} urgent signal${highs > 1 ? "s" : ""} across your roster this morning` : "Here's where every creator stands this week"}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Creators tracked" value={String(roster.length)} hint={`${fmt(totalFollowers)} followers total`} />
        <StatCard label="Need attention" value={String(needAttention)} hint={`${roster.length - needAttention} healthy`} />
        <StatCard label="Active campaigns" value={String(activeCampaigns)} hint={`${campaigns.length} total`} />
        <StatCard label="Reach this week" value={compact(totalReach)} hint="across all creators" />
      </div>

      {/* Portfolio brief */}
      <div className="mt-8">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
          <TriangleAlert className="h-4 w-4 text-amber-500" /> What needs your attention
        </h2>
        {signals.length === 0 ? (
          <Card className="p-6 text-sm text-slate-600">Every creator is healthy this week. Nothing needs action.</Card>
        ) : (
          <div className="space-y-3">
            {signals.slice(0, 8).map((s) => (
              <Card key={`${s.username}-${s.id}`} className="p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${SIG_STYLE[s.severity]}`}>
                    {s.severity === "high" ? "Urgent" : "Watch"}
                  </span>
                  <span className="text-sm font-semibold text-slate-900">@{s.username}</span>
                  {s.metric && <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">{s.metric}</span>}
                </div>
                <p className="mt-1.5 text-sm font-medium text-slate-800">{s.title}</p>
                {s.action && (
                  <p className="mt-1 flex items-start gap-1.5 text-xs text-slate-500">
                    <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-500" />
                    {s.action}
                  </p>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Roster */}
      <div className="mt-8">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
          <Users className="h-4 w-4" /> Your roster
        </h2>
        <Card className="overflow-hidden">
          <div className="divide-y divide-slate-100">
            {roster.map((h, i) => (
              <div key={h.data.account.username} className="flex items-center gap-4 px-5 py-3.5">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${AVATARS[i % AVATARS.length]} text-sm font-bold text-white`}>
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
                <div className="hidden w-24 text-right md:block">
                  <div className="text-sm font-semibold text-slate-900">{compact(weekReach(h.data))}</div>
                  <div className="text-[11px] text-slate-400">reach / wk</div>
                </div>
                <div className="w-32 text-right">
                  <HealthBadge worst={h.worst} riskCount={h.riskCount} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Campaigns shortcut */}
      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Campaigns</h2>
          <Link href="/studio/agency/campaigns" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">
            View all →
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {campaigns.slice(0, 3).map((c) => {
            const risks = portfolioSignals(c.creatorUsernames).filter((s) => s.severity === "high").length;
            return (
              <Link key={c.id} href={`/studio/agency/campaigns/${c.id}`}>
                <Card className="h-full p-5 transition hover:shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wide text-indigo-600">{c.brand}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${c.status === "active" ? "bg-emerald-100 text-emerald-700" : c.status === "planning" ? "bg-slate-100 text-slate-600" : "bg-slate-100 text-slate-500"}`}>
                      {c.status}
                    </span>
                  </div>
                  <h3 className="mt-2 text-sm font-bold text-slate-900">{c.name}</h3>
                  <p className="mt-1 text-xs text-slate-500">{c.creatorUsernames.length} creators{risks > 0 ? ` · ${risks} urgent` : ""}</p>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
