"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, Plus, Receipt } from "lucide-react";
import { useBiz } from "@/lib/biz/store";
import { getPack } from "@/lib/biz/packs";
import { HOME_NAV, MODULE_NAV } from "@/components/biz/modules";
import { PackIcon, cn } from "@/components/biz/ui";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { loaded, tenant, tenants, selectTenant } = useBiz();
  const router = useRouter();
  const pathname = usePathname();
  const [switcher, setSwitcher] = useState(false);

  // No business selected once storage has loaded → send to onboarding.
  useEffect(() => {
    if (loaded && !tenant) router.replace("/biz/onboarding");
  }, [loaded, tenant, router]);

  if (!loaded) {
    return (
      <div className="dashboard-surface grid min-h-screen place-items-center text-slate-400">
        <div className="flex items-center gap-3 text-sm">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-500" />
          Loading your portal…
        </div>
      </div>
    );
  }

  if (!tenant) return null;

  const cfg = tenant.config;
  const pack = getPack(tenant.category);
  const nav = [HOME_NAV, ...cfg.modules.map((m) => MODULE_NAV[m])];

  const base = "/biz/app";
  const hrefFor = (route: string) => (route ? `${base}/${route}` : base);
  const isActive = (route: string) => {
    const href = hrefFor(route);
    return route ? pathname.startsWith(href) : pathname === base;
  };

  return (
    <div className="dashboard-surface flex h-screen overflow-hidden text-slate-900">
      {/* Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-white/50 bg-white/40 backdrop-blur-sm lg:flex">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-indigo-600 to-fuchsia-600 text-white shadow-sm">
            <Receipt className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold">BizNest</p>
            <p className="text-[11px] text-slate-500">Business Suite</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-2">
          {nav.map((entry) => {
            const active = isActive(entry.route);
            const Icon = entry.icon;
            return (
              <Link
                key={entry.route || "home"}
                href={hrefFor(entry.route)}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                  active
                    ? "bg-gradient-to-r from-indigo-600 to-fuchsia-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-white hover:text-slate-900",
                )}
              >
                <Icon className="h-[18px] w-[18px]" />
                {entry.label(cfg.labels)}
              </Link>
            );
          })}
        </nav>

        <div className="px-5 py-4 text-[11px] text-slate-400">
          Local &amp; offline · data stays on this device
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="frosted z-20 flex items-center justify-between border-b border-white/40 px-5 py-3">
          {/* Business switcher */}
          <div className="relative">
            <button
              onClick={() => setSwitcher((s) => !s)}
              className="flex items-center gap-3 rounded-xl px-2 py-1.5 text-left transition hover:bg-white/60"
            >
              <div className={cn("grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br text-white shadow-sm", cfg.accent)}>
                <PackIcon name={cfg.icon} className="h-5 w-5" />
              </div>
              <div className="leading-tight">
                <p className="text-sm font-semibold">{tenant.name}</p>
                <p className="text-[11px] text-slate-500">{pack?.name ?? tenant.category}</p>
              </div>
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </button>

            {switcher ? (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setSwitcher(false)} />
                <div className="absolute left-0 top-full z-20 mt-2 w-64 overflow-hidden rounded-xl border border-slate-100 bg-white shadow-xl">
                  <div className="max-h-72 overflow-y-auto py-1">
                    {tenants.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => {
                          selectTenant(t.id);
                          setSwitcher(false);
                          router.push("/biz/app");
                        }}
                        className={cn(
                          "flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition hover:bg-slate-50",
                          t.id === tenant.id && "bg-slate-50",
                        )}
                      >
                        <div className={cn("grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br text-white", t.config.accent)}>
                          <PackIcon name={t.config.icon} className="h-4 w-4" />
                        </div>
                        <span className="min-w-0 flex-1 truncate font-medium text-slate-700">{t.name}</span>
                      </button>
                    ))}
                  </div>
                  <Link
                    href="/biz/onboarding"
                    onClick={() => setSwitcher(false)}
                    className="flex items-center gap-2 border-t border-slate-100 px-3 py-2.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50"
                  >
                    <Plus className="h-4 w-4" /> Add business
                  </Link>
                </div>
              </>
            ) : null}
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 sm:inline-flex">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Live
            </span>
            <Link
              href={`${base}/billing`}
              className="inline-flex h-9 items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-fuchsia-600 px-4 text-sm font-medium text-white shadow-sm transition hover:brightness-105"
            >
              <Receipt className="h-4 w-4" /> New {cfg.labels.bill}
            </Link>
          </div>
        </header>

        {/* Mobile nav */}
        <div className="scroll-light flex gap-1.5 overflow-x-auto border-b border-white/40 bg-white/30 px-3 py-2 lg:hidden">
          {nav.map((entry) => {
            const active = isActive(entry.route);
            const Icon = entry.icon;
            return (
              <Link
                key={entry.route || "home"}
                href={hrefFor(entry.route)}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium",
                  active ? "bg-indigo-600 text-white" : "text-slate-600",
                )}
              >
                <Icon className="h-4 w-4" />
                {entry.label(cfg.labels)}
              </Link>
            );
          })}
        </div>

        <main className="scroll-light flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-6xl px-5 py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
