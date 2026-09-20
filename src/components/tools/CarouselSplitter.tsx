"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Loader2, Minus, Plus, RefreshCw, Scissors } from "lucide-react";
import { Dropzone, formatBytes } from "@/components/Dropzone";

type Ratio = { key: string; label: string; w: number; h: number };

// Instagram carousel slide sizes (portrait 4:5 gives the tallest feed footprint).
const RATIOS: Ratio[] = [
  { key: "4:5", label: "Portrait 4:5", w: 1080, h: 1350 },
  { key: "1:1", label: "Square 1:1", w: 1080, h: 1080 },
];

const MIN_SLIDES = 2;
const MAX_SLIDES = 10;

type Slide = { url: string; blob: Blob; size: number };

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load image."));
    img.src = src;
  });
}

export function CarouselSplitter() {
  const [file, setFile] = useState<File | null>(null);
  const [srcUrl, setSrcUrl] = useState<string | null>(null);
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);
  const [ratio, setRatio] = useState<Ratio>(RATIOS[0]);
  const [slides, setSlides] = useState(3);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Slide[] | null>(null);

  const base = file ? file.name.replace(/\.[^.]+$/, "") || "carousel" : "carousel";

  // strip aspect ratio = the full stitched panorama the N slides represent
  const stripAspect = (slides * ratio.w) / ratio.h;

  const revokeResult = useCallback((list: Slide[] | null) => {
    if (list) list.forEach((s) => URL.revokeObjectURL(s.url));
  }, []);

  const onFiles = useCallback(
    (files: File[]) => {
      const img = files.find((f) => f.type.startsWith("image/"));
      if (!img) {
        setError("Please choose an image file.");
        return;
      }
      setError(null);
      const url = URL.createObjectURL(img);
      setResult((prev) => {
        revokeResult(prev);
        return null;
      });
      setSrcUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
      setFile(img);
      void loadImage(url).then((im) => {
        const w = im.naturalWidth;
        const h = im.naturalHeight;
        setDims({ w, h });
        // suggest a slide count from how wide the image is vs a portrait slide
        const suggested = Math.round((w / h) / (RATIOS[0].w / RATIOS[0].h));
        setSlides(Math.min(MAX_SLIDES, Math.max(MIN_SLIDES, suggested || 3)));
      });
    },
    [revokeResult]
  );

  const generate = useCallback(async () => {
    if (!srcUrl) return;
    setBusy(true);
    setError(null);
    try {
      const img = await loadImage(srcUrl);
      const iw = img.naturalWidth;
      const ih = img.naturalHeight;
      const stripW = slides * ratio.w;
      // cover the whole strip (both dimensions) so no gaps appear at edges
      const scale = Math.max(ratio.h / ih, stripW / iw);
      const dw = iw * scale;
      const dh = ih * scale;
      const offsetX = (stripW - dw) / 2;
      const offsetY = (ratio.h - dh) / 2;

      const out: Slide[] = [];
      for (let i = 0; i < slides; i++) {
        const canvas = document.createElement("canvas");
        canvas.width = ratio.w;
        canvas.height = ratio.h;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas not supported.");
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, ratio.w, ratio.h);
        // shift the full scaled image left so this slide shows its window of the strip
        ctx.drawImage(img, offsetX - i * ratio.w, offsetY, dw, dh);
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, "image/jpeg", 0.92)
        );
        if (!blob) throw new Error("Could not render slide.");
        out.push({ url: URL.createObjectURL(blob), blob, size: blob.size });
      }
      setResult((prev) => {
        revokeResult(prev);
        return out;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }, [srcUrl, slides, ratio, revokeResult]);

  const downloadZip = useCallback(async () => {
    if (!result) return;
    setBusy(true);
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      result.forEach((s, i) => {
        const n = String(i + 1).padStart(2, "0");
        zip.file(`${base}-${n}.jpg`, s.blob);
      });
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(zipBlob);
      a.download = `${base}-carousel.zip`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not build ZIP.");
    } finally {
      setBusy(false);
    }
  }, [result, base]);

  // invalidate a stale render whenever the split settings change
  useEffect(() => {
    setResult((prev) => {
      revokeResult(prev);
      return null;
    });
  }, [slides, ratio, revokeResult]);

  useEffect(() => {
    return () => {
      if (srcUrl) URL.revokeObjectURL(srcUrl);
      revokeResult(result);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reset = () => {
    if (srcUrl) URL.revokeObjectURL(srcUrl);
    revokeResult(result);
    setFile(null);
    setSrcUrl(null);
    setDims(null);
    setResult(null);
    setError(null);
  };

  const guideCells = useMemo(
    () => Array.from({ length: slides }, (_, i) => i),
    [slides]
  );

  if (!file) {
    return (
      <Dropzone
        accept="image/*"
        onFiles={onFiles}
        hint="Drop a wide photo or panorama · split in your browser · never uploaded"
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

      {/* live strip preview with slide guides */}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0a0b16]">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5 text-sm">
          <span className="font-medium">
            {slides} slides · {ratio.w}×{ratio.h} each
          </span>
          <span className="text-foreground/50">
            {dims ? `${dims.w}×${dims.h} source` : formatBytes(file.size)}
          </span>
        </div>
        <div className="relative flex items-center justify-center bg-[repeating-conic-gradient(#111_0_25%,transparent_0_50%)] bg-[length:20px_20px] p-4">
          {busy && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#0a0b16]/70 backdrop-blur-sm">
              <Loader2 className="h-6 w-6 animate-spin text-brand-400" />
            </div>
          )}
          <div
            className="relative w-full overflow-hidden rounded-lg shadow-2xl ring-1 ring-white/10"
            style={{ aspectRatio: `${stripAspect}` }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={srcUrl ?? ""}
              alt="Carousel preview"
              className="h-full w-full object-cover"
            />
            {/* slide dividers + numbers */}
            <div className="pointer-events-none absolute inset-0 flex">
              {guideCells.map((i) => (
                <div
                  key={i}
                  className={`relative flex-1 ${
                    i > 0 ? "border-l-2 border-dashed border-white/70" : ""
                  }`}
                >
                  <span className="absolute left-1.5 top-1.5 rounded-md bg-black/60 px-2 py-0.5 text-xs font-semibold text-white backdrop-blur-sm">
                    {i + 1}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* controls */}
      <div className="rounded-2xl glass p-6">
        {/* slide count */}
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium">Slides</label>
            <p className="text-xs text-foreground/50">Instagram allows up to 10</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSlides((n) => Math.max(MIN_SLIDES, n - 1))}
              disabled={slides <= MIN_SLIDES}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-foreground/80 transition-colors hover:text-foreground disabled:opacity-40"
              aria-label="Fewer slides"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-6 text-center text-lg font-semibold tabular-nums">
              {slides}
            </span>
            <button
              onClick={() => setSlides((n) => Math.min(MAX_SLIDES, n + 1))}
              disabled={slides >= MAX_SLIDES}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-foreground/80 transition-colors hover:text-foreground disabled:opacity-40"
              aria-label="More slides"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* slide shape */}
        <div className="mt-6">
          <label className="text-sm font-medium">Slide shape</label>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {RATIOS.map((r) => (
              <button
                key={r.key}
                onClick={() => setRatio(r)}
                className={`rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                  ratio.key === r.key
                    ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-glow"
                    : "border border-white/10 bg-white/5 text-foreground/70 hover:text-foreground"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* generated slides */}
      {result && (
        <div className="rounded-2xl glass p-6">
          <div className="mb-4 flex items-center justify-between text-sm">
            <span className="font-medium">Your {result.length} slides</span>
            <span className="text-foreground/50">
              {formatBytes(result.reduce((sum, s) => sum + s.size, 0))} total
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
            {result.map((s, i) => (
              <a
                key={i}
                href={s.url}
                download={`${base}-${String(i + 1).padStart(2, "0")}.jpg`}
                className="group relative overflow-hidden rounded-lg ring-1 ring-white/10"
                style={{ aspectRatio: `${ratio.w} / ${ratio.h}` }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={s.url}
                  alt={`Slide ${i + 1}`}
                  className="h-full w-full object-cover"
                />
                <span className="absolute left-1.5 top-1.5 rounded-md bg-black/60 px-1.5 py-0.5 text-[11px] font-semibold text-white">
                  {i + 1}
                </span>
                <span className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                  <Download className="h-5 w-5 text-white" />
                </span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* actions */}
      <div className="flex flex-col gap-3 sm:flex-row">
        {result ? (
          <button
            onClick={() => void downloadZip()}
            disabled={busy}
            className={`inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-3.5 text-base font-semibold text-white shadow-glow transition-transform hover:scale-[1.02] ${
              busy ? "pointer-events-none opacity-60" : ""
            }`}
          >
            <Download className="h-5 w-5" /> Download all ({result.length}) as ZIP
          </button>
        ) : (
          <button
            onClick={() => void generate()}
            disabled={busy}
            className={`inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-3.5 text-base font-semibold text-white shadow-glow transition-transform hover:scale-[1.02] ${
              busy ? "pointer-events-none opacity-60" : ""
            }`}
          >
            {busy ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" /> Splitting…
              </>
            ) : (
              <>
                <Scissors className="h-5 w-5" /> Split into {slides} slides
              </>
            )}
          </button>
        )}

        <button
          onClick={reset}
          disabled={busy}
          className="inline-flex items-center justify-center gap-2 rounded-2xl glass glass-hover px-6 py-3.5 text-base font-semibold disabled:opacity-60"
        >
          <RefreshCw className="h-5 w-5" /> New image
        </button>
      </div>

      <p className="text-center text-xs text-foreground/40">
        Post the slides in order (1 → {slides}) as a carousel. Swiping reveals the full image.
      </p>
    </div>
  );
}
