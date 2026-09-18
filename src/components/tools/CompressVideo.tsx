"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Download,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Dropzone, formatBytes } from "@/components/Dropzone";
import { loadFfmpeg, fetchFile, ffRun, readBlob } from "@/lib/ffmpeg";

const ACCEPT = "video/*,.mp4,.mov,.webm,.mkv,.avi,.m4v";
const ALLOWED = /\.(mp4|mov|webm|mkv|avi|m4v|ogv|3gp)$/i;

const LEVELS = [
  { id: "strong", label: "Strong", note: "Smallest file · CRF 32", crf: 32 },
  { id: "balanced", label: "Balanced", note: "Great for sharing · CRF 28", crf: 28 },
  { id: "light", label: "Light", note: "Best quality · CRF 23", crf: 23 },
] as const;

export function CompressVideo() {
  const [file, setFile] = useState<File | null>(null);
  const [srcUrl, setSrcUrl] = useState<string | null>(null);
  const [level, setLevel] = useState<string>("balanced");
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<"idle" | "engine" | "working">("idle");
  const [loadPct, setLoadPct] = useState(0);
  const [pct, setPct] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultSize, setResultSize] = useState<number | null>(null);
  const resultRef = useRef<string | null>(null);
  resultRef.current = resultUrl;

  const onFiles = useCallback((files: File[]) => {
    const vid = files.find((f) => ALLOWED.test(f.name) || f.type.startsWith("video/"));
    if (!vid) {
      setError("Please choose a video file (MP4, MOV, WebM, MKV…).");
      return;
    }
    setError(null);
    setResultUrl((p) => (p && URL.revokeObjectURL(p), null));
    setResultSize(null);
    setSrcUrl((p) => {
      if (p) URL.revokeObjectURL(p);
      return URL.createObjectURL(vid);
    });
    setFile(vid);
  }, []);

  const run = useCallback(async () => {
    if (!file) return;
    setBusy(true);
    setError(null);
    setPct(0);
    try {
      setPhase("engine");
      const ff = await loadFfmpeg(setLoadPct);
      setPhase("working");
      const ext = (file.name.match(/\.([a-z0-9]+)$/i)?.[1] || "mp4").toLowerCase();
      const input = `input.${ext}`;
      const output = "output.mp4";
      const crf = LEVELS.find((l) => l.id === level)?.crf ?? 28;
      await ff.writeFile(input, await fetchFile(file));
      await ffRun(
        ff,
        [
          "-i", input,
          "-c:v", "libx264",
          "-crf", String(crf),
          "-preset", "veryfast",
          "-c:a", "aac",
          "-b:a", "128k",
          "-movflags", "+faststart",
          output,
        ],
        setPct
      );
      const blob = await readBlob(ff, output, "video/mp4");
      await ff.deleteFile(input).catch(() => {});
      await ff.deleteFile(output).catch(() => {});
      setResultSize(blob.size);
      setResultUrl((p) => {
        if (p) URL.revokeObjectURL(p);
        return URL.createObjectURL(blob);
      });
    } catch (err) {
      console.error(err);
      setError("Couldn't compress this video. It may be too large for your browser's memory, or in an unsupported codec.");
    } finally {
      setBusy(false);
      setPhase("idle");
    }
  }, [file, level]);

  const reset = () => {
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    if (srcUrl) URL.revokeObjectURL(srcUrl);
    setFile(null);
    setSrcUrl(null);
    setResultUrl(null);
    setResultSize(null);
    setError(null);
  };

  useEffect(() => {
    return () => {
      if (resultRef.current) URL.revokeObjectURL(resultRef.current);
    };
  }, []);

  const downloadName = (file?.name.replace(/\.[^.]+$/, "") || "video") + "-compressed.mp4";
  const saved = file && resultSize != null ? Math.max(0, file.size - resultSize) : 0;
  const savedPct =
    file && resultSize != null && file.size > 0 ? Math.round((saved / file.size) * 100) : 0;

  if (!file) {
    return (
      <div className="space-y-4">
        <PrivacyNotice />
        <Dropzone accept={ACCEPT} onFiles={onFiles} hint="MP4 · MOV · WebM · MKV — up to a few minutes long works best" />
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

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <p className="text-xs font-medium text-foreground/50">Original · {formatBytes(file.size)}</p>
          {srcUrl && (
            /* eslint-disable-next-line jsx-a11y/media-has-caption */
            <video src={srcUrl} controls className="w-full rounded-2xl border border-white/10 bg-black" />
          )}
        </div>
        <div className="space-y-2">
          <p className="text-xs font-medium text-foreground/50">
            {resultUrl ? `Compressed · ${formatBytes(resultSize ?? 0)}` : "Compressed preview"}
          </p>
          {resultUrl ? (
            /* eslint-disable-next-line jsx-a11y/media-has-caption */
            <video src={resultUrl} controls className="w-full rounded-2xl border border-emerald-500/25 bg-black" />
          ) : (
            <div className="flex aspect-video w-full items-center justify-center rounded-2xl border border-dashed border-white/10 text-sm text-foreground/40">
              Runs in your browser
            </div>
          )}
        </div>
      </div>

      {/* level picker */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {LEVELS.map((l) => (
          <button
            key={l.id}
            onClick={() => setLevel(l.id)}
            className={`rounded-2xl border p-4 text-left transition ${
              level === l.id ? "border-brand-400 bg-brand-500/10 shadow-glow" : "border-white/10 hover:bg-white/5"
            }`}
          >
            <p className="text-sm font-semibold">{l.label}</p>
            <p className="mt-0.5 text-xs text-foreground/50">{l.note}</p>
          </button>
        ))}
      </div>

      {resultUrl && resultSize != null && (
        <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4 text-sm text-emerald-100">
          {saved > 0 ? (
            <p>
              Reduced from <b>{formatBytes(file.size)}</b> to <b>{formatBytes(resultSize)}</b> — <b>{savedPct}% smaller</b> 🎉
            </p>
          ) : (
            <p>This video is already compact ({formatBytes(resultSize)}). Try a stronger level for more savings.</p>
          )}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        {resultUrl ? (
          <>
            <a
              href={resultUrl}
              download={downloadName}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-accent-cyan px-6 py-3.5 text-base font-semibold text-white shadow-glow transition-transform hover:scale-[1.02]"
            >
              <Download className="h-5 w-5" /> Download compressed video
            </a>
            <button
              onClick={run}
              disabled={busy}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 px-6 py-3.5 text-sm text-foreground/70 transition hover:bg-white/5"
            >
              <RefreshCw className="h-4 w-4" /> Try another level
            </button>
            <button
              onClick={reset}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 px-6 py-3.5 text-sm text-foreground/70 transition hover:bg-white/5"
            >
              New video
            </button>
          </>
        ) : (
          <button
            onClick={run}
            disabled={busy}
            className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-brand-600 px-6 py-3.5 text-base font-semibold text-white shadow-glow transition-transform hover:scale-[1.02] ${
              busy ? "opacity-70" : ""
            }`}
          >
            {busy ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                {phase === "engine" ? `Loading video engine… ${loadPct}%` : `Compressing… ${pct}%`}
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5" /> Compress video
              </>
            )}
          </button>
        )}
      </div>

      {busy && phase === "engine" && (
        <p className="text-center text-xs text-foreground/40">
          One-time engine download (~32 MB, cached for next time — then it works offline).
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
        Your video is processed entirely in your browser — nothing is ever uploaded.
        No size caps from us, no watermark, no account.
      </p>
    </div>
  );
}
