"use client";

import { useMemo, useState } from "react";
import { Check, FlaskConical, Lightbulb, Plus, Target } from "lucide-react";
import type { CreatorData } from "@/lib/studio/types";
import { generateExperiment, generateIdeas } from "@/lib/studio/metrics";
import { Card, CardHead } from "@/components/studio/ui";

const formatCls: Record<string, string> = {
  Reel: "bg-fuchsia-50 text-fuchsia-700",
  Carousel: "bg-indigo-50 text-indigo-700",
  Image: "bg-cyan-50 text-cyan-700",
};

export default function GrowthPlan({ data }: { data: CreatorData }) {
  const experiment = useMemo(() => generateExperiment(data), [data]);
  const ideas = useMemo(() => generateIdeas(data), [data]);
  const [planned, setPlanned] = useState<Record<string, boolean>>({});
  const [started, setStarted] = useState(false);

  const plannedCount = Object.values(planned).filter(Boolean).length;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Growth Plan</h1>
        <p className="mt-1 text-sm text-slate-500">
          One focused experiment a week plus a ready-to-shoot idea queue — built from what already works for you.
        </p>
      </div>

      <Card className="mb-6 overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 to-fuchsia-600 px-6 py-5 text-white">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-white/80">
            <FlaskConical className="h-4 w-4" /> This week&apos;s experiment
          </div>
          <h2 className="mt-2 text-lg font-bold leading-snug">{experiment.hypothesis}</h2>
        </div>
        <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-3">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Target className="h-4 w-4 text-indigo-600" /> Do this
            </div>
            <p className="mt-2 text-sm text-slate-600">{experiment.action}</p>
            <div className="mt-4 space-y-2">
              {experiment.successCriteria.map((c, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-slate-700">
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                    <Check className="h-3 w-3" />
                  </span>
                  {c}
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Success metric</div>
            <div className="mt-1 text-sm font-semibold text-slate-900">{experiment.metricLabel}</div>
            <div className="mt-4 text-xs text-slate-500">Baseline to beat</div>
            <div className="text-3xl font-bold text-slate-900">{experiment.baseline}</div>
            <button
              onClick={() => setStarted((s) => !s)}
              className={`mt-4 w-full rounded-xl px-4 py-2 text-sm font-semibold transition ${
                started
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-slate-900 text-white hover:bg-slate-800"
              }`}
            >
              {started ? "Experiment started ✓" : "Start this experiment"}
            </button>
          </div>
        </div>
      </Card>

      <Card>
        <CardHead
          title="Idea queue"
          subtitle="Next posts to shoot, based on your best-performing angles"
          right={
            <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
              {plannedCount} planned
            </span>
          }
        />
        <div className="grid grid-cols-1 gap-3 p-5 md:grid-cols-2">
          {ideas.map((idea) => {
            const on = planned[idea.id];
            return (
              <div
                key={idea.id}
                className={`rounded-xl border p-4 transition ${
                  on ? "border-indigo-200 bg-indigo-50/50" : "border-slate-200 bg-white"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${formatCls[idea.format]}`}>
                    {idea.format}
                  </span>
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                    {idea.topic}
                  </span>
                </div>
                <h3 className="mt-2 text-sm font-semibold text-slate-900">{idea.title}</h3>
                <div className="mt-2 flex items-start gap-1.5 text-xs text-slate-600">
                  <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                  <span>Hook: “{idea.hook}”</span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-slate-500">{idea.reason}</p>
                <button
                  onClick={() => setPlanned((p) => ({ ...p, [idea.id]: !p[idea.id] }))}
                  className={`mt-3 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    on ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {on ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                  {on ? "Planned" : "Add to plan"}
                </button>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
