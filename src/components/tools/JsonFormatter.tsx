"use client";

import { useState } from "react";
import { Check, Copy, Download, Minimize2, ShieldCheck, Sparkles, Wand2 } from "lucide-react";

const SAMPLE = `{"name":"Toolnest","live":true,"tools":["json","jwt","base64"],"count":6}`;

export function JsonFormatter() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [indent, setIndent] = useState<number>(2);
  const [copied, setCopied] = useState(false);

  const process = (mode: "beautify" | "minify") => {
    const text = input.trim();
    if (!text) {
      setError("Paste some JSON to get started.");
      setOutput("");
      return;
    }
    try {
      const parsed = JSON.parse(text);
      const result =
        mode === "minify" ? JSON.stringify(parsed) : JSON.stringify(parsed, null, indent);
      setOutput(result);
      setError(null);
    } catch (e) {
      setOutput("");
      setError(e instanceof Error ? e.message : "Invalid JSON.");
    }
  };

  const copy = async () => {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const download = () => {
    if (!output) return;
    const blob = new Blob([output], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "formatted.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <LocalNotice />

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => process("beautify")}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-glow transition-transform hover:scale-[1.02]"
        >
          <Wand2 className="h-4 w-4" /> Beautify
        </button>
        <button
          onClick={() => process("minify")}
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm text-foreground/80 transition hover:bg-white/5"
        >
          <Minimize2 className="h-4 w-4" /> Minify
        </button>
        <div className="ml-auto flex items-center gap-1.5 text-xs text-foreground/50">
          <span>Indent</span>
          {[2, 4].map((n) => (
            <button
              key={n}
              onClick={() => setIndent(n)}
              className={`rounded-lg px-2 py-1 transition ${
                indent === n ? "bg-white/15 text-foreground" : "hover:bg-white/5"
              }`}
            >
              {n}
            </button>
          ))}
          <button
            onClick={() => setInput(SAMPLE)}
            className="rounded-lg px-2 py-1 text-brand-300 transition hover:bg-white/5"
          >
            Sample
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground/50">Input</label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            spellCheck={false}
            placeholder="Paste JSON here…"
            className="h-80 w-full resize-none rounded-2xl border border-white/10 bg-white/[0.02] p-4 font-mono text-sm outline-none transition focus:border-brand-400/60"
          />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-foreground/50">Output</label>
            {output && (
              <div className="flex items-center gap-2">
                <button onClick={copy} className="inline-flex items-center gap-1 text-xs text-foreground/60 hover:text-foreground">
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </button>
                <button onClick={download} className="inline-flex items-center gap-1 text-xs text-foreground/60 hover:text-foreground">
                  <Download className="h-3.5 w-3.5" /> Download
                </button>
              </div>
            )}
          </div>
          <textarea
            value={output}
            readOnly
            spellCheck={false}
            placeholder="Formatted JSON appears here…"
            className="h-80 w-full resize-none rounded-2xl border border-white/10 bg-white/[0.02] p-4 font-mono text-sm text-emerald-100/90 outline-none"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      )}
      {output && !error && (
        <p className="inline-flex items-center gap-1.5 text-sm text-emerald-300">
          <Sparkles className="h-4 w-4" /> Valid JSON
        </p>
      )}
    </div>
  );
}

function LocalNotice() {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100/90">
      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
      <p>Everything runs locally in your browser — your data is never uploaded.</p>
    </div>
  );
}
