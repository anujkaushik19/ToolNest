import Link from "next/link";
import { getCampaigns, portfolioSignals, rosterHealth } from "@/lib/studio/agency";
import { Card, PageHeader, compact } from "@/components/studio/ui";
import { Users } from "lucide-react";

function fmtRange(start: string, end: string): string {
  const s = new Date(start + "T00:00:00Z");
  const e = new Date(end + "T00:00:00Z");
  const opt: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `${s.toLocaleDateString("en-US", opt)} – ${e.toLocaleDateString("en-US", opt)}`;
}

export default async function CampaignsPage() {
  const campaigns = getCampaigns();
  const roster = rosterHealth();
  const followersOf = (u: string) => roster.find((h) => h.data.account.username === u)?.data.account.followersCount ?? 0;

  return (
    <div>
      <PageHeader title="Campaigns" subtitle="Brand campaigns and the creators delivering them" />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {campaigns.map((c) => {
          const reach = c.creatorUsernames.reduce((s, u) => s + followersOf(u), 0);
          const highs = portfolioSignals(c.creatorUsernames).filter((s) => s.severity === "high").length;
          return (
            <Link key={c.id} href={`/studio/agency/campaigns/${c.id}`}>
              <Card className="h-full p-6 transition hover:shadow-md">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-indigo-600">{c.brand}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${c.status === "active" ? "bg-emerald-100 text-emerald-700" : c.status === "planning" ? "bg-slate-100 text-slate-600" : "bg-slate-100 text-slate-500"}`}>
                    {c.status}
                  </span>
                </div>
                <h3 className="mt-2 text-lg font-bold text-slate-900">{c.name}</h3>
                <p className="mt-1 text-sm text-slate-600">{c.goal}</p>
                <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-500">
                  <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {c.creatorUsernames.length} creators</span>
                  <span>{compact(reach)} combined reach</span>
                  <span>{fmtRange(c.startDate, c.endDate)}</span>
                  {highs > 0 && <span className="font-semibold text-red-600">{highs} urgent</span>}
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
