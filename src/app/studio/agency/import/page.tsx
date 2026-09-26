import Link from "next/link";
import { ArrowLeft, Copy } from "lucide-react";
import { PageHeader, Card } from "@/components/studio/ui";
import { CsvImport } from "@/components/studio/CsvImport";

// Agency-side import: onboard a creator who won't connect by importing their
// exported stats, or grab the shareable invite link to send them instead.
export default function AgencyImportPage() {
  return (
    <div>
      <Link href="/studio/agency" className="mb-4 inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800">
        <ArrowLeft className="h-3.5 w-3.5" /> Command Center
      </Link>
      <PageHeader title="Add a creator" subtitle="Invite them to self-connect, or import their exported stats" />

      <Card className="mb-6 p-6">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Copy className="h-4 w-4 text-slate-500" /> Share an invite link
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Send this to a creator — it opens a trust-first, read-only connect flow. The link inherits the agency name and campaign.
        </p>
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700">
          /invite?agency=Your+Agency&amp;campaign=Nykaa+Festive+Push
        </div>
        <Link href="/invite?agency=Your+Agency&campaign=Nykaa+Festive+Push" className="mt-3 inline-block text-xs font-semibold text-indigo-600 hover:text-indigo-700">
          Preview the creator invite →
        </Link>
      </Card>

      <div className="mb-3 text-sm font-semibold text-slate-900">Or import their stats now</div>
      <CsvImport />
    </div>
  );
}
