"use client";

import { useState } from "react";
import { ArrowRightLeft, Check, Copy, ShieldCheck } from "lucide-react";

function utf8ToBase64(str: string, urlSafe: boolean): string {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  let b64 = btoa(bin);
  if (urlSafe) b64 = b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return b64;
}

function base64ToUtf8(b64: string): string {
  let s = b64.trim().replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const bin = atob(s);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function Base64Tool() {
  const [mode, setMode] = useState<"encode" | "decode">("encode");
  const [urlSafe, setUrlSafe] = useState(false);
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const run = () => {
    setError(null);
    if (!input.trim()) {
      setOutput("");
      return;
    }
    try {
      setOutput(mode === "encode" ? utf8ToBase64(input, urlSafe) : base64ToUtf8(input));
    } catch {
      setOutput("");
      setError(mode === "decode" ? "That doesn't look like valid Base64." : "Couldn't encode this input.");
    }
  };

  const swap = () => {
    setMode((m) => (m === "encode" ? "decode" : "encode"));
    setInput(output);
    setOutput(input);
    setError(null);
  };

  const copy = async () => {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-4">
      <LocalNotice />

      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-xl border border-white/10 p-1">
          {(["encode", "decode"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`rounded-lg px-4 py-1.5 text-sm capitalize transition ${
                mode === m ? "bg-white/15 text-foreground" : "text-foreground/60 hover:text-foreground"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 px-3 py-1.5 text-sm text-foreground/70">
          <input type="checkbox" checked={urlSafe} onChange={(e) => setUrlSafe(e.target.checked)} className="accent-brand-500" />
          URL-safe
        </label>
        <button
          onClick={swap}
          className="ml-auto inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-1.5 text-sm text-foreground/70 transition hover:bg-white/5"
        >
          <ArrowRightLeft className="h-4 w-4" /> Swap
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground/50">
            {mode === "encode" ? "Plain text" : "Base64"}
          </label>
          <textarea
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
            }}
            onKeyUp={run}
            spellCheck={false}
            placeholder={mode === "encode" ? "Type or paste text…" : "Paste Base64…"}
            className="h-72 w-full resize-none rounded-2xl border border-white/10 bg-white/[0.02] p-4 font-mono text-sm outline-none transition focus:border-brand-400/60"
          />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-foreground/50">Result</label>
            {output && (
              <button onClick={copy} className="inline-flex items-center gap-1 text-xs text-foreground/60 hover:text-foreground">
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied" : "Copy"}
              </button>
            )}
          </div>
          <textarea
            value={output}
            readOnly
            spellCheck={false}
            placeholder="Result appears here…"
            className="h-72 w-full resize-none rounded-2xl border border-white/10 bg-white/[0.02] p-4 font-mono text-sm text-emerald-100/90 outline-none"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      )}
    </div>
  );
}

function LocalNotice() {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100/90">
      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
      <p>Runs entirely in your browser — nothing you type is ever sent anywhere.</p>
    </div>
  );
}
