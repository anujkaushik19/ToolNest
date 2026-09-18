"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Download, Loader2, Music, RefreshCw, ShieldCheck } from "lucide-react";
import { Dropzone, formatBytes } from "@/components/Dropzone";
import { loadFfmpeg, fetchFile, ffRun, readBlob } from "@/lib/ffmpeg";

const ACCEPT = "video/*,audio/*,.mp4,.mov,.webm,.mkv,.avi,.m4v";
const ALLOWED = /\.(mp4|mov|webm|mkv|avi|m4v|ogv|3gp|m4a|aac|mp3|wav|flac|ogg)$/i;

const FORMATS = [
  { id: "mp3", label: "MP3", note: "Universal · compact", ext: "mp3", mime: "audio/mpeg", args: ["-c:a", "libmp3lame", "-q:a", "2"] },
  { id: "m4a", label: "M4A (AAC)", note: "High quality · small", ext: "m4a", mime: "audio/mp4", args: ["-c:a", "aac", "-b:a", "192k"] },
  { id: "wav", label: "WAV", note: "Lossless · large", ext: "wav", mime: "audio/wav", args: ["-c:a", "pcm_s16le"] },
] as const;

export function ExtractAudio() {
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<string>("mp3");
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
    const vid = files.find(
      (f) => ALLOWED.test(f.name) || f.type.startsWith("video/") || f.type.startsWith("audio/")
    );
    if (!vid) {
      setError("Please choose a video or audio file.");
      return;
    }
    setError(null);
    setResultUrl((p) => (p && URL.revokeObjectURL(p), null));
    setResultSize(null);
    setFile(vid);
  }, []);

  const run = useCallback(async () => {
    if (!file) return;
    const fmt = FORMATS.find((f) => f.id === format) ?? FORMATS[0];
    setBusy(true);
    setError(null);
    setPct(0);
    try {
      setPhase("engine");
      const ff = await loadFfmpeg(setLoadPct);
      setPhase("working");
      const inExt = (file.name.match(/\.([a-z0-9]+)$/i)?.[1] || "mp4").toLowerCase();
      const input = `input.${inExt}`;
      const output = `output.${fmt.ext}`;
      await ff.writeFile(input, await fetchFile(file));
      await ffRun(ff, ["-i", input, "-vn", ...fmt.args, output], setPct);
      const blob = await readBlob(ff, output, fmt.mime);
      await ff.deleteFile(input).catch(() => {});
      await ff.deleteFile(output).catch(() => {});
      setResultSize(blob.size);
      setResultUrl((p) => {
        if (p) URL.revokeObjectURL(p);
        return URL.createObjectURL(blob);
      });
    } catch (err) {
      console.error(err);
      setError("Couldn't extract audio from this file. It may not contain an audio track.");
    } finally {
      setBusy(false);
      setPhase("idle");
    }
  }, [file, format]);

  const reset = () => {
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    setFile(null);
    setResultUrl(null);
    setResultSize(null);
    setError(null);
  };

  useEffect(() => {
    return () => {
      if (resultRef.current) URL.revokeObjectURL(resultRef.current);
    };
  }, []);

  const fmt = FORMATS.find((f) => f.id === format) ?? FORMATS[0];
  const downloadName = (file?.name.replace(/\.[^.]+$/, "") || "audio") + `.${fmt.ext}`;

  if (!file) {
    return (
      <div className="space-y-4">
        <PrivacyNotice />
        <Dropzone accept={ACCEPT} onFiles={onFiles} hint="Pull the soundtrack out of any video — MP3, M4A or WAV" />
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

      <div className="flex items-center gap-3 rounded-2xl glass p-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-purple-500">
          <Music className="h-5 w-5 text-white" />
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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {FORMATS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFormat(f.id)}
            className={`rounded-2xl border p-4 text-left transition ${
              format === f.id ? "border-brand-400 bg-brand-500/10 shadow-glow" : "border-white/10 hover:bg-white/5"
            }`}
          >
            <p className="text-sm font-semibold">{f.label}</p>
            <p className="mt-0.5 text-xs text-foreground/50">{f.note}</p>
          </button>
        ))}
      </div>

      {resultUrl && (
        <div className="space-y-2 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4">
          <p className="text-sm text-emerald-100">
            Extracted <b>{fmt.label}</b> · {formatBytes(resultSize ?? 0)}
          </p>
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <audio src={resultUrl} controls className="w-full" />
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
              <Download className="h-5 w-5" /> Download {fmt.label}
            </a>
            <button
              onClick={run}
              disabled={busy}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 px-6 py-3.5 text-sm text-foreground/70 transition hover:bg-white/5"
            >
              <RefreshCw className="h-4 w-4" /> Try another format
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
                {phase === "engine" ? `Loading engine… ${loadPct}%` : `Extracting… ${pct}%`}
              </>
            ) : (
              <>
                <Music className="h-5 w-5" /> Extract audio
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
        Audio is extracted in your browser — your file never leaves your device.
        No watermark, no account.
      </p>
    </div>
  );
}
