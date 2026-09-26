"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { ArrowRight, IndianRupee, Package, Receipt, TrendingUp, Users } from "lucide-react";
import { useBiz, money } from "@/lib/biz/store";
import { getPack } from "@/lib/biz/packs";
import { MODULE_NAV } from "@/components/biz/modules";
import { Badge, Button, Card, EmptyState, StatCard } from "@/components/biz/ui";

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default function Dashboard() {
  const { tenant, items, contacts, bills } = useBiz();

  const stats = useMemo(() => {
    const today = dayKey(new Date());
    const todayBills = bills.filter((b) => b.createdAt.slice(0, 10) === today);
    const todaySales = todayBills.reduce((s, b) => s + b.total, 0);
    const totalSales = bills.reduce((s, b) => s + b.total, 0);

    // last 7 days trend
    const series: { day: string; sales: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = dayKey(d);
      const sales = bills.filter((b) => b.createdAt.slice(0, 10) === key).reduce((s, b) => s + b.total, 0);
      series.push({ day: d.toLocaleDateString("en-IN", { weekday: "short" }), sales });
    }

    const lowStock = items.filter((i) => i.trackStock && typeof i.stock === "number" && i.stock <= 5);
    return { todaySales, todayBills, totalSales, series, lowStock };
  }, [bills, items]);

  if (!tenant) return null;
  const cfg = tenant.config;
  const pack = getPack(tenant.category);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Good day, {tenant.name}</h1>
          <p className="text-sm text-slate-500">Here&apos;s what&apos;s happening at your {pack?.name.toLowerCase()} today.</p>
        </div>
        <Link href="/biz/app/billing">
          <Button>
            <Receipt className="h-4 w-4" /> New {cfg.labels.bill}
          </Button>
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Today's sales" value={money(stats.todaySales, tenant.currency)} icon={IndianRupee} accent="from-emerald-500 to-teal-500" sub={`${stats.todayBills.length} ${cfg.labels.billPlural.toLowerCase()} today`} />
        <StatCard label="Total sales" value={money(stats.totalSales, tenant.currency)} icon={TrendingUp} accent="from-indigo-500 to-blue-500" sub={`${bills.length} ${cfg.labels.billPlural.toLowerCase()} all-time`} />
        <StatCard label={cfg.labels.itemPlural} value={String(items.length)} icon={Package} accent="from-violet-500 to-fuchsia-500" sub={`${items.filter((i) => i.active).length} active`} />
        <StatCard label={cfg.labels.contactPlural} value={String(contacts.length)} icon={Users} accent="from-amber-500 to-orange-500" sub={contacts.some((c) => c.dues > 0) ? `${money(contacts.reduce((s, c) => s + c.dues, 0), tenant.currency)} dues` : "No dues"} />
      </div>

      {/* Chart + quick actions */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-slate-900">Sales this week</h2>
              <p className="text-sm text-slate-500">Last 7 days</p>
            </div>
            <Badge tone="indigo">7d</Badge>
          </div>
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.series} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} />
                <Tooltip
                  cursor={{ stroke: "#c7d2fe" }}
                  formatter={(v: number) => [money(v, tenant.currency), "Sales"]}
                  contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
                />
                <Area type="monotone" dataKey="sales" stroke="#6366f1" strokeWidth={2.5} fill="url(#salesFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 font-semibold text-slate-900">Quick actions</h2>
          <div className="space-y-2">
            {cfg.modules.map((m) => {
              const entry = MODULE_NAV[m];
              const Icon = entry.icon;
              return (
                <Link
                  key={m}
                  href={`/biz/app/${entry.route}`}
                  className="lift flex items-center gap-3 rounded-xl border border-slate-100 bg-white px-3.5 py-3 text-sm font-medium text-slate-700 shadow-sm"
                >
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-slate-100 text-slate-500">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="flex-1">{entry.label(cfg.labels)}</span>
                  <ArrowRight className="h-4 w-4 text-slate-300" />
                </Link>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Low stock + recent bills */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-semibold text-slate-900">Recent {cfg.labels.billPlural.toLowerCase()}</h2>
          {bills.length === 0 ? (
            <EmptyState icon={Receipt} title={`No ${cfg.labels.billPlural.toLowerCase()} yet`} hint={`Create your first ${cfg.labels.bill.toLowerCase()} to see it here.`} />
          ) : (
            <div className="divide-y divide-slate-100">
              {bills.slice(0, 6).map((b) => (
                <Link key={b.id} href={`/biz/app/receipt/${b.id}`} className="flex items-center justify-between py-2.5 text-sm transition hover:opacity-70">
                  <div>
                    <p className="font-medium text-slate-800">{b.number}</p>
                    <p className="text-xs text-slate-400">
                      {b.contactName || "Walk-in"} · {new Date(b.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <span className="font-semibold text-slate-900">{money(b.total, tenant.currency)}</span>
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h2 className="mb-4 font-semibold text-slate-900">Low stock</h2>
          {stats.lowStock.length === 0 ? (
            <EmptyState icon={Package} title="Stock looks healthy" hint="Items at or below 5 units will appear here." />
          ) : (
            <div className="divide-y divide-slate-100">
              {stats.lowStock.map((i) => (
                <div key={i.id} className="flex items-center justify-between py-2.5 text-sm">
                  <span className="font-medium text-slate-800">{i.name}</span>
                  <Badge tone={i.stock === 0 ? "red" : "amber"}>{i.stock} {i.unit ?? "left"}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
