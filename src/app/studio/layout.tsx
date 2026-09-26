import type { ReactNode } from "react";
import Link from "next/link";
import { AtSign, Sparkles } from "lucide-react";
import Sidebar from "@/components/studio/Sidebar";
import PageTransition from "@/components/studio/PageTransition";
import CursorSmoke from "@/components/studio/CursorSmoke";
import { getStudioData } from "@/lib/studio";
import { compact } from "@/components/studio/ui";

export const metadata = {
  title: "Creator Studio — BizNest",
  description: "Grow your Instagram with insights from your own account.",
};

export default async function StudioLayout({ children }: { children: ReactNode }) {
  const data = await getStudioData();
  const a = data.account;
  return (
    <div className="dashboard-surface flex h-screen overflow-hidden text-slate-900">
      <CursorSmoke />
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="frosted z-10 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-slate-200/70 px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-sm font-bold text-white">
              {a.name.charAt(0)}
            </div>
            <div className="leading-tight">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                @{a.username}
                {data.isDemo ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                    <Sparkles className="h-3 w-3" /> Demo data
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Live
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-500">
                {compact(a.followersCount)} followers{a.niche ? ` · ${a.niche}` : ""}
              </div>
            </div>
          </div>
          <Link
            href="/studio/connect"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-fuchsia-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-95"
          >
            <AtSign className="h-4 w-4" />
            {data.isDemo ? "Connect Instagram" : "Manage connection"}
          </Link>
        </header>
        <main className="scroll-light flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-6xl px-5 py-8">
            <PageTransition>{children}</PageTransition>
          </div>
        </main>
      </div>
    </div>
  );
}
