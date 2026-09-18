"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Download, Loader2, RefreshCw, ShieldCheck, Scissors } from "lucide-react";
import { Dropzone, formatBytes } from "@/components/Dropzone";
import { loadFfmpeg, fetchFile, ffRun, readBlob } from "@/lib/ffmpeg";

const ACCEPT = "video/*,.mp4,.mov,.webm,.mkv,.avi,.m4v";
const ALLOWED = /\.(mp4|mov|webm|mkv|avi|m4v|ogv|3gp)$/i;

const MIME: Record<string, string> = {
  mp4: "video/mp4",
  m4v: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
  mkv: "video/x-matroska",
  avi: "video/x-msvideo",
};

function fmtTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = (s % 60).toFixed(1).padStart(4, "0");
  return `${m}:${sec}`;
}

export function TrimVideo() {
  const [file, setFile] = useState<File | null>(null);
  const [srcUrl, setSrcUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(0);

  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<"idle" | "engine" | "working">("idle");
  const [loadPct, setLoadPct] = useState(0);
  const [pct, setPct] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultSize, setResultSize] = useState<number | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const resultRef = useRef<string | null>(null);
  resultRef.current = resultUrl;

  const ext = (file?.name.match(/\.([a-z0-9]+)$/i)?.[1] || "mp4").toLowerCase();

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

  const onMeta = () => {
    const d = videoRef.current?.duration ?? 0;
    if (!isFinite(d) || d <= 0) return;
    setDuration(d);
    setStart(0);
    setEnd(d);
  };

  const run = useCallback(async () => {
    if (!file) return;
    const dur = Math.max(0.1, end - start);
    setBusy(true);
    setError(null);
    setPct(0);
    try {
      setPhase("engine");
      const ff = await loadFfmpeg(setLoadPct);
      setPhase("working");
      const input = `input.${ext}`;
      const output = `output.${ext}`;
      await ff.writeFile(input, await fetchFile(file));
      await ffRun(
        ff,
        [
          "-ss", String(start),
          "-i", input,
          "-t", String(dur),
          "-c", "copy",
          "-avoid_negative_ts", "make_zero",
          output,
        ],
        setPct
      );
      const blob = await readBlob(ff, output, MIME[ext] || "video/mp4");
      await ff.deleteFile(input).catch(() => {});
      await ff.deleteFile(output).catch(() => {});
      setResultSize(blob.size);
      setResultUrl((p) => {
        if (p) URL.revokeObjectURL(p);
        return URL.createObjectURL(blob);
      });
    } catch (err) {
      console.error(err);
      setError("Couldn't trim this video. Some formats cut only at keyframes — try a slightly different range.");
    } finally {
      setBusy(false);
      setPhase("idle");
    }
  }, [file, start, end, ext]);

  const reset = () => {
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    if (srcUrl) URL.revokeObjectURL(srcUrl);
    setFile(null);
    setSrcUrl(null);
    setResultUrl(null);
    setResultSize(null);
    setError(null);
    setDuration(0);
  };

  useEffect(() => {
    return () => {
      if (resultRef.current) URL.revokeObjectURL(resultRef.current);
    };
  }, []);

  const downloadName = (file?.name.replace(/\.[^.]+$/, "") || "video") + `-trimmed.${ext}`;
  const clipLen = Math.max(0, end - start);

  if (!file) {
    return (
      <div className="space-y-4">
        <PrivacyNotice />
        <Dropzone accept={ACCEPT} onFiles={onFiles} hint="Cut a clip out of any video — fast, no re-encoding" />
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
          <p className="text-xs font-medium text-foreground/50">Source · {formatBytes(file.size)}</p>
          {srcUrl && (
            /* eslint-disable-next-line jsx-a11y/media-has-caption */
            <video
              ref={videoRef}
              src={srcUrl}
              controls
              onLoadedMetadata={onMeta}
              className="w-full rounded-2xl border border-white/10 bg-black"
            />
          )}
        </div>
        <div className="space-y-2">
          <p className="text-xs font-medium text-foreground/50">
            {resultUrl ? `Trimmed · ${formatBytes(resultSize ?? 0)}` : "Trimmed preview"}
          </p>
          {resultUrl ? (
            /* eslint-disable-next-line jsx-a11y/media-has-caption */
            <video src={resultUrl} controls className="w-full rounded-2xl border border-emerald-500/25 bg-black" />
          ) : (
            <div className="flex aspect-video w-full items-center justify-center rounded-2xl border border-dashed border-white/10 text-sm text-foreground/40">
              Set start & end →
            </div>
          )}
        </div>
      </div>

      {duration > 0 && (
        <div className="space-y-4 rounded-2xl glass p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-foreground/60">Keep from</span>
            <span className="text-foreground/50">
              {fmtTime(start)} → {fmtTime(end)} · {clipLen.toFixed(1)}s
            </span>
          </div>
          <label className="block">
            <span className="text-xs text-foreground/50">Start</span>
            <input
              type="range"
              min={0}
              max={duration}
              step={0.1}
              value={start}
              onChange={(e) => {
                const v = Math.min(Number(e.target.value), end - 0.1);
                setStart(v);
                if (videoRef.current) videoRef.current.currentTime = v;
              }}
              className="w-full accent-brand-500"
            />
          </label>
          <label className="block">
            <span className="text-xs text-foreground/50">End</span>
            <input
              type="range"
              min={0}
              max={duration}
              step={0.1}
              value={end}
              onChange={(e) => {
                const v = Math.max(Number(e.target.value), start + 0.1);
                setEnd(v);
                if (videoRef.current) videoRef.current.currentTime = v;
              }}
              className="w-full accent-brand-500"
            />
          </label>
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
              <Download className="h-5 w-5" /> Download clip
            </a>
            <button
              onClick={run}
              disabled={busy}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 px-6 py-3.5 text-sm text-foreground/70 transition hover:bg-white/5"
            >
              <RefreshCw className="h-4 w-4" /> Re-trim
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
            disabled={busy || duration <= 0}
            className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-brand-600 px-6 py-3.5 text-base font-semibold text-white shadow-glow transition-transform hover:scale-[1.02] ${
              busy || duration <= 0 ? "opacity-70" : ""
            }`}
          >
            {busy ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                {phase === "engine" ? `Loading video engine… ${loadPct}%` : `Trimming… ${pct}%`}
              </>
            ) : (
              <>
                <Scissors className="h-5 w-5" /> Trim video
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
        Trimming happens in your browser — your video never leaves your device.
        No watermark, no account.
      </p>
    </div>
  );
}
