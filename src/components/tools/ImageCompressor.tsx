"use client";

import { useCallback, useEffect, useState } from "react";
import imageCompression from "browser-image-compression";
import { Download, Loader2, RefreshCw, ImageDown } from "lucide-react";
import { Dropzone, formatBytes } from "@/components/Dropzone";

type Result = {
  originalUrl: string;
  compressedUrl: string;
  originalSize: number;
  compressedSize: number;
  name: string;
};

export function ImageCompressor() {
  const [file, setFile] = useState<File | null>(null);
  const [quality, setQuality] = useState(0.7);
  const [maxWidth, setMaxWidth] = useState(1920);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  const compress = useCallback(
    async (target: File, q: number, width: number) => {
      setBusy(true);
      setError(null);
      try {
        const compressed = await imageCompression(target, {
          maxSizeMB: 20,
          maxWidthOrHeight: width,
          initialQuality: q,
          useWebWorker: true,
        });
        setResult((prev) => {
          if (prev?.compressedUrl) URL.revokeObjectURL(prev.compressedUrl);
          return {
            originalUrl: prev?.originalUrl ?? URL.createObjectURL(target),
            compressedUrl: URL.createObjectURL(compressed),
            originalSize: target.size,
            compressedSize: compressed.size,
            name: target.name,
          };
        });
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Something went wrong compressing that image."
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
        setError("Please choose an image file (JPG, PNG or WebP).");
        return;
      }
      setFile(img);
      void compress(img, quality, maxWidth);
    },
    [compress, quality, maxWidth]
  );

  // re-run when settings change (debounced)
  useEffect(() => {
    if (!file) return;
    const id = setTimeout(() => void compress(file, quality, maxWidth), 250);
    return () => clearTimeout(id);
  }, [quality, maxWidth, file, compress]);

  // cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      if (result?.originalUrl) URL.revokeObjectURL(result.originalUrl);
      if (result?.compressedUrl) URL.revokeObjectURL(result.compressedUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reset = () => {
    if (result?.originalUrl) URL.revokeObjectURL(result.originalUrl);
    if (result?.compressedUrl) URL.revokeObjectURL(result.compressedUrl);
    setFile(null);
    setResult(null);
    setError(null);
  };

  const savings =
    result && result.originalSize > 0
      ? Math.max(
          0,
          Math.round(
            ((result.originalSize - result.compressedSize) /
              result.originalSize) *
              100
          )
        )
      : 0;

  if (!file) {
    return (
      <Dropzone
        accept="image/*"
        onFiles={onFiles}
        hint="JPG, PNG or WebP · up to 20 MB · never uploaded"
      />
    );
  }

  return (
    <div className="space-y-8">
      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      )}

      {/* preview */}
      <div className="grid gap-5 sm:grid-cols-2">
        <PreviewCard
          label="Original"
          url={result?.originalUrl}
          size={result?.originalSize}
        />
        <PreviewCard
          label="Compressed"
          url={result?.compressedUrl}
          size={result?.compressedSize}
          busy={busy}
          highlight
        />
      </div>

      {/* savings bar */}
      {result && !busy && (
        <div className="rounded-2xl glass p-5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-foreground/60">Size reduced by</span>
            <span className="text-lg font-bold text-emerald-400">
              {savings}%
            </span>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-accent-cyan transition-all duration-500"
              style={{ width: `${100 - savings}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between text-xs text-foreground/50">
            <span>{formatBytes(result.originalSize)}</span>
            <span>{formatBytes(result.compressedSize)}</span>
          </div>
        </div>
      )}

      {/* controls */}
      <div className="space-y-6 rounded-2xl glass p-6">
        <div>
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
        <div>
          <div className="mb-2 flex items-center justify-between text-sm">
            <label className="font-medium">Max width / height</label>
            <span className="text-foreground/60">{maxWidth}px</span>
          </div>
          <input
            type="range"
            min={480}
            max={4096}
            step={160}
            value={maxWidth}
            onChange={(e) => setMaxWidth(parseInt(e.target.value))}
            className="w-full accent-brand-500"
          />
        </div>
      </div>

      {/* actions */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <a
          href={result?.compressedUrl}
          download={result ? `compressed-${result.name}` : undefined}
          aria-disabled={busy || !result}
          className={`inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-brand-600 px-6 py-3.5 text-base font-semibold text-white shadow-glow transition-transform hover:scale-[1.02] ${
            busy || !result ? "pointer-events-none opacity-60" : ""
          }`}
        >
          {busy ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" /> Compressing…
            </>
          ) : (
            <>
              <Download className="h-5 w-5" /> Download compressed
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

function PreviewCard({
  label,
  url,
  size,
  busy,
  highlight,
}: {
  label: string;
  url?: string;
  size?: number;
  busy?: boolean;
  highlight?: boolean;
}) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border ${
        highlight ? "border-brand-400/40" : "border-white/10"
      } bg-white/[0.02]`}
    >
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5 text-sm">
        <span className="font-medium">{label}</span>
        {size !== undefined && (
          <span className="text-foreground/50">{formatBytes(size)}</span>
        )}
      </div>
      <div className="relative flex h-56 items-center justify-center bg-[#0a0b16]">
        {busy && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#0a0b16]/60 backdrop-blur-sm">
            <Loader2 className="h-6 w-6 animate-spin text-brand-400" />
          </div>
        )}
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={label}
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <ImageDown className="h-10 w-10 text-foreground/20" />
        )}
      </div>
    </div>
  );
}
