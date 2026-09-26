import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CsvImport } from "@/components/studio/CsvImport";

// Creator-facing manual fallback — reached from the invite when a creator has no
// Instagram Business account or prefers not to connect.
export default function InviteManualPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12 text-slate-900">
      <div className="mx-auto max-w-2xl">
        <Link href="/invite" className="mb-6 inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to connect options
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Add your stats manually</h1>
        <p className="mt-2 text-sm text-slate-600">
          No Instagram Business account needed. Export your post stats to a CSV and drop them below — you&apos;ll get an instant read, and nothing leaves your browser.
        </p>
        <div className="mt-6">
          <CsvImport />
        </div>
      </div>
    </main>
  );
}
