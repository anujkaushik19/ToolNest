"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Building2, Check, Plus, Receipt, Sparkles } from "lucide-react";
import { useBiz } from "@/lib/biz/store";
import { getPack } from "@/lib/biz/packs";
import { Button, PackIcon } from "@/components/biz/ui";

const HIGHLIGHTS = [
  "One portal for every kind of shop",
  "GST-ready billing & thermal receipts",
  "Works offline — no setup, no server",
];

export default function BizHome() {
  const { loaded, tenants, selectTenant } = useBiz();
  const router = useRouter();

  function open(id: string) {
    selectTenant(id);
    router.push("/biz/app");
  }

  return (
    <div className="dashboard-surface min-h-screen text-slate-900">
      <header className="frosted sticky top-0 z-30 border-b border-white/40">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-indigo-600 to-fuchsia-600 text-white shadow-sm">
              <Receipt className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold">Biz<span className="brand-text">Nest</span></p>
              <p className="text-[11px] text-slate-500">Run your shop from one place</p>
            </div>
          </div>
          <Link href="/biz/onboarding">
            <Button size="sm">
              <Plus className="h-4 w-4" /> New business
            </Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-5 py-12">
        {/* Hero */}
        <section className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
              <Sparkles className="h-3.5 w-3.5" /> One platform, every business
            </span>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
              The billing &amp; management portal for{" "}
              <span className="brand-text">any retailer</span>.
            </h1>
            <p className="mt-4 max-w-lg text-lg text-slate-600">
              Kirana store, clinic, dairy, restaurant, salon or saree shop — pick your business type and
              start billing in under a minute. The screens adapt to how <em>you</em> work.
            </p>
            <ul className="mt-6 space-y-2.5">
              {HIGHLIGHTS.map((h) => (
                <li key={h} className="flex items-center gap-2.5 text-slate-700">
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-100 text-emerald-600">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  {h}
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/biz/onboarding">
                <Button size="lg">
                  Set up your business <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              {tenants.length > 0 ? (
                <Button variant="outline" size="lg" onClick={() => open(tenants[0].id)}>
                  Open {tenants[0].name}
                </Button>
              ) : null}
            </div>
          </div>

          {/* Preview card */}
          <div className="relative">
            <div className="card-elevated p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                  <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                  <div className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                </div>
                <span className="text-xs text-slate-400">Live preview</span>
              </div>
              <div className="mt-5 space-y-3">
                <div className="rounded-xl bg-gradient-to-br from-indigo-600 to-fuchsia-600 p-4 text-white">
                  <p className="text-xs opacity-80">Today&apos;s sales</p>
                  <p className="text-2xl font-semibold">₹18,240</p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {["Bills", "Items", "Customers"].map((t, i) => (
                    <div key={t} className="rounded-xl border border-slate-100 bg-white p-3 text-center shadow-sm">
                      <p className="text-lg font-semibold text-slate-800">{[42, 128, 96][i]}</p>
                      <p className="text-[11px] text-slate-400">{t}</p>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  {["Full Cream Milk × 2", "Butter Naan × 4", "Haircut (Men) × 1"].map((r) => (
                    <div key={r} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                      <span className="text-slate-600">{r}</span>
                      <span className="font-medium text-slate-800">₹—</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="absolute -right-3 -top-3 -z-10 h-24 w-24 rounded-full bg-fuchsia-300/40 blur-2xl" />
            <div className="absolute -bottom-4 -left-4 -z-10 h-28 w-28 rounded-full bg-indigo-300/40 blur-2xl" />
          </div>
        </section>

        {/* Existing businesses */}
        {loaded && tenants.length > 0 ? (
          <section className="mt-16">
            <h2 className="text-lg font-semibold text-slate-900">Your businesses</h2>
            <p className="text-sm text-slate-500">Pick up where you left off.</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {tenants.map((t) => {
                const pack = getPack(t.category);
                return (
                  <button
                    key={t.id}
                    onClick={() => open(t.id)}
                    className="card-elevated lift group flex items-center gap-4 p-5 text-left"
                  >
                    <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-white shadow-sm ${t.config.accent}`}>
                      <PackIcon name={t.config.icon} className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-slate-900">{t.name}</p>
                      <p className="truncate text-sm text-slate-500">{pack?.name ?? t.category}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-indigo-500" />
                  </button>
                );
              })}
            </div>
          </section>
        ) : loaded ? (
          <section className="mt-16">
            <div className="card-elevated flex flex-col items-center gap-3 px-6 py-12 text-center">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-400">
                <Building2 className="h-6 w-6" />
              </div>
              <p className="font-medium text-slate-800">No business yet</p>
              <p className="max-w-sm text-sm text-slate-500">
                Create your first business in a few seconds — you can add more later and switch between them anytime.
              </p>
              <Link href="/biz/onboarding" className="mt-1">
                <Button>
                  <Plus className="h-4 w-4" /> Create a business
                </Button>
              </Link>
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}
