"use client";

import { useMemo, useState } from "react";
import { Check, FileSpreadsheet, Sparkles, TriangleAlert, Upload } from "lucide-react";
import { csvToCreatorData } from "@/lib/studio/csv";
import { generateBrief } from "@/lib/studio/brief";
import { BriefView } from "./BriefView";
import type { WeeklyBrief } from "@/lib/studio/types";

// Client-side CSV fallback for creators who can't (or won't) connect Instagram.
// Everything runs in the browser — nothing is uploaded — so it's private and
// free. It auto-maps common export columns and produces an instant read.

const FIELD_SYNONYMS: Record<string, string[]> = {
  followers: ["followers", "follower count", "total followers", "audience"],
  reach: ["reach", "accounts reached", "reached"],
  views: ["views", "plays", "impressions", "video views", "play"],
  likes: ["likes", "like"],
  comments: ["comments", "comment"],
  saves: ["saves", "saved", "bookmarks"],
  shares: ["shares", "shared", "sends", "send"],
  date: ["date", "published", "post date", "timestamp", "day"],
  label: ["caption", "post", "title", "description", "name"],
};

type Parsed = { headers: string[]; rows: string[][] };

function parseCsv(text: string): Parsed {
  const lines = text.trim().split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (!lines.length) return { headers: [], rows: [] };
  const parseLine = (line: string): string[] => {
    const out: string[] = [];
    let cur = "";
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (quoted) {
        if (ch === '"' && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else if (ch === '"') {
          quoted = false;
        } else {
          cur += ch;
        }
      } else if (ch === '"') {
        quoted = true;
      } else if (ch === ",") {
        out.push(cur.trim());
        cur = "";
      } else {
        cur += ch;
      }
    }
    out.push(cur.trim());
    return out;
  };
  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).map(parseLine);
  return { headers, rows };
}

