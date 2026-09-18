"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Hash, ShieldCheck } from "lucide-react";
import { md5 } from "@/lib/md5";

const SUBTLE_ALGOS = ["SHA-1", "SHA-256", "SHA-384", "SHA-512"] as const;

async function sha(algo: string, text: string): Promise<string> {
  const buf = await crypto.subtle.digest(algo, new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function HashGenerator() {
  const [input, setInput] = useState("");
  const [hashes, setHashes] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!input) {
        setHashes({});
        return;
      }
      const entries: Record<string, string> = { MD5: md5(input) };
      for (const algo of SUBTLE_ALGOS) {
        entries[algo] = await sha(algo, input);
      }
      if (!cancelled) setHashes(entries);
    })();
    return () => {
      cancelled = true;
    };
  }, [input]);

  const copy = async (algo: string, value: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(algo);
    setTimeout(() => setCopied(null), 1200);
  };

  const rows = ["MD5", ...SUBTLE_ALGOS];

  return (
    <div className="space-y-4">
      <LocalNotice />

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-foreground/50">Text</label>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          spellCheck={false}
          placeholder="Type or paste text to hash…"
          className="h-40 w-full resize-none rounded-2xl border border-white/10 bg-white/[0.02] p-4 font-mono text-sm outline-none transition focus:border-brand-400/60"
        />
      </div>

      <div className="divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/10">
        {rows.map((algo) => (
          <div key={algo} className="flex items-center gap-3 px-4 py-3">
            <span className="w-20 shrink-0 text-sm font-semibold text-foreground/70">{algo}</span>
            <code className="min-w-0 flex-1 truncate font-mono text-sm text-emerald-100/90">
              {hashes[algo] || <span className="text-foreground/30">—</span>}
            </code>
            {hashes[algo] && (
              <button
                onClick={() => copy(algo, hashes[algo])}
                className="shrink-0 text-foreground/40 transition hover:text-foreground"
                aria-label={`Copy ${algo}`}
              >
                {copied === algo ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              </button>
            )}
          </div>
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
        <Hash className="h-3.5 w-3.5" />
        Hashes are computed in your browser — your text never leaves your device.
      </p>
    </div>
  );
}
