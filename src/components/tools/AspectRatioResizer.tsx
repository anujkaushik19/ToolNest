"use client";

import { useCallback, useEffect, useState } from "react";
import { Crop, Download, Loader2, RefreshCw, Square } from "lucide-react";
import type { FFmpeg } from "@ffmpeg/ffmpeg";
import { Dropzone, formatBytes } from "@/components/Dropzone";
import { ffRun, fetchFile, loadFfmpeg, readBlob } from "@/lib/ffmpeg";
import { useIsPro } from "@/lib/pro";
import { ProBadge, UpgradePrompt } from "@/components/UpgradeGate";

type Preset = { key: string; label: string; sub: string; w: number; h: number };

// Instagram-recommended pixel sizes (all even → safe for H.264 yuv420p).
const PRESETS: Preset[] = [
  { key: "1:1", label: "Square", sub: "Feed · 1080×1080", w: 1080, h: 1080 },
  { key: "4:5", label: "Portrait", sub: "Feed · 1080×1350", w: 1080, h: 1350 },
  { key: "9:16", label: "Reel / Story", sub: "1080×1920", w: 1080, h: 1920 },
  { key: "1.91:1", label: "Landscape", sub: "Link · 1080×566", w: 1080, h: 566 },
];

type Fit = "crop" | "fit";
type Kind = "image" | "video";
type Result = { url: string; size: number; key: string };

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load image."));
    img.src = src;
  });
}

/** "#rrggbb" → ffmpeg colour literal "0xRRGGBB". */
function hexToFf(hex: string): string {
  return "0x" + hex.replace("#", "").toUpperCase();
}

