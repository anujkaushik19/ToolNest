"use client";

import { useCallback, useEffect, useState } from "react";
import JSZip from "jszip";
import { Download, FileImage, Loader2, RefreshCw } from "lucide-react";
import { Dropzone, formatBytes } from "@/components/Dropzone";

// pdf.js loader (lazy so it never runs on the server)
let pdfjsPromise: Promise<typeof import("pdfjs-dist")> | null = null;
async function getPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import("pdfjs-dist").then((lib) => {
      lib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
      return lib;
    });
  }
  return pdfjsPromise;
}

type Format = "png" | "jpeg";
type PageImage = { page: number; url: string; blob: Blob; w: number; h: number };

const SCALES = [
  { label: "1×", value: 1 },
  { label: "2×", value: 2 },
  { label: "3×", value: 3 },
];

export function PdfToImages() {
  const [file, setFile] = useState<File | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [format, setFormat] = useState<Format>("png");
  const [scale, setScale] = useState(2);
  const [quality, setQuality] = useState(0.92);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [images, setImages] = useState<PageImage[]>([]);
  const [error, setError] = useState<string | null>(null);

  const clearImages = useCallback(() => {
    setImages((prev) => {
      prev.forEach((p) => URL.revokeObjectURL(p.url));
      return [];
    });
  }, []);

  const onFiles = useCallback(
    async (files: File[]) => {
      const pdf = files.find(
        (f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")
      );
      if (!pdf) {
        setError("Please choose a PDF file.");
        return;
      }
      setError(null);
      clearImages();
      try {
        const buf = new Uint8Array(await pdf.arrayBuffer());
        const pdfjs = await getPdfjs();
        const doc = await pdfjs.getDocument({ data: buf }).promise;
        setNumPages(doc.numPages);
        setFile(pdf);
      } catch {
        setError("Couldn't read that PDF. It may be corrupted or password-protected.");
      }
    },
    [clearImages]
  );

  const convert = useCallback(async () => {
    if (!file) return;
    setBusy(true);
    setError(null);
    setProgress(0);
    clearImages();
    try {
      const buf = new Uint8Array(await file.arrayBuffer());
      const pdfjs = await getPdfjs();
      const doc = await pdfjs.getDocument({ data: buf }).promise;
      const mime = format === "png" ? "image/png" : "image/jpeg";
      const out: PageImage[] = [];
      for (let i = 1; i <= doc.numPages; i++) {
        const p = await doc.getPage(i);
        const vp = p.getViewport({ scale });
        const canvas = document.createElement("canvas");
        canvas.width = Math.floor(vp.width);
        canvas.height = Math.floor(vp.height);
        const ctx = canvas.getContext("2d");
        if (!ctx) continue;
        if (format === "jpeg") {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        await p.render({ canvasContext: ctx, viewport: vp }).promise;
        const blob = await new Promise<Blob | null>((res) =>
          canvas.toBlob(res, mime, format === "jpeg" ? quality : undefined)
        );
        if (blob) {
          out.push({
            page: i,
            url: URL.createObjectURL(blob),
            blob,
            w: canvas.width,
            h: canvas.height,
          });
        }
        setProgress(Math.round((i / doc.numPages) * 100));
      }
      setImages(out);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong while converting.");
    } finally {
      setBusy(false);
    }
  }, [file, format, scale, quality, clearImages]);

  const baseName = (file?.name || "document").replace(/\.pdf$/i, "");
  const ext = format === "png" ? "png" : "jpg";

  const downloadZip = useCallback(async () => {
    if (!images.length) return;
    const zip = new JSZip();
    const pad = String(images.length).length;
    images.forEach((img) => {
      const n = String(img.page).padStart(pad, "0");
      zip.file(`${baseName}-page-${n}.${ext}`, img.blob);
    });
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${baseName}-images.zip`;
    a.click();
    URL.revokeObjectURL(url);
  }, [images, baseName, ext]);

  const reset = () => {
    clearImages();
    setFile(null);
    setNumPages(0);
    setError(null);
    setProgress(0);
  };

  useEffect(() => {
    return () => {
      images.forEach((p) => URL.revokeObjectURL(p.url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!file) {
    return (
      <Dropzone
        accept="application/pdf"
        onFiles={onFiles}
        hint="One PDF · rendered to images in your browser · never uploaded"
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
          <FileImage className="h-5 w-5 text-white" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{file.name}</p>
          <p className="text-xs text-foreground/50">
            {formatBytes(file.size)} · {numPages} page{numPages === 1 ? "" : "s"}
          </p>
        </div>
        <button
          onClick={reset}
          className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-sm text-foreground/70 transition hover:bg-white/5"
        >
          <RefreshCw className="h-4 w-4" /> New file
        </button>
      </div>

      {/* options */}
      <div className="grid gap-4 rounded-2xl glass p-6 sm:grid-cols-3">
        <div>
          <label className="text-sm font-medium">Format</label>
          <div className="mt-2 flex gap-2">
            {(["png", "jpeg"] as Format[]).map((f) => (
              <button
                key={f}
                onClick={() => setFormat(f)}
                className={`flex-1 rounded-xl border px-3 py-2 text-sm font-medium transition ${
                  format === f
                    ? "border-brand-400 bg-brand-500/15 text-white"
                    : "border-white/10 text-foreground/70 hover:bg-white/5"
                }`}
              >
                {f === "png" ? "PNG" : "JPG"}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">Resolution</label>
          <div className="mt-2 flex gap-2">
            {SCALES.map((s) => (
              <button
                key={s.value}
                onClick={() => setScale(s.value)}
                className={`flex-1 rounded-xl border px-3 py-2 text-sm font-medium transition ${
                  scale === s.value
                    ? "border-brand-400 bg-brand-500/15 text-white"
                    : "border-white/10 text-foreground/70 hover:bg-white/5"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className={format === "jpeg" ? "" : "opacity-40"}>
          <label className="text-sm font-medium">
            JPG quality · {Math.round(quality * 100)}%
          </label>
          <input
            type="range"
            min={0.4}
            max={1}
            step={0.01}
            value={quality}
            disabled={format !== "jpeg"}
            onChange={(e) => setQuality(parseFloat(e.target.value))}
            className="mt-4 w-full accent-brand-500"
          />
        </div>
      </div>

      {/* action */}
      {images.length === 0 ? (
        <button
          onClick={convert}
          disabled={busy}
          className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-brand-600 px-6 py-3.5 text-base font-semibold text-white shadow-glow transition-transform hover:scale-[1.02] ${
            busy ? "opacity-60" : ""
          }`}
        >
          {busy ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" /> Converting… {progress}%
            </>
          ) : (
            <>
              <FileImage className="h-5 w-5" /> Convert to {ext.toUpperCase()}
            </>
          )}
        </button>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            onClick={downloadZip}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-accent-cyan px-6 py-3.5 text-base font-semibold text-white shadow-glow transition-transform hover:scale-[1.02]"
          >
            <Download className="h-5 w-5" /> Download all ({images.length}) as ZIP
          </button>
          <button
            onClick={convert}
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 px-6 py-3.5 text-sm text-foreground/70 transition hover:bg-white/5"
          >
            <RefreshCw className="h-4 w-4" /> Re-render
          </button>
        </div>
      )}

      {/* preview grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {images.map((img) => (
            <a
              key={img.page}
              href={img.url}
              download={`${baseName}-page-${img.page}.${ext}`}
              className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/5 transition hover:border-brand-400/60"
              title={`Download page ${img.page}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.url}
                alt={`Page ${img.page}`}
                className="h-40 w-full object-contain bg-white/5"
              />
              <div className="flex items-center justify-between px-2 py-1.5 text-xs text-foreground/60">
                <span>Page {img.page}</span>
                <Download className="h-3.5 w-3.5 opacity-0 transition group-hover:opacity-100" />
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
