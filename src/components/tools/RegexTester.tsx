"use client";

import { useMemo, useState } from "react";
import { Regex, ShieldCheck } from "lucide-react";

const FLAGS: { id: string; label: string }[] = [
  { id: "g", label: "global" },
  { id: "i", label: "ignore case" },
  { id: "m", label: "multiline" },
  { id: "s", label: "dotall" },
  { id: "u", label: "unicode" },
  { id: "y", label: "sticky" },
];

type Match = { index: number; text: string; groups: (string | undefined)[]; named?: Record<string, string> };

export function RegexTester() {
  const [pattern, setPattern] = useState("");
  const [flags, setFlags] = useState<string[]>(["g"]);
  const [text, setText] = useState("");

  const { matches, error } = useMemo(() => {
    if (!pattern) return { matches: [] as Match[], error: null as string | null };
    try {
      const flagStr = flags.join("");
      const withG = flagStr.includes("g") ? flagStr : flagStr + "g";
      const re = new RegExp(pattern, withG);
      const found: Match[] = [];
      let m: RegExpExecArray | null;
      let guard = 0;
      while ((m = re.exec(text)) !== null && guard < 10000) {
        found.push({ index: m.index, text: m[0], groups: m.slice(1), named: m.groups });
        if (m.index === re.lastIndex) re.lastIndex++;
        guard++;
      }
      return { matches: found, error: null };
    } catch (e) {
      return { matches: [] as Match[], error: e instanceof Error ? e.message : "Invalid regular expression." };
    }
  }, [pattern, flags, text]);

  const highlighted = useMemo(() => {
    if (!text || matches.length === 0 || error) return null;
    const parts: React.ReactNode[] = [];
    let cursor = 0;
    matches.forEach((m, i) => {
      if (m.index < cursor) return; // skip overlaps
      if (m.index > cursor) parts.push(text.slice(cursor, m.index));
      parts.push(
        <mark key={i} className="rounded bg-brand-500/40 px-0.5 text-white">
          {m.text || "∅"}
        </mark>
      );
      cursor = m.index + m.text.length;
    });
    if (cursor < text.length) parts.push(text.slice(cursor));
    return parts;
  }, [text, matches, error]);

  const toggleFlag = (f: string) =>
    setFlags((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]));

  return (
    <div className="space-y-4">
      <LocalNotice />

      {/* pattern */}
      <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.02] px-3 font-mono text-sm focus-within:border-brand-400/60">
        <span className="text-foreground/40">/</span>
        <input
          value={pattern}
          onChange={(e) => setPattern(e.target.value)}
          spellCheck={false}
          placeholder="pattern"
          className="min-w-0 flex-1 bg-transparent py-3 outline-none"
        />
        <span className="text-foreground/40">/{flags.join("")}</span>
      </div>

      {/* flags */}
      <div className="flex flex-wrap gap-2">
        {FLAGS.map((f) => (
          <button
            key={f.id}
            onClick={() => toggleFlag(f.id)}
            title={f.label}
            className={`rounded-lg px-3 py-1.5 text-sm transition ${
              flags.includes(f.id) ? "bg-white/15 ring-1 ring-white/20" : "text-foreground/60 hover:bg-white/5"
            }`}
          >
            <span className="font-mono">{f.id}</span>{" "}
            <span className="text-xs text-foreground/50">{f.label}</span>
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      )}

      {/* test string */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-foreground/50">Test string</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          spellCheck={false}
          placeholder="Paste text to test against…"
          className="h-40 w-full resize-none rounded-2xl border border-white/10 bg-white/[0.02] p-4 font-mono text-sm outline-none transition focus:border-brand-400/60"
        />
      </div>

      {/* highlighted preview */}
      {highlighted && (
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground/50">
            {matches.length} match{matches.length === 1 ? "" : "es"}
          </label>
          <div className="whitespace-pre-wrap break-words rounded-2xl border border-white/10 bg-white/[0.02] p-4 font-mono text-sm text-foreground/80">
            {highlighted}
          </div>
        </div>
      )}

      {/* capture groups */}
      {matches.length > 0 && matches.some((m) => m.groups.length > 0 || m.named) && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-foreground/50">Capture groups</label>
          <div className="space-y-2">
            {matches.slice(0, 20).map((m, i) => (
              <div key={i} className="rounded-xl glass p-3 text-sm">
                <span className="text-foreground/50">Match {i + 1}: </span>
                <code className="text-emerald-100/90">{m.text || "∅"}</code>
                {m.groups.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-2">
                    {m.groups.map((g, gi) => (
                      <span key={gi} className="rounded-lg bg-white/5 px-2 py-0.5 font-mono text-xs">
                        ${gi + 1}: {g === undefined ? <span className="text-foreground/30">undefined</span> : g}
                      </span>
                    ))}
                  </div>
                )}
                {m.named && Object.keys(m.named).length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-2">
                    {Object.entries(m.named).map(([k, v]) => (
                      <span key={k} className="rounded-lg bg-white/5 px-2 py-0.5 font-mono text-xs">
                        {k}: {v}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function LocalNotice() {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100/90">
      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
      <p className="flex items-center gap-1.5">
        <Regex className="h-3.5 w-3.5" />
        Matching runs locally in your browser — nothing you type is sent anywhere.
      </p>
    </div>
  );
}