export function AspectRatioResizer() {
  const isPro = useIsPro();
  const [file, setFile] = useState<File | null>(null);
  const [kind, setKind] = useState<Kind>("image");
  const [srcUrl, setSrcUrl] = useState<string | null>(null);
  const [preset, setPreset] = useState<Preset>(PRESETS[2]); // default 9:16 (Reels)
  const [fit, setFit] = useState<Fit>("crop");
  const [bg, setBg] = useState("#000000");
  const [busy, setBusy] = useState(false);
  const [engineLoad, setEngineLoad] = useState<number | null>(null);
  const [workPct, setWorkPct] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);

  const outExt = kind === "image" ? "jpg" : "mp4";
  const base = file ? file.name.replace(/\.[^.]+$/, "") || "resized" : "resized";

  // ---- image path (canvas) ----
  const renderImage = useCallback(
    async (p: Preset): Promise<Blob> => {
      if (!srcUrl) throw new Error("No image loaded.");
      const img = await loadImage(srcUrl);
      const canvas = document.createElement("canvas");
      canvas.width = p.w;
      canvas.height = p.h;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas not supported.");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, p.w, p.h);
      const iw = img.naturalWidth;
      const ih = img.naturalHeight;
      const scale =
        fit === "crop"
          ? Math.max(p.w / iw, p.h / ih)
          : Math.min(p.w / iw, p.h / ih);
      const dw = iw * scale;
      const dh = ih * scale;
      ctx.drawImage(img, (p.w - dw) / 2, (p.h - dh) / 2, dw, dh);
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.92)
      );
      if (!blob) throw new Error("Could not render image.");
      return blob;
    },
    [srcUrl, bg, fit]
  );

  // ---- video path (ffmpeg) ----
  const renderVideo = useCallback(
    async (p: Preset, ff: FFmpeg): Promise<Blob> => {
      if (!file) throw new Error("No video loaded.");
      const inName = "in" + (file.name.match(/\.[^.]+$/)?.[0] || ".mp4");
      await ff.writeFile(inName, await fetchFile(file));
      const vf =
        fit === "crop"
          ? `scale=${p.w}:${p.h}:force_original_aspect_ratio=increase,crop=${p.w}:${p.h}`
          : `scale=${p.w}:${p.h}:force_original_aspect_ratio=decrease,pad=${p.w}:${p.h}:(ow-iw)/2:(oh-ih)/2:color=${hexToFf(bg)}`;
      await ffRun(
        ff,
        [
          "-i",
          inName,
          "-vf",
          vf,
          "-c:v",
          "libx264",
          "-preset",
          "veryfast",
          "-crf",
          "23",
          "-pix_fmt",
          "yuv420p",
          "-movflags",
          "+faststart",
          "-c:a",
          "aac",
          "-b:a",
          "128k",
          "-y",
          "out.mp4",
        ],
        setWorkPct
      );
      return readBlob(ff, "out.mp4", "video/mp4");
    },
    [file, fit, bg]
  );

  const processOne = useCallback(
    async (p: Preset) => {
      setBusy(true);
      setError(null);
      setWorkPct(null);
      try {
        let blob: Blob;
        if (kind === "image") {
          blob = await renderImage(p);
        } else {
          const ff = await loadFfmpeg(setEngineLoad);
          blob = await renderVideo(p, ff);
        }
        setResult((prev) => {
          if (prev) URL.revokeObjectURL(prev.url);
          return { url: URL.createObjectURL(blob), size: blob.size, key: p.key };
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      } finally {
        setBusy(false);
        setWorkPct(null);
        setEngineLoad(null);
      }
    },
    [kind, renderImage, renderVideo]
  );

  const processAll = useCallback(async () => {
    if (!isPro) {
      setShowUpgrade(true);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      const ff = kind === "video" ? await loadFfmpeg(setEngineLoad) : null;
      for (const p of PRESETS) {
        const blob =
          kind === "image" ? await renderImage(p) : await renderVideo(p, ff!);
        zip.file(`${base}-${p.key.replace(":", "x")}.${outExt}`, blob);
      }
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(zipBlob);
      a.download = `${base}-all-sizes.zip`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not export sizes.");
    } finally {
      setBusy(false);
      setWorkPct(null);
      setEngineLoad(null);
    }
  }, [isPro, kind, renderImage, renderVideo, base, outExt]);

  const onFiles = useCallback(
    (files: File[]) => {
      const f = files.find(
        (x) => x.type.startsWith("image/") || x.type.startsWith("video/")
      );
      if (!f) {
        setError("Please choose an image or video file.");
        return;
      }
      setError(null);
      setShowUpgrade(false);
      setResult((prev) => {
        if (prev) URL.revokeObjectURL(prev.url);
        return null;
      });
      setSrcUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(f);
      });
      setKind(f.type.startsWith("video/") ? "video" : "image");
      setFile(f);
    },
    []
  );

  useEffect(() => {
    return () => {
      if (srcUrl) URL.revokeObjectURL(srcUrl);
      if (result) URL.revokeObjectURL(result.url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reset = () => {
    if (srcUrl) URL.revokeObjectURL(srcUrl);
    if (result) URL.revokeObjectURL(result.url);
    setFile(null);
    setSrcUrl(null);
    setResult(null);
    setError(null);
    setShowUpgrade(false);
  };

  if (!file) {
    return (
      <Dropzone
        accept="image/*,video/*"
        onFiles={onFiles}
        hint="Photo or video · resized in your browser · never uploaded"
      />
    );
  }

  const previewUrl = srcUrl ?? "";
  const portrait = preset.h >= preset.w;
  const objectFit = fit === "crop" ? "object-cover" : "object-contain";

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      )}

      {/* preview */}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0a0b16]">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5 text-sm">
          <span className="font-medium">
            {preset.label} · {preset.w}×{preset.h}
          </span>
          <span className="text-foreground/50">
            {result && result.key === preset.key
              ? formatBytes(result.size)
              : formatBytes(file.size)}
          </span>
        </div>
        <div className="relative flex h-80 items-center justify-center bg-[repeating-conic-gradient(#111_0_25%,transparent_0_50%)] bg-[length:20px_20px] p-4">
          {busy && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-[#0a0b16]/70 backdrop-blur-sm">
              <Loader2 className="h-6 w-6 animate-spin text-brand-400" />
              <span className="text-xs text-foreground/70">
                {engineLoad !== null && engineLoad < 100
                  ? `Loading engine… ${engineLoad}%`
                  : workPct !== null
                  ? `Working… ${workPct}%`
                  : "Working…"}
              </span>
            </div>
          )}
          {/* live frame — snaps to the selected aspect ratio */}
          <div
            className={`relative overflow-hidden rounded-lg shadow-2xl ring-1 ring-white/10 transition-all duration-300 ${
              portrait ? "h-full w-auto" : "w-full h-auto"
            } max-h-full max-w-full`}
            style={{
              aspectRatio: `${preset.w} / ${preset.h}`,
              backgroundColor: fit === "fit" ? bg : "#000",
            }}
          >
            {kind === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt="Preview"
                className={`h-full w-full ${objectFit}`}
              />
            ) : (
              <video
                src={previewUrl}
                controls
                className={`h-full w-full ${objectFit}`}
              />
            )}
          </div>
        </div>
      </div>

      {/* ratio presets */}
      <div className="rounded-2xl glass p-6">
        <label className="text-sm font-medium">Target size</label>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPreset(p)}
              className={`rounded-xl px-3 py-3 text-left transition-all ${
                preset.key === p.key
                  ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-glow"
                  : "border border-white/10 bg-white/5 text-foreground/70 hover:text-foreground"
              }`}
            >
              <span className="block text-sm font-semibold">{p.label}</span>
              <span className="block text-[11px] opacity-80">{p.sub}</span>
            </button>
          ))}
        </div>

        {/* fit mode */}
        <div className="mt-6 grid grid-cols-2 gap-2">
          <button
            onClick={() => setFit("crop")}
            className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
              fit === "crop"
                ? "bg-white/10 text-foreground ring-1 ring-white/20"
                : "border border-white/10 bg-white/5 text-foreground/60 hover:text-foreground"
            }`}
          >
            <Crop className="h-4 w-4" /> Crop to fill
          </button>
          <button
            onClick={() => setFit("fit")}
            className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
              fit === "fit"
                ? "bg-white/10 text-foreground ring-1 ring-white/20"
                : "border border-white/10 bg-white/5 text-foreground/60 hover:text-foreground"
            }`}
          >
            <Square className="h-4 w-4" /> Fit with padding
          </button>
        </div>

        {fit === "fit" && (
          <div className="mt-4 flex items-center gap-3 text-sm">
            <label className="font-medium">Padding colour</label>
            <input
              type="color"
              value={bg}
              onChange={(e) => setBg(e.target.value)}
              className="h-8 w-12 cursor-pointer rounded border border-white/10 bg-transparent"
            />
            <span className="text-foreground/50">{bg}</span>
          </div>
        )}
      </div>

      {showUpgrade && <UpgradePrompt feature="Export all sizes" />}

      {/* actions */}
      <div className="flex flex-col gap-3 sm:flex-row">
        {result && result.key === preset.key ? (
          <a
            href={result.url}
            download={`${base}-${preset.key.replace(":", "x")}.${outExt}`}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-3.5 text-base font-semibold text-white shadow-glow transition-transform hover:scale-[1.02]"
          >
            <Download className="h-5 w-5" /> Download {preset.key}
          </a>
        ) : (
          <button
            onClick={() => void processOne(preset)}
            disabled={busy}
            className={`inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-3.5 text-base font-semibold text-white shadow-glow transition-transform hover:scale-[1.02] ${
              busy ? "pointer-events-none opacity-60" : ""
            }`}
          >
            {busy ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" /> Resizing…
              </>
            ) : (
              <>
                <Crop className="h-5 w-5" /> Resize to {preset.key}
              </>
            )}
          </button>
        )}

        <button
          onClick={() => void processAll()}
          disabled={busy}
          className="relative inline-flex items-center justify-center gap-2 rounded-2xl glass glass-hover px-6 py-3.5 text-base font-semibold disabled:opacity-60"
        >
          Export all sizes
          <ProBadge />
        </button>

        <button
          onClick={reset}
          disabled={busy}
          className="inline-flex items-center justify-center gap-2 rounded-2xl glass glass-hover px-6 py-3.5 text-base font-semibold disabled:opacity-60"
        >
          <RefreshCw className="h-5 w-5" /> New file
        </button>
      </div>
    </div>
  );
}
