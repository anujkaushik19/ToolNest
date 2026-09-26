"use client";

import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { TiltCard, AnimatedNumber, StaggerItem } from "./motion";

/**
 * Premium 3D KPI card: cursor-driven tilt, cursor spotlight, a glare sheen,
 * a count-up value that pops toward the viewer, and a live delta pill.
 */
export function StatCard3D({
  label,
  value,
  format = "compact",
  pct,
  hint,
  chart,
  accent = "indigo",
}: {
  label: string;
  value: number;
  format?: "compact" | "int";
  pct?: number;
  hint?: string;
  chart?: ReactNode;
  accent?: "indigo" | "cyan" | "violet" | "emerald";
}) {
  const up = typeof pct === "number" && pct > 0.5;
  const down = typeof pct === "number" && pct < -0.5;
  const DeltaIcon = up ? ArrowUpRight : down ? ArrowDownRight : Minus;
  const deltaCls = up
    ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
    : down
      ? "bg-rose-50 text-rose-700 ring-rose-200"
      : "bg-slate-100 text-slate-600 ring-slate-200";

  const glow = ACCENT[accent];

  return (
    <StaggerItem>
      <TiltCard spotlight={glow.spot}>
        <div className="card-elevated relative overflow-hidden rounded-2xl p-5 [transform-style:preserve-3d]">
          {/* accent corner wash */}
          <div
            className={`pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full blur-2xl ${glow.blob}`}
          />
          <div className="relative [transform:translateZ(34px)]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                {label}
              </span>
              {typeof pct === "number" && (
                <span
                  className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${deltaCls}`}
                >
                  <DeltaIcon className="h-3 w-3" />
                  {Math.abs(pct).toFixed(1)}%
                </span>
              )}
            </div>
            <div className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
              <AnimatedNumber value={value} format={format} />
            </div>
            {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
          </div>
          {chart && (
            <div className="relative mt-3 -mb-1 [transform:translateZ(18px)]">{chart}</div>
          )}
        </div>
      </TiltCard>
    </StaggerItem>
  );
}

const ACCENT = {
  indigo: { spot: "rgba(99,102,241,0.18)", blob: "bg-indigo-400/25" },
  cyan: { spot: "rgba(34,211,238,0.18)", blob: "bg-cyan-400/25" },
  violet: { spot: "rgba(167,139,250,0.18)", blob: "bg-violet-400/25" },
  emerald: { spot: "rgba(16,185,129,0.16)", blob: "bg-emerald-400/25" },
} as const;