function num(v: string | undefined): number {
  if (!v) return 0;
  const n = Number(v.replace(/[,%\s]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function detectMapping(headers: string[]): Record<string, number> {
  const norm = headers.map((h) => h.toLowerCase().trim());
  const map: Record<string, number> = {};
  for (const [field, syns] of Object.entries(FIELD_SYNONYMS)) {
    let idx = -1;
    for (const s of syns) {
      idx = norm.findIndex((h) => h === s);
      if (idx === -1) idx = norm.findIndex((h) => h.includes(s));
      if (idx !== -1) break;
    }
    if (idx !== -1) map[field] = idx;
  }
  return map;
}

const SAMPLE = `Date,Caption,Reach,Views,Likes,Comments,Saves,Shares
2026-09-02,Morning routine that changed my skin,18450,21200,1240,86,410,132
2026-09-05,3 dinners under 15 minutes,9800,11300,620,41,180,54
2026-09-09,I tried the viral workout for 30 days,42600,51800,3100,214,290,610
2026-09-14,Why I quit my 9-5 (honest story),15200,17800,980,132,120,90
2026-09-19,My exact skincare shelf,26700,29900,1780,76,720,240`;

const round1 = (x: number) => Math.round(x * 10) / 10;

export function CsvImport() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<{ brief: WeeklyBrief; warnings: string[] } | null>(null);

  // Any change to the source data invalidates a previously generated brief.
  const update = (v: string) => {
    setText(v);
    setResult(null);
  };

  const parsed = useMemo(() => (text.trim() ? parseCsv(text) : null), [text]);
  const mapping = useMemo(() => (parsed ? detectMapping(parsed.headers) : {}), [parsed]);

  const summary = useMemo(() => {
    if (!parsed || !parsed.rows.length) return null;
    const g = (row: string[], field: string) => (field in mapping ? num(row[mapping[field]]) : 0);
    const rows = parsed.rows.map((r) => {
      const reach = g(r, "reach");
      const views = g(r, "views");
      const eng = g(r, "likes") + g(r, "comments") + g(r, "saves") + g(r, "shares");
      const base = reach || views;
      return {
        label: "label" in mapping ? r[mapping.label] : r[0] || "Post",
        reach,
        views,
        eng,
        rate: base > 0 ? round1((eng / base) * 100) : 0,
      };
    });
    const totalReach = rows.reduce((s, r) => s + r.reach, 0);
    const totalViews = rows.reduce((s, r) => s + r.views, 0);
    const totalEng = rows.reduce((s, r) => s + r.eng, 0);
    const base = totalReach || totalViews;
    const best = [...rows].sort((a, b) => b.rate - a.rate)[0];
    return { rows, totalReach, totalViews, avgRate: base > 0 ? round1((totalEng / base) * 100) : 0, best };
  }, [parsed, mapping]);

  const foundFields = Object.keys(mapping);
  const missingCore = ["reach", "views"].every((f) => !(f in mapping));

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <FileSpreadsheet className="h-4 w-4 text-slate-500" /> Paste or upload your exported stats
        </label>
        <p className="mt-1 text-xs text-slate-500">
          Any CSV with columns like reach, views, likes, comments, saves. Everything stays in your browser — nothing is uploaded.
        </p>
        <textarea
          value={text}
          onChange={(e) => update(e.target.value)}
          rows={6}
          placeholder="Date,Caption,Reach,Views,Likes,Comments,Saves..."
          className="mt-3 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-800 outline-none focus:border-indigo-400"
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
            <Upload className="h-3.5 w-3.5" /> Upload CSV
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => update(String(reader.result || ""));
                reader.readAsText(file);
              }}
            />
          </label>
          <button
            type="button"
            onClick={() => update(SAMPLE)}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
          >
            Load sample data
          </button>
          {text && (
            <button type="button" onClick={() => update("")} className="text-xs font-medium text-slate-400 hover:text-slate-600">
              Clear
            </button>
          )}
        </div>
      </div>

      {parsed && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-semibold text-slate-900">Detected columns</div>
          {missingCore ? (
            <div className="mt-2 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Couldn&apos;t find a reach or views column. Check your header row and try again.
            </div>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              {foundFields.map((f) => (
                <span key={f} className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                  <Check className="h-3 w-3" /> {f} → &ldquo;{parsed.headers[mapping[f]]}&rdquo;
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {summary && !missingCore && (
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Instant read</div>
          <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Metric label="Posts" value={String(summary.rows.length)} />
            <Metric label="Total reach" value={summary.totalReach.toLocaleString()} />
            <Metric label="Total views" value={summary.totalViews.toLocaleString()} />
            <Metric label="Avg engagement" value={`${summary.avgRate}%`} />
          </div>
          {summary.best && (
            <p className="mt-4 text-sm text-slate-700">
              Your strongest post is <span className="font-semibold text-slate-900">&ldquo;{summary.best.label}&rdquo;</span> at{" "}
              <span className="font-semibold text-slate-900">{summary.best.rate}%</span> engagement — lead with more like it.
            </p>
          )}
          <button
            type="button"
            onClick={() => {
              if (!parsed) return;
              const { data, warnings } = csvToCreatorData({ headers: parsed.headers, rows: parsed.rows, mapping });
              setResult({ brief: generateBrief(data), warnings });
            }}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
          >
            <Sparkles className="h-4 w-4" /> Generate Monday Brief
          </button>
          <p className="mt-3 text-[11px] text-slate-500">
            The brief runs entirely in your browser from this file. Connecting Instagram keeps it updating automatically and unlocks follower-growth signals.
          </p>
        </div>
      )}

      {result && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Sparkles className="h-4 w-4 text-indigo-500" /> Your Monday Brief
          </div>
          {result.warnings.length > 0 && (
            <div className="mb-4 space-y-1.5">
              {result.warnings.map((w, i) => (
                <div key={i} className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {w}
                </div>
              ))}
            </div>
          )}
          <BriefView
            brief={result.brief}
            accountLabel="From your uploaded data"
            footnote="Generated from your file with the same transparent rules used for connected accounts — no AI, nothing uploaded."
          />
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/70 px-3 py-2 text-center">
      <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-0.5 text-lg font-bold text-slate-900">{value}</div>
    </div>
  );
}
