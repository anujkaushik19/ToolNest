"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, Loader2, RefreshCw } from "lucide-react";
import { Dropzone, formatBytes } from "@/components/Dropzone";

type Format = "image/png" | "image/jpeg" | "image/webp";

const formatOptions: { value: Format; label: string; ext: string; lossy: boolean }[] = [
  { value: "image/png", label: "PNG", ext: "png", lossy: false },
  { value: "image/jpeg", label: "JPG", ext: "jpg", lossy: true },
  { value: "image/webp", label: "WebP", ext: "webp", lossy: true },
];

type Result = {
  url: string;
  size: number;
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load image."));
    img.src = src;
  });
}

export function ImageConvert() {
  const [file, setFile] = useState<File | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [format, setFormat] = useState<Format>("image/png");
  const [quality, setQuality] = useState(0.9);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  const activeOption = formatOptions.find((o) => o.value === format)!;

  const convert = useCallback(
    async (src: string, target: Format, q: number) => {
      setBusy(true);
      setError(null);
      try {
        const img = await loadImage(src);
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas not supported.");
        // JPEG has no alpha — paint a white background.
        if (target === "image/jpeg") {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        ctx.drawImage(img, 0, 0);
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, target, q)
        );
        if (!blob) throw new Error("Conversion failed.");
        setResult((prev) => {
          if (prev) URL.revokeObjectURL(prev.url);
          return { url: URL.createObjectURL(blob), size: blob.size };
        });
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Something went wrong converting."
        );
      } finally {
        setBusy(false);
      }
    },
    []
  );

  const onFiles = useCallback(
    (files: File[]) => {
      const img = files.find((f) => f.type.startsWith("image/"));
      if (!img) {
        setError("Please choose an image file.");
        return;
      }
      const url = URL.createObjectURL(img);
      setFile(img);
      setSourceUrl(url);
      void convert(url, format, quality);
    },
    [convert, format, quality]
  );

  // reconvert when settings change
  useEffect(() => {
    if (!sourceUrl) return;
    const id = setTimeout(() => void convert(sourceUrl, format, quality), 200);
    return () => clearTimeout(id);
  }, [format, quality, sourceUrl, convert]);

  useEffect(() => {
    return () => {
      if (sourceUrl) URL.revokeObjectURL(sourceUrl);
      if (result) URL.revokeObjectURL(result.url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reset = () => {
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    if (result) URL.revokeObjectURL(result.url);
    setFile(null);
    setSourceUrl(null);
    setResult(null);
    setError(null);
  };

  const downloadName = file
    ? `${file.name.replace(/\.[^.]+$/, "")}.${activeOption.ext}`
    : `converted.${activeOption.ext}`;

  if (!file) {
    return (
      <Dropzone
        accept="image/*"
        onFiles={onFiles}
        hint="JPG, PNG, WebP, GIF, HEIC · converted in your browser · never uploaded"
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

      {/* preview */}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0a0b16]">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5 text-sm">
          <span className="font-medium">Preview</span>
          <span className="text-foreground/50">
            {result ? formatBytes(result.size) : formatBytes(file.size)}
          </span>
        </div>
        <div className="relative flex h-64 items-center justify-center">
          {busy && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#0a0b16]/60 backdrop-blur-sm">
              <Loader2 className="h-6 w-6 animate-spin text-brand-400" />
            </div>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={result?.url ?? sourceUrl ?? ""}
            alt="Preview"
            className="max-h-full max-w-full object-contain"
          />
        </div>
      </div>

      {/* format selector */}
      <div className="rounded-2xl glass p-6">
        <label className="text-sm font-medium">Convert to</label>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {formatOptions.map((o) => (
            <button
              key={o.value}
              onClick={() => setFormat(o.value)}
              className={`rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                format === o.value
                  ? "bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-glow"
                  : "border border-white/10 bg-white/5 text-foreground/70 hover:text-foreground"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>

        {activeOption.lossy && (
          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between text-sm">
              <label className="font-medium">Quality</label>
              <span className="text-foreground/60">
                {Math.round(quality * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0.1}
              max={1}
              step={0.05}
              value={quality}
              onChange={(e) => setQuality(parseFloat(e.target.value))}
              className="w-full accent-brand-500"
            />
          </div>
        )}
      </div>

      {/* actions */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <a
          href={result?.url}
          download={downloadName}
          aria-disabled={busy || !result}
          className={`inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-brand-600 px-6 py-3.5 text-base font-semibold text-white shadow-glow transition-transform hover:scale-[1.02] ${
            busy || !result ? "pointer-events-none opacity-60" : ""
          }`}
        >
          {busy ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" /> Converting…
            </>
          ) : (
            <>
              <Download className="h-5 w-5" /> Download {activeOption.label}
            </>
          )}
        </a>
        <button
          onClick={reset}
          className="inline-flex items-center justify-center gap-2 rounded-2xl glass glass-hover px-6 py-3.5 text-base font-semibold"
        >
          <RefreshCw className="h-5 w-5" /> New image
        </button>
      </div>
    </div>
  );
}
