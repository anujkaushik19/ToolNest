"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Download,
  FileText,
  Loader2,
  RefreshCw,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { Dropzone, formatBytes } from "@/components/Dropzone";

const API =
  process.env.NEXT_PUBLIC_CONVERT_API?.replace(/\/$/, "") || "http://localhost:8080";

const ALLOWED = /\.pdf$/i;

const LEVELS = [
  { id: "screen", label: "Maximum", note: "Smallest size · 72 dpi" },
  { id: "ebook", label: "Recommended", note: "Great balance · 150 dpi" },
  { id: "printer", label: "Light", note: "Best quality · 300 dpi" },
] as const;

export function CompressPdf() {
  const [file, setFile] = useState<File | null>(null);
  const [level, setLevel] = useState<string>("ebook");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultSize, setResultSize] = useState<number | null>(null);

  const onFiles = useCallback((files: File[]) => {
    const pdf = files.find((f) => ALLOWED.test(f.name));
    if (!pdf) {
      setError("Please choose a PDF file.");
      return;
    }
    setError(null);
    setResultUrl((p) => (p && URL.revokeObjectURL(p), null));
    setResultSize(null);
    setFile(pdf);
  }, []);

  const compress = useCallback(async () => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("level", level);
      const resp = await fetch(`${API}/api/pdf/compress`, {
        method: "POST",
        body: form,
      });
      if (!resp.ok) {
        let msg = `Compression failed (${resp.status}).`;
        try {
          const j = await resp.json();
          if (j?.message) msg = Array.isArray(j.message) ? j.message[0] : j.message;
        } catch {
          /* non-JSON */
        }
        throw new Error(msg);
      }
      const blob = await resp.blob();
      setResultSize(blob.size);
      setResultUrl((p) => {
        if (p) URL.revokeObjectURL(p);
        return URL.createObjectURL(blob);
      });
    } catch (err) {
      setError(
        err instanceof Error && err.message !== "Failed to fetch"
          ? err.message
          : "Couldn't reach the compression service. Is the backend running?"
      );
    } finally {
      setBusy(false);
    }
  }, [file, level]);

  const reset = () => {
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    setFile(null);
    setResultUrl(null);
    setResultSize(null);
    setError(null);
  };

  useEffect(() => {
    return () => {
      if (resultUrl) URL.revokeObjectURL(resultUrl);
    };
  }, [resultUrl]);

  const downloadName = (file?.name.replace(/\.[^.]+$/, "") || "document") + "-compressed.pdf";
  const saved =
    file && resultSize != null ? Math.max(0, file.size - resultSize) : 0;
  const savedPct =
    file && resultSize != null && file.size > 0
      ? Math.round((saved / file.size) * 100)
      : 0;

  if (!file) {
    return (
      <div className="space-y-4">
        <ServerNotice />
        <Dropzone accept=".pdf" onFiles={onFiles} hint="PDF → smaller PDF" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ServerNotice />

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3 rounded-2xl glass p-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-orange-500">
          <FileText className="h-5 w-5 text-white" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{file.name}</p>
          <p className="text-xs text-foreground/50">{formatBytes(file.size)}</p>
        </div>
        <button
          onClick={reset}
          className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-sm text-foreground/70 transition hover:bg-white/5"
        >
          <RefreshCw className="h-4 w-4" /> New file
        </button>
      </div>

      {/* level picker */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {LEVELS.map((l) => (
          <button
            key={l.id}
            onClick={() => setLevel(l.id)}
            className={`rounded-2xl border p-4 text-left transition ${
              level === l.id
                ? "border-brand-400 bg-brand-500/10 shadow-glow"
                : "border-white/10 hover:bg-white/5"
            }`}
          >
            <p className="text-sm font-semibold">{l.label}</p>
            <p className="mt-0.5 text-xs text-foreground/50">{l.note}</p>
          </button>
        ))}
      </div>

      {/* result */}
      {resultUrl && resultSize != null && (
        <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4 text-sm text-emerald-100">
          {saved > 0 ? (
            <p>
              Reduced from <b>{formatBytes(file.size)}</b> to{" "}
              <b>{formatBytes(resultSize)}</b> —{" "}
              <b>{savedPct}% smaller</b> 🎉
            </p>
          ) : (
            <p>
              This PDF is already well optimized ({formatBytes(resultSize)}). Try
              a stronger level for more savings.
            </p>
          )}
        </div>
      )}

      {resultUrl ? (
        <div className="flex flex-col gap-3 sm:flex-row">
          <a
            href={resultUrl}
            download={downloadName}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-accent-cyan px-6 py-3.5 text-base font-semibold text-white shadow-glow transition-transform hover:scale-[1.02]"
          >
            <Download className="h-5 w-5" /> Download compressed PDF
          </a>
          <button
            onClick={compress}
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 px-6 py-3.5 text-sm text-foreground/70 transition hover:bg-white/5"
          >
            <RefreshCw className="h-4 w-4" /> Try another level
          </button>
        </div>
      ) : (
        <button
          onClick={compress}
          disabled={busy}
          className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-brand-600 px-6 py-3.5 text-base font-semibold text-white shadow-glow transition-transform hover:scale-[1.02] ${
            busy ? "opacity-60" : ""
          }`}
        >
          {busy ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" /> Compressing…
            </>
          ) : (
            <>
              <Sparkles className="h-5 w-5" /> Compress PDF
            </>
          )}
        </button>
      )}
    </div>
  );
}

function ServerNotice() {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/90">
      <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
      <p>
        This tool needs server-side processing, so your file is securely uploaded,
        compressed, and immediately discarded — it is never stored. All our other
        tools run fully in your browser.
      </p>
    </div>
  );
}
