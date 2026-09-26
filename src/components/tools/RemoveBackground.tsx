"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Download,
  ImageIcon,
  Loader2,
  Package,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { Dropzone } from "@/components/Dropzone";

const ACCEPT = "image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp";
const ALLOWED = /\.(png|jpe?g|webp)$/i;

const SWATCHES = ["#ffffff", "#000000", "#f1f5f9", "#2563eb", "#10b981", "#f43f5e"];

type Status = "pending" | "processing" | "done" | "error";
type Item = {
  id: string;
  file: File;
  origUrl: string;
  cutoutUrl?: string; // transparent PNG
  composedUrl?: string; // cut-out on chosen background
  status: Status;
  error?: string;
};

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

export function RemoveBackground() {
  const [items, setItems] = useState<Item[]>([]);
  const [bgMode, setBgMode] = useState<"transparent" | "color" | "image">("transparent");
  const [bgColor, setBgColor] = useState("#ffffff");
  const [bgImageUrl, setBgImageUrl] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<"idle" | "model" | "processing">("idle");
  const [modelPct, setModelPct] = useState(0);
  const [doneCount, setDoneCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const itemsRef = useRef<Item[]>([]);
  itemsRef.current = items;

  const addFiles = useCallback((files: File[]) => {
    const imgs = files.filter((f) => ALLOWED.test(f.name) || f.type.startsWith("image/"));
    if (!imgs.length) {
      setError("Please choose PNG, JPG or WebP images.");
      return;
    }
    setError(null);
    setItems((prev) => [
      ...prev,
      ...imgs.map((file) => ({
        id: Math.random().toString(36).slice(2),
        file,
        origUrl: URL.createObjectURL(file),
        status: "pending" as Status,
      })),
    ]);
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => {
      const it = prev.find((p) => p.id === id);
      if (it) {
        URL.revokeObjectURL(it.origUrl);
        if (it.cutoutUrl) URL.revokeObjectURL(it.cutoutUrl);
        if (it.composedUrl) URL.revokeObjectURL(it.composedUrl);
      }
      return prev.filter((p) => p.id !== id);
    });
  }, []);

  const run = useCallback(async () => {
    const pending = itemsRef.current.filter((i) => i.status === "pending");
    if (!pending.length) return;
    setBusy(true);
    setError(null);
    setDoneCount(0);
    try {
      const { removeBackground } = await import("@imgly/background-removal");
      const device =
        typeof navigator !== "undefined" && "gpu" in navigator ? "gpu" : "cpu";

      let processed = 0;
      for (const item of pending) {
        setPhase(processed === 0 ? "model" : "processing");
        setItems((prev) =>
          prev.map((p) => (p.id === item.id ? { ...p, status: "processing" } : p))
        );
        try {
          const blob = await removeBackground(item.file, {
            device,
            model: "isnet_fp16",
            output: { format: "image/png" },
            progress: (key: string, current: number, total: number) => {
              if (key.startsWith("fetch")) {
                setPhase("model");
                setModelPct(total > 0 ? Math.round((current / total) * 100) : 0);
              } else {
                setPhase("processing");
              }
            },
          });
          const cutoutUrl = URL.createObjectURL(blob);
          setItems((prev) =>
            prev.map((p) => (p.id === item.id ? { ...p, status: "done", cutoutUrl } : p))
          );
        } catch {
          setItems((prev) =>
            prev.map((p) =>
              p.id === item.id ? { ...p, status: "error", error: "Failed" } : p
            )
          );
        }
        processed += 1;
        setDoneCount(processed);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? `Couldn't load the AI model (${err.message}).`
          : "Couldn't load the AI model."
      );
    } finally {
      setPhase("idle");
      setBusy(false);
    }
  }, []);

  // Recompose every finished cut-out whenever the background choice changes.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const bgImg =
        bgMode === "image" && bgImageUrl ? await loadImage(bgImageUrl) : null;
      for (const it of itemsRef.current) {
        if (!it.cutoutUrl) continue;
        const fg = await loadImage(it.cutoutUrl);
        const canvas = document.createElement("canvas");
        canvas.width = fg.naturalWidth;
        canvas.height = fg.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) continue;
        if (bgMode === "color") {
          ctx.fillStyle = bgColor;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        } else if (bgImg) {
          const s = Math.max(
            canvas.width / bgImg.naturalWidth,
            canvas.height / bgImg.naturalHeight
          );
          const w = bgImg.naturalWidth * s;
          const h = bgImg.naturalHeight * s;
          ctx.drawImage(bgImg, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
        }
        ctx.drawImage(fg, 0, 0);
        const url: string = await new Promise((res) =>
          canvas.toBlob((b) => res(URL.createObjectURL(b!)), "image/png")
        );
        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }
        setItems((prev) =>
          prev.map((p) => {
            if (p.id !== it.id) return p;
            if (p.composedUrl) URL.revokeObjectURL(p.composedUrl);
            return { ...p, composedUrl: url };
          })
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bgMode, bgColor, bgImageUrl, doneCount]);

  const onBgImage = useCallback((files: File[]) => {
    const img = files.find((f) => f.type.startsWith("image/"));
    if (!img) return;
    setBgImageUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(img);
    });
    setBgMode("image");
  }, []);

  const downloadAll = useCallback(async () => {
    const done = itemsRef.current.filter((i) => i.status === "done");
    if (!done.length) return;
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    for (const it of done) {
      const url = it.composedUrl ?? it.cutoutUrl!;
      const blob = await (await fetch(url)).blob();
      const base = it.file.name.replace(/\.[^.]+$/, "") || "image";
      zip.file(`${base}-nobg.png`, blob);
    }
    const out = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(out);
    const a = document.createElement("a");
    a.href = url;
    a.download = "biznest-backgrounds-removed.zip";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, []);

  const reset = () => {
    itemsRef.current.forEach((it) => {
      URL.revokeObjectURL(it.origUrl);
      if (it.cutoutUrl) URL.revokeObjectURL(it.cutoutUrl);
      if (it.composedUrl) URL.revokeObjectURL(it.composedUrl);
    });
    if (bgImageUrl) URL.revokeObjectURL(bgImageUrl);
    setItems([]);
    setBgImageUrl(null);
    setBgMode("transparent");
    setError(null);
    setDoneCount(0);
  };

  useEffect(() => {
    return () => {
      itemsRef.current.forEach((it) => {
        URL.revokeObjectURL(it.origUrl);
        if (it.cutoutUrl) URL.revokeObjectURL(it.cutoutUrl);
        if (it.composedUrl) URL.revokeObjectURL(it.composedUrl);
      });
    };
  }, []);

  const anyDone = items.some((i) => i.status === "done");
  const anyPending = items.some((i) => i.status === "pending");
  const pendingCount = items.filter((i) => i.status === "pending").length;
  const doneTotal = items.filter((i) => i.status === "done").length;

  if (items.length === 0) {
    return (
      <div className="space-y-4">
        <PrivacyNotice />
        <Dropzone
          accept={ACCEPT}
          multiple
          onFiles={addFiles}
          hint="Drop one or many images · PNG · JPG · WebP"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PrivacyNotice />

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      )}

      {/* background options */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl glass p-4">
        <span className="text-sm text-foreground/60">Background:</span>
        <button
          onClick={() => setBgMode("transparent")}
          className={`rounded-xl px-3 py-1.5 text-sm transition ${
            bgMode === "transparent" ? "bg-white/15 ring-1 ring-white/20" : "hover:bg-white/5"
          }`}
        >
          Transparent
        </button>
        <div className="flex items-center gap-2">
          {SWATCHES.map((c) => (
            <button
              key={c}
              onClick={() => {
                setBgColor(c);
                setBgMode("color");
              }}
              title={c}
              className={`h-7 w-7 rounded-full ring-2 transition ${
                bgMode === "color" && bgColor === c ? "ring-white" : "ring-white/20 hover:ring-white/50"
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
          <label className="relative h-7 w-7 cursor-pointer overflow-hidden rounded-full ring-2 ring-white/20">
            <input
              type="color"
              value={bgColor}
              onChange={(e) => {
                setBgColor(e.target.value);
                setBgMode("color");
              }}
              className="absolute inset-0 h-10 w-10 -translate-x-1 -translate-y-1 cursor-pointer"
            />
          </label>
        </div>
        <label
          className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl border px-3 py-1.5 text-sm transition ${
            bgMode === "image" ? "border-brand-400 bg-brand-500/10" : "border-white/10 hover:bg-white/5"
          }`}
        >
          <ImageIcon className="h-4 w-4" />
          {bgImageUrl ? "Change photo" : "Photo background"}
          <input
            type="file"
            accept={ACCEPT}
            className="hidden"
            onChange={(e) => onBgImage(Array.from(e.target.files ?? []))}
          />
        </label>
      </div>

      {/* results grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {items.map((it) => (
          <div key={it.id} className="group relative overflow-hidden rounded-2xl glass p-2">
            <div className="checker relative aspect-square overflow-hidden rounded-xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={it.composedUrl ?? it.cutoutUrl ?? it.origUrl}
                alt={it.file.name}
                className="h-full w-full object-contain"
              />
              {it.status === "processing" && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <Loader2 className="h-6 w-6 animate-spin text-white" />
                </div>
              )}
              {it.status === "error" && (
                <div className="absolute inset-0 flex items-center justify-center bg-rose-900/50 text-xs text-rose-100">
                  Failed
                </div>
              )}
              <button
                onClick={() => removeItem(it.id)}
                className="absolute right-1.5 top-1.5 rounded-full bg-black/50 p-1 text-white opacity-0 transition group-hover:opacity-100"
                aria-label="Remove"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <p className="min-w-0 flex-1 truncate text-xs text-foreground/60">{it.file.name}</p>
              {it.status === "done" && (
                <a
                  href={it.composedUrl ?? it.cutoutUrl}
                  download={(it.file.name.replace(/\.[^.]+$/, "") || "image") + "-nobg.png"}
                  className="text-brand-300 hover:text-brand-200"
                  aria-label="Download"
                >
                  <Download className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      <label className="inline-flex cursor-pointer items-center gap-1.5 text-sm text-foreground/60 hover:text-foreground">
        <input
          type="file"
          accept={ACCEPT}
          multiple
          className="hidden"
          onChange={(e) => addFiles(Array.from(e.target.files ?? []))}
        />
        + Add more images
      </label>

      {/* actions */}
      <div className="flex flex-col gap-3 sm:flex-row">
        {anyPending && (
          <button
            onClick={run}
            disabled={busy}
            className={`inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-brand-600 px-6 py-3.5 text-base font-semibold text-white shadow-glow transition-transform hover:scale-[1.02] ${
              busy ? "opacity-70" : ""
            }`}
          >
            {busy ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                {phase === "model"
                  ? `Downloading AI model… ${modelPct}%`
                  : `Removing… ${doneCount}/${pendingCount || doneCount}`}
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5" /> Remove background
                {items.length > 1 ? ` (${pendingCount})` : ""}
              </>
            )}
          </button>
        )}
        {anyDone && (
          <>
            <button
              onClick={downloadAll}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-accent-cyan px-6 py-3.5 text-base font-semibold text-white shadow-glow transition-transform hover:scale-[1.02]"
            >
              {doneTotal > 1 ? (
                <>
                  <Package className="h-5 w-5" /> Download all (ZIP)
                </>
              ) : (
                <>
                  <Download className="h-5 w-5" /> Download PNG
                </>
              )}
            </button>
            <button
              onClick={reset}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 px-6 py-3.5 text-sm text-foreground/70 transition hover:bg-white/5"
            >
              <RefreshCw className="h-4 w-4" /> Start over
            </button>
          </>
        )}
      </div>

      {busy && phase === "model" && (
        <p className="text-center text-xs text-foreground/40">
          One-time model download (cached for next time — then it works offline).
        </p>
      )}
    </div>
  );
}

function PrivacyNotice() {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100/90">
      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
      <p>
        The AI runs entirely in your browser — your images are never uploaded.
        Unlimited, full-resolution, no watermark, no account.
      </p>
    </div>
  );
}
