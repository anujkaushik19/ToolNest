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

// Server-side conversion endpoint (the NestJS gateway in /backend).
const API =
  process.env.NEXT_PUBLIC_CONVERT_API?.replace(/\/$/, "") || "http://localhost:8080";

const ACCEPT = ".pdf";
const ALLOWED = /\.pdf$/i;

export function PdfToWord() {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  const onFiles = useCallback((files: File[]) => {
    const pdf = files.find((f) => ALLOWED.test(f.name));
    if (!pdf) {
      setError("Please choose a PDF file.");
      return;
    }
    setError(null);
    setResultUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setFile(pdf);
  }, []);

  const convert = useCallback(async () => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const resp = await fetch(`${API}/api/convert/pdf-to-word`, {
        method: "POST",
        body: form,
      });
      if (!resp.ok) {
        let msg = `Conversion failed (${resp.status}).`;
        try {
          const j = await resp.json();
          if (j?.message) msg = Array.isArray(j.message) ? j.message[0] : j.message;
        } catch {
          /* non-JSON error body */
        }
        throw new Error(msg);
      }
      const blob = await resp.blob();
      setResultUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(blob);
      });
    } catch (err) {
      setError(
        err instanceof Error && err.message !== "Failed to fetch"
          ? err.message
          : "Couldn't reach the conversion service. Is the backend running?"
      );
    } finally {
      setBusy(false);
    }
  }, [file]);

  const reset = () => {
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    setFile(null);
    setResultUrl(null);
    setError(null);
  };

  useEffect(() => {
    return () => {
      if (resultUrl) URL.revokeObjectURL(resultUrl);
    };
  }, [resultUrl]);

  const downloadName = (file?.name.replace(/\.[^.]+$/, "") || "document") + ".docx";

  if (!file) {
    return (
      <div className="space-y-4">
        <ServerNotice />
        <Dropzone
          accept={ACCEPT}
          onFiles={onFiles}
          hint="PDF → editable Word (.docx)"
        />
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

      {/* file info */}
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

      {/* action */}
      {resultUrl ? (
        <div className="flex flex-col gap-3 sm:flex-row">
          <a
            href={resultUrl}
            download={downloadName}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-accent-cyan px-6 py-3.5 text-base font-semibold text-white shadow-glow transition-transform hover:scale-[1.02]"
          >
            <Download className="h-5 w-5" /> Download Word (.docx)
          </a>
          <button
            onClick={convert}
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 px-6 py-3.5 text-sm text-foreground/70 transition hover:bg-white/5"
          >
            <RefreshCw className="h-4 w-4" /> Convert again
          </button>
        </div>
      ) : (
        <button
          onClick={convert}
          disabled={busy}
          className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-brand-600 px-6 py-3.5 text-base font-semibold text-white shadow-glow transition-transform hover:scale-[1.02] ${
            busy ? "opacity-60" : ""
          }`}
        >
          {busy ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" /> Converting…
            </>
          ) : (
            <>
              <Sparkles className="h-5 w-5" /> Convert to Word
            </>
          )}
        </button>
      )}
    </div>
  );
}

// Honest disclosure: unlike our client-side tools, this one uploads the file.
function ServerNotice() {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/90">
      <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
      <p>
        This tool needs server-side conversion, so your file is securely uploaded,
        converted, and immediately discarded — it is never stored. Works best with
        text-based PDFs; scanned pages need OCR (coming soon). All our other tools
        run fully in your browser.
      </p>
    </div>
  );
}
