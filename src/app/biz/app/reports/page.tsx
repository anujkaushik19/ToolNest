"use client";

import { useMemo } from "react";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { BarChart3, IndianRupee, Receipt, TrendingUp } from "lucide-react";
import { useBiz, money } from "@/lib/biz/store";
import type { PaymentMode } from "@/lib/biz/types";
import { Card, EmptyState, StatCard } from "@/components/biz/ui";

const MODE_COLORS: Record<PaymentMode, string> = {
  cash: "#10b981",
  upi: "#6366f1",
  card: "#f59e0b",
  credit: "#ef4444",
};

export default function ReportsPage() {
  const { tenant, bills } = useBiz();

  const data = useMemo(() => {
    const totalSales = bills.reduce((s, b) => s + b.total, 0);
    const totalTax = bills.reduce((s, b) => s + b.tax, 0);
    const avg = bills.length ? totalSales / bills.length : 0;

    // 14-day series
    const series: { day: string; sales: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const sales = bills.filter((b) => b.createdAt.slice(0, 10) === key).reduce((s, b) => s + b.total, 0);
      series.push({ day: d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }), sales });
    }

    // payment split
    const modeMap = new Map<PaymentMode, number>();
    for (const b of bills) {
      for (const p of b.payments) modeMap.set(p.mode, (modeMap.get(p.mode) ?? 0) + p.amount);
    }
    const modes = Array.from(modeMap.entries()).map(([mode, value]) => ({ mode, value }));

    // top items
    const itemMap = new Map<string, { qty: number; revenue: number }>();
    for (const b of bills) {
      for (const l of b.lines) {
        const g = itemMap.get(l.name) ?? { qty: 0, revenue: 0 };
        g.qty += l.qty;
        g.revenue += l.price * l.qty;
        itemMap.set(l.name, g);
      }
    }
    const topItems = Array.from(itemMap.entries())
      .map(([name, g]) => ({ name, ...g }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    return { totalSales, totalTax, avg, series, modes, topItems };
  }, [bills]);

  if (!tenant) return null;
  const cfg = tenant.config;

  if (bills.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <EmptyState icon={BarChart3} title="No data yet" hint={`Create a few ${cfg.labels.billPlural.toLowerCase()} to see sales insights here.`} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="text-sm text-slate-500">Sales insights across all {cfg.labels.billPlural.toLowerCase()}.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total sales" value={money(data.totalSales, tenant.currency)} icon={IndianRupee} accent="from-emerald-500 to-teal-500" />
        <StatCard label={cfg.labels.billPlural} value={String(bills.length)} icon={Receipt} accent="from-indigo-500 to-blue-500" />
        <StatCard label="Avg. bill" value={money(data.avg, tenant.currency)} icon={TrendingUp} accent="from-violet-500 to-fuchsia-500" />
        <StatCard label="GST collected" value={money(data.totalTax, tenant.currency)} icon={BarChart3} accent="from-amber-500 to-orange-500" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="mb-4 font-semibold text-slate-900">Sales — last 14 days</h2>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.series} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} interval={1} />
                <Tooltip
                  cursor={{ fill: "#eef2ff" }}
                  formatter={(v: number) => [money(v, tenant.currency), "Sales"]}
                  contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
                />
                <Bar dataKey="sales" fill="#6366f1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 font-semibold text-slate-900">Payment modes</h2>
          <div className="h-40 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.modes} dataKey="value" nameKey="mode" innerRadius={40} outerRadius={64} paddingAngle={2}>
                  {data.modes.map((m) => (
                    <Cell key={m.mode} fill={MODE_COLORS[m.mode]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => money(v, tenant.currency)} contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 space-y-1.5">
            {data.modes.map((m) => (
              <div key={m.mode} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 capitalize text-slate-600">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: MODE_COLORS[m.mode] }} />
                  {m.mode}
                </span>
                <span className="font-medium text-slate-800">{money(m.value, tenant.currency)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <h2 className="mb-4 font-semibold text-slate-900">Top {cfg.labels.itemPlural.toLowerCase()}</h2>
        <div className="divide-y divide-slate-100">
          {data.topItems.map((t, idx) => (
            <div key={t.name} className="flex items-center gap-4 py-2.5 text-sm">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-slate-100 text-xs font-semibold text-slate-500">{idx + 1}</span>
              <span className="flex-1 font-medium text-slate-800">{t.name}</span>
              <span className="text-slate-400">{t.qty} sold</span>
              <span className="w-24 text-right font-semibold text-slate-900">{money(t.revenue, tenant.currency)}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
