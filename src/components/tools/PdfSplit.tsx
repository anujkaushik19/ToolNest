"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PDFDocument } from "pdf-lib";
import { Download, Loader2, RefreshCw, Scissors, FileText } from "lucide-react";
import { Dropzone, formatBytes } from "@/components/Dropzone";

type Loaded = {
  file: File;
  pageCount: number;
};

// Parse a range string like "1-3, 5, 8-10" into sorted, unique 1-based pages.
function parseRanges(input: string, max: number): number[] {
  const pages = new Set<number>();
  for (const part of input.split(",")) {
    const chunk = part.trim();
    if (!chunk) continue;
    const rangeMatch = chunk.match(/^(\d+)\s*-\s*(\d+)$/);
    const singleMatch = chunk.match(/^(\d+)$/);
    if (rangeMatch) {
      let start = parseInt(rangeMatch[1], 10);
      let end = parseInt(rangeMatch[2], 10);
      if (start > end) [start, end] = [end, start];
      for (let p = start; p <= end; p++) {
        if (p >= 1 && p <= max) pages.add(p);
      }
    } else if (singleMatch) {
      const p = parseInt(singleMatch[1], 10);
      if (p >= 1 && p <= max) pages.add(p);
    } else {
      throw new Error(`Invalid range: "${chunk}"`);
    }
  }
  return Array.from(pages).sort((a, b) => a - b);
}

export function PdfSplit() {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [ranges, setRanges] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  const onFiles = useCallback(async (files: File[]) => {
    const pdf = files.find(
      (f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")
    );
    if (!pdf) {
      setError("Please choose a PDF file.");
      return;
    }
    setError(null);
    try {
      const bytes = await pdf.arrayBuffer();
      const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const count = doc.getPageCount();
      setLoaded({ file: pdf, pageCount: count });
      setRanges(`1-${count}`);
    } catch {
      setError("Couldn't read that PDF. It may be corrupted.");
    }
  }, []);

  const selectedPages = useMemo(() => {
    if (!loaded) return { pages: [] as number[], error: null as string | null };
    try {
      return { pages: parseRanges(ranges, loaded.pageCount), error: null };
    } catch (err) {
      return {
        pages: [] as number[],
        error: err instanceof Error ? err.message : "Invalid range",
      };
    }
  }, [ranges, loaded]);

  const invalidate = () =>
    setResultUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });

  const extract = useCallback(async () => {
    if (!loaded) return;
    if (selectedPages.pages.length === 0) {
      setError("Select at least one valid page.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const bytes = await loaded.file.arrayBuffer();
      const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const out = await PDFDocument.create();
      const indices = selectedPages.pages.map((p) => p - 1);
      const copied = await out.copyPages(src, indices);
      copied.forEach((p) => out.addPage(p));
      const outBytes = await out.save();
      const blob = new Blob([outBytes as BlobPart], {
        type: "application/pdf",
      });
      setResultUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(blob);
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong splitting."
      );
    } finally {
      setBusy(false);
    }
  }, [loaded, selectedPages]);

  const reset = () => {
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    setLoaded(null);
    setRanges("");
    setResultUrl(null);
    setError(null);
  };

  useEffect(() => {
    return () => {
      if (resultUrl) URL.revokeObjectURL(resultUrl);
    };
  }, [resultUrl]);

  if (!loaded) {
    return (
      <Dropzone
        accept="application/pdf"
        onFiles={onFiles}
        hint="One PDF · processed in your browser · never uploaded"
      />
    );
  }

  return (
    <div className="space-y-6">
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
          <p className="truncate text-sm font-medium">{loaded.file.name}</p>
          <p className="text-xs text-foreground/50">
            {formatBytes(loaded.file.size)} · {loaded.pageCount} pages
          </p>
        </div>
      </div>

      {/* range input */}
      <div className="rounded-2xl glass p-6">
        <label className="text-sm font-medium">Pages to extract</label>
        <p className="mt-1 text-xs text-foreground/50">
          e.g. <span className="font-mono text-foreground/70">1-3, 5, 8-10</span>{" "}
          — this PDF has {loaded.pageCount} pages.
        </p>
        <input
          value={ranges}
          onChange={(e) => {
            setRanges(e.target.value);
            invalidate();
          }}
          placeholder="1-3, 5, 8-10"
          className="mt-3 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-mono text-sm outline-none focus:border-brand-400/60"
        />
        <div className="mt-3 text-sm">
          {selectedPages.error ? (
            <span className="text-rose-300">{selectedPages.error}</span>
          ) : (
            <span className="text-foreground/60">
              {selectedPages.pages.length} page
              {selectedPages.pages.length === 1 ? "" : "s"} selected
            </span>
          )}
        </div>
      </div>

      {/* actions */}
      <div className="flex flex-col gap-3 sm:flex-row">
        {resultUrl ? (
          <a
            href={resultUrl}
            download={`extracted-${loaded.file.name}`}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-accent-cyan px-6 py-3.5 text-base font-semibold text-white shadow-glow transition-transform hover:scale-[1.02]"
          >
            <Download className="h-5 w-5" /> Download extracted PDF
          </a>
        ) : (
          <button
            onClick={extract}
            disabled={busy || selectedPages.pages.length === 0}
            className={`inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-brand-600 px-6 py-3.5 text-base font-semibold text-white shadow-glow transition-transform hover:scale-[1.02] ${
              busy || selectedPages.pages.length === 0 ? "opacity-60" : ""
            }`}
          >
            {busy ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" /> Extracting…
              </>
            ) : (
              <>
                <Scissors className="h-5 w-5" /> Extract{" "}
                {selectedPages.pages.length} page
                {selectedPages.pages.length === 1 ? "" : "s"}
              </>
            )}
          </button>
        )}
        <button
          onClick={reset}
          className="inline-flex items-center justify-center gap-2 rounded-2xl glass glass-hover px-6 py-3.5 text-base font-semibold"
        >
          <RefreshCw className="h-5 w-5" /> New PDF
        </button>
      </div>
    </div>
  );
}
