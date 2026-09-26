import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { TiltCard } from "./motion";

export function fmt(n: number): string {
  return n.toLocaleString("en-US");
}

export function compact(n: number): string {
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "k";
  return String(Math.round(n));
}

export function Card({
  children,
  className = "",
  hover = false,
  tilt = true,
  tiltMax = 6,
  spotlight = "rgba(99,102,241,0.14)",
  glare = false,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  /** Cursor-driven 3D tilt (on by default). Set false for large heroes/tables that shouldn't move. */
  tilt?: boolean;
  tiltMax?: number;
  spotlight?: string;
  glare?: boolean;
}) {
  const cls = `card-elevated rounded-2xl ${hover ? "lift" : ""} ${className}`;
  if (!tilt) {
    return <div className={cls}>{children}</div>;
  }
  return (
    <TiltCard max={tiltMax} glare={glare} spotlight={spotlight} className={cls}>
      {children}
    </TiltCard>
  );
}

export function CardHead({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 px-5 pt-5">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

export function DeltaPill({ pct }: { pct: number }) {
  const up = pct > 0.5;
  const down = pct < -0.5;
  const cls = up
    ? "bg-emerald-50 text-emerald-700"
    : down
      ? "bg-rose-50 text-rose-700"
      : "bg-slate-100 text-slate-600";
  const Icon = up ? ArrowUpRight : down ? ArrowDownRight : Minus;
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>
      <Icon className="h-3 w-3" />
      {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

export function StatCard({
  label,
  value,
  pct,
  hint,
  chart,
}: {
  label: string;
  value: string;
  pct?: number;
  hint?: string;
  chart?: ReactNode;
}) {
  return (
    <Card className="relative overflow-hidden p-5">
      <div className="pointer-events-none absolute -right-8 -top-10 h-24 w-24 rounded-full bg-gradient-to-br from-indigo-500/10 to-fuchsia-500/10 blur-2xl" />
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</span>
        {typeof pct === "number" && <DeltaPill pct={pct} />}
      </div>
      <div className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{value}</div>
      {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
      {chart && <div className="mt-3 -mb-1">{chart}</div>}
    </Card>
  );
}

export function ScorePill({ score }: { score: number }) {
  const cls =
    score >= 65
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
      : score >= 45
        ? "bg-amber-50 text-amber-700 ring-amber-200"
        : "bg-rose-50 text-rose-700 ring-rose-200";
  return (
    <span className={`inline-flex items-center rounded-lg px-2 py-0.5 text-sm font-bold ring-1 ${cls}`}>
      {score}
    </span>
  );
}

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      <div className="mt-4 h-px w-full bg-gradient-to-r from-indigo-500/25 via-slate-200/70 to-transparent" />
    </div>
  );
}
