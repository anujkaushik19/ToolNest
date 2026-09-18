"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, Fingerprint, RefreshCw, ShieldCheck } from "lucide-react";

const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

function ulid(): string {
  let time = Date.now();
  let out = "";
  for (let i = 9; i >= 0; i--) {
    out = CROCKFORD[time % 32] + out;
    time = Math.floor(time / 32);
  }
  const rand = crypto.getRandomValues(new Uint8Array(16));
  for (let i = 0; i < 16; i++) out += CROCKFORD[rand[i] % 32];
  return out;
}

export function UuidGenerator() {
  const [kind, setKind] = useState<"uuid" | "ulid">("uuid");
  const [count, setCount] = useState(5);
  const [upper, setUpper] = useState(false);
  const [hyphens, setHyphens] = useState(true);
  const [ids, setIds] = useState<string[]>([]);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  const generate = useCallback(() => {
    const n = Math.min(500, Math.max(1, count));
    const list = Array.from({ length: n }, () => {
      if (kind === "ulid") return ulid();
      let id = crypto.randomUUID();
      if (!hyphens) id = id.replace(/-/g, "");
      if (upper) id = id.toUpperCase();
      return id;
    });
    setIds(list);
  }, [kind, count, upper, hyphens]);

  useEffect(() => {
    generate();
  }, [generate]);

  const copyOne = async (v: string, i: number) => {
    await navigator.clipboard.writeText(v);
    setCopiedIdx(i);
    setTimeout(() => setCopiedIdx(null), 1200);
  };

  const copyAll = async () => {
    await navigator.clipboard.writeText(ids.join("\n"));
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 1500);
  };

  return (
    <div className="space-y-4">
      <LocalNotice />

      <div className="flex flex-wrap items-center gap-3 rounded-2xl glass p-4">
        <div className="inline-flex rounded-xl border border-white/10 p-1">
          {(["uuid", "ulid"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              className={`rounded-lg px-4 py-1.5 text-sm uppercase transition ${
                kind === k ? "bg-white/15 text-foreground" : "text-foreground/60 hover:text-foreground"
              }`}
            >
              {k}
            </button>
          ))}
        </div>

        <label className="inline-flex items-center gap-2 text-sm text-foreground/70">
          Count
          <input
            type="number"
            min={1}
            max={500}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="w-20 rounded-lg border border-white/10 bg-white/[0.02] px-2 py-1 text-sm outline-none focus:border-brand-400/60"
          />
        </label>

        {kind === "uuid" && (
          <>
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-foreground/70">
              <input type="checkbox" checked={hyphens} onChange={(e) => setHyphens(e.target.checked)} className="accent-brand-500" />
              Hyphens
            </label>
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-foreground/70">
              <input type="checkbox" checked={upper} onChange={(e) => setUpper(e.target.checked)} className="accent-brand-500" />
              Uppercase
            </label>
          </>
        )}

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={generate}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-glow transition-transform hover:scale-[1.02]"
          >
            <RefreshCw className="h-4 w-4" /> Regenerate
          </button>
          <button
            onClick={copyAll}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-4 py-2 text-sm text-foreground/80 transition hover:bg-white/5"
          >
            {copiedAll ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
            {copiedAll ? "Copied all" : "Copy all"}
          </button>
        </div>
      </div>

      <div className="divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/10">
        {ids.map((id, i) => (
          <button
            key={i}
            onClick={() => copyOne(id, i)}
            className="flex w-full items-center gap-3 px-4 py-2.5 text-left font-mono text-sm transition hover:bg-white/5"
          >
            <span className="w-8 shrink-0 text-xs text-foreground/30">{i + 1}</span>
            <span className="min-w-0 flex-1 truncate">{id}</span>
            {copiedIdx === i ? (
              <Check className="h-4 w-4 shrink-0 text-emerald-400" />
            ) : (
              <Copy className="h-4 w-4 shrink-0 text-foreground/30" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function LocalNotice() {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100/90">
      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
      <p className="flex items-center gap-1.5">
        <Fingerprint className="h-3.5 w-3.5" />
        Generated with your browser&apos;s secure random source — nothing is sent anywhere.
      </p>
    </div>
  );
}
