"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Captions,
  Download,
  Loader2,
  RefreshCw,
  Sparkles,
  Trash2,
  Type,
} from "lucide-react";
import { Dropzone, formatBytes } from "@/components/Dropzone";
import { ffRun, fetchFile, loadFfmpeg, readBlob } from "@/lib/ffmpeg";
import {
  transcribe,
  toSrt,
  type Segment,
  type WhisperModel,
} from "@/lib/whisper";

type StyleId = "highlight" | "outline" | "bold";
type Position = "top" | "center" | "bottom";

const STYLES: Record<
  StyleId,
  { label: string; color: string; box: string | null; stroke: boolean }
> = {
  highlight: { label: "Highlight", color: "#ffffff", box: "#000000", stroke: false },
  outline: { label: "Outline", color: "#ffffff", box: null, stroke: true },
  bold: { label: "Pop", color: "#FEE440", box: null, stroke: true },
};

const FONT = "Arial, Helvetica, sans-serif";

type Stage = "extract" | "download" | "transcribe" | "burn" | null;

function fmt(t: number): string {
  const s = Math.floor(t) % 60;
  const m = Math.floor(t / 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Wrap text to fit a max pixel width on a canvas context. */
function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = test;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  if (typeof ctx.roundRect === "function") {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fill();
  } else {
    ctx.fillRect(x, y, w, h);
  }
}

export function CaptionBurner() {
  const [file, setFile] = useState<File | null>(null);
  const [srcUrl, setSrcUrl] = useState<string | null>(null);
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);
  const [model, setModel] = useState<WhisperModel>("Xenova/whisper-tiny");
  const [segments, setSegments] = useState<Segment[] | null>(null);
  const [styleId, setStyleId] = useState<StyleId>("highlight");
  const [position, setPosition] = useState<Position>("bottom");
  const [fontScale, setFontScale] = useState(6); // % of video height
  const [uppercase, setUppercase] = useState(true);
  const [working, setWorking] = useState(false);
  const [stage, setStage] = useState<Stage>(null);
  const [pct, setPct] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [now, setNow] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [boxH, setBoxH] = useState(0);

  const base = file ? file.name.replace(/\.[^.]+$/, "") || "video" : "video";
  const style = STYLES[styleId];

  // measure the displayed video box so preview captions scale to the export
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setBoxH(el.clientHeight));
    ro.observe(el);
    setBoxH(el.clientHeight);
    return () => ro.disconnect();
  }, [srcUrl, segments]);

  const activeSeg = useMemo(() => {
    if (!segments) return null;
    return segments.find((s) => now >= s.start && now < s.end) ?? null;
  }, [segments, now]);

  const onFiles = useCallback((files: File[]) => {
    const v = files.find((f) => f.type.startsWith("video/"));
    if (!v) {
      setError("Please choose a video file.");
      return;
    }
    setError(null);
    setSegments(null);
    setResultUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setSrcUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(v);
    });
    setFile(v);
  }, []);

  const runTranscribe = useCallback(async () => {
    if (!file) return;
    setWorking(true);
    setError(null);
    setPct(null);
    try {
      setStage("extract");
      const ff = await loadFfmpeg((p) => {
        setStage("download");
        setPct(p);
      });
      const ext = file.name.match(/\.[^.]+$/)?.[0] || ".mp4";
      const inName = `in${ext}`;
      await ff.writeFile(inName, await fetchFile(file));
      setStage("extract");
      setPct(null);
      // 16 kHz mono float PCM — exactly what Whisper expects
      await ffRun(ff, ["-i", inName, "-ar", "16000", "-ac", "1", "-f", "f32le", "-y", "audio.raw"]);
      const raw = (await ff.readFile("audio.raw")) as Uint8Array;
      const audio = new Float32Array(new Uint8Array(raw).buffer);

      setStage("transcribe");
      setPct(null);
      const segs = await transcribe(audio, model, (p) => {
        setStage("download");
        setPct(p);
        if (p >= 100) setStage("transcribe");
      });
      if (!segs.length) {
        setError("No speech detected. Try a video with clear spoken audio.");
        return;
      }
      setSegments(segs);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not transcribe.");
    } finally {
      setWorking(false);
      setStage(null);
      setPct(null);
    }
  }, [file, model]);

  const renderCaptionBlob = useCallback(
    (seg: Segment, w: number, h: number): Promise<Blob> => {
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      const fontPx = Math.round((h * fontScale) / 100);
      ctx.font = `800 ${fontPx}px ${FONT}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      const text = uppercase ? seg.text.toUpperCase() : seg.text;
      const lines = wrapLines(ctx, text, w * 0.86);
      const lineH = fontPx * 1.28;
      const blockH = lines.length * lineH;
      let top =
        position === "top"
          ? h * 0.1
          : position === "center"
          ? (h - blockH) / 2
          : h * 0.86 - blockH;
      top = Math.max(h * 0.04, top);
      const padX = fontPx * 0.4;
      const padY = fontPx * 0.16;

      lines.forEach((line, i) => {
        const y = top + i * lineH;
        const tw = ctx.measureText(line).width;
        if (style.box) {
          ctx.fillStyle = style.box;
          roundRect(
            ctx,
            (w - tw) / 2 - padX,
            y - padY,
            tw + padX * 2,
            fontPx + padY * 2,
            fontPx * 0.18
          );
        }
        if (style.stroke) {
          ctx.lineJoin = "round";
          ctx.lineWidth = fontPx * 0.16;
          ctx.strokeStyle = "#000000";
          ctx.strokeText(line, w / 2, y);
        }
        ctx.fillStyle = style.color;
        ctx.fillText(line, w / 2, y);
      });

      return new Promise((resolve, reject) =>
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("Render failed."))),
          "image/png"
        )
      );
    },
    [fontScale, uppercase, position, style]
  );

  const burn = useCallback(async () => {
    if (!file || !segments || !dims) return;
    setWorking(true);
    setError(null);
    setStage("burn");
    setPct(null);
    try {
      const ff = await loadFfmpeg();
      const ext = file.name.match(/\.[^.]+$/)?.[0] || ".mp4";
      const inName = `in${ext}`;
      await ff.writeFile(inName, await fetchFile(file));

      const inputs: string[] = ["-i", inName];
      for (let i = 0; i < segments.length; i++) {
        const blob = await renderCaptionBlob(segments[i], dims.w, dims.h);
        await ff.writeFile(`s${i}.png`, await fetchFile(blob));
        inputs.push("-i", `s${i}.png`);
      }

      let filter = "";
      let prev = "0:v";
      segments.forEach((s, i) => {
        const label = i === segments.length - 1 ? "vout" : `v${i}`;
        filter += `[${prev}][${i + 1}:v]overlay=0:0:enable='between(t,${s.start.toFixed(
          2
        )},${s.end.toFixed(2)})'[${label}];`;
        prev = label;
      });
      filter = filter.replace(/;$/, "");

      await ffRun(
        ff,
        [
          ...inputs,
          "-filter_complex",
          filter,
          "-map",
          "[vout]",
          "-map",
          "0:a?",
          "-c:v",
          "libx264",
          "-preset",
          "veryfast",
          "-crf",
          "20",
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
        setPct
      );
      const blob = await readBlob(ff, "out.mp4", "video/mp4");
      setResultUrl((prev2) => {
        if (prev2) URL.revokeObjectURL(prev2);
        return URL.createObjectURL(blob);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not burn captions.");
    } finally {
      setWorking(false);
      setStage(null);
      setPct(null);
    }
  }, [file, segments, dims, renderCaptionBlob]);

  const downloadSrt = useCallback(() => {
    if (!segments) return;
    const blob = new Blob([toSrt(segments)], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${base}.srt`;
    a.click();
    URL.revokeObjectURL(a.href);
  }, [segments, base]);

  const editSeg = (i: number, text: string) => {
    setSegments((prev) => {
      if (!prev) return prev;
      const next = [...prev];
      next[i] = { ...next[i], text };
      return next;
    });
    if (resultUrl) {
      URL.revokeObjectURL(resultUrl);
      setResultUrl(null);
    }
  };

  const deleteSeg = (i: number) => {
    setSegments((prev) => (prev ? prev.filter((_, j) => j !== i) : prev));
    if (resultUrl) {
      URL.revokeObjectURL(resultUrl);
      setResultUrl(null);
    }
  };

  // any style change invalidates a previous burn
  useEffect(() => {
    setResultUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }, [styleId, position, fontScale, uppercase]);

  useEffect(() => {
    return () => {
      if (srcUrl) URL.revokeObjectURL(srcUrl);
      if (resultUrl) URL.revokeObjectURL(resultUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reset = () => {
    if (srcUrl) URL.revokeObjectURL(srcUrl);
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    setFile(null);
    setSrcUrl(null);
    setDims(null);
    setSegments(null);
    setResultUrl(null);
    setError(null);
  };

  if (!file) {
    return (
      <Dropzone
        accept="video/*"
        onFiles={onFiles}
        hint="Drop a Reel or clip · transcribed & captioned in your browser · never uploaded"
      />
    );
  }

  const previewFontPx = (boxH * fontScale) / 100;
  const stageLabel =
    stage === "download"
      ? `Downloading AI model… ${pct ?? 0}%`
      : stage === "extract"
      ? "Reading audio…"
      : stage === "transcribe"
      ? "Transcribing on your device…"
      : stage === "burn"
      ? `Burning captions… ${pct ?? 0}%`
      : "Working…";

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
            {resultUrl ? "Captioned result" : "Preview"}
          </span>
          <span className="text-foreground/50">{formatBytes(file.size)}</span>
        </div>
        <div className="relative flex items-center justify-center bg-black p-3">
          {working && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-[#0a0b16]/80 backdrop-blur-sm">
              <Loader2 className="h-6 w-6 animate-spin text-brand-400" />
              <span className="text-xs text-foreground/70">{stageLabel}</span>
            </div>
          )}
          <div ref={wrapRef} className="relative inline-block max-h-[60vh]">
            <video
              ref={videoRef}
              src={resultUrl ?? srcUrl ?? ""}
              controls
              onLoadedMetadata={(e) => {
                const v = e.currentTarget;
                if (!dims) setDims({ w: v.videoWidth, h: v.videoHeight });
              }}
              onTimeUpdate={(e) => setNow(e.currentTarget.currentTime)}
              className="max-h-[60vh] w-auto rounded-lg"
            />
            {/* live caption overlay (only before burning) */}
            {!resultUrl && activeSeg && boxH > 0 && (
              <div
                className="pointer-events-none absolute inset-x-0 flex justify-center px-[7%] text-center"
                style={{
                  top:
                    position === "top"
                      ? "10%"
                      : position === "center"
                      ? "50%"
                      : "auto",
                  bottom: position === "bottom" ? "10%" : "auto",
                  transform: position === "center" ? "translateY(-50%)" : "none",
                }}
              >
                <span
                  style={{
                    fontFamily: FONT,
                    fontWeight: 800,
                    fontSize: `${previewFontPx}px`,
                    lineHeight: 1.28,
                    color: style.color,
                    textTransform: uppercase ? "uppercase" : "none",
                    ...(style.box
                      ? {
                          background: style.box,
                          padding: `${previewFontPx * 0.16}px ${previewFontPx * 0.4}px`,
                          borderRadius: `${previewFontPx * 0.18}px`,
                          boxDecorationBreak: "clone",
                          WebkitBoxDecorationBreak: "clone",
                        }
                      : {}),
                    ...(style.stroke
                      ? {
                          WebkitTextStroke: `${previewFontPx * 0.05}px #000`,
                          paintOrder: "stroke fill",
                        }
                      : {}),
                  }}
                >
                  {activeSeg.text}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* step 1: transcribe */}
      {!segments && (
        <div className="rounded-2xl glass p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <label className="text-sm font-medium">AI accuracy</label>
              <p className="text-xs text-foreground/50">
                Model downloads once, then runs fully on your device.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setModel("Xenova/whisper-tiny")}
                className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                  model === "Xenova/whisper-tiny"
                    ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-glow"
                    : "border border-white/10 bg-white/5 text-foreground/70 hover:text-foreground"
                }`}
              >
                Fast
              </button>
              <button
                onClick={() => setModel("Xenova/whisper-base")}
                className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                  model === "Xenova/whisper-base"
                    ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-glow"
                    : "border border-white/10 bg-white/5 text-foreground/70 hover:text-foreground"
                }`}
              >
                Accurate
              </button>
            </div>
          </div>
          <button
            onClick={() => void runTranscribe()}
            disabled={working}
            className={`mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-3.5 text-base font-semibold text-white shadow-glow transition-transform hover:scale-[1.02] ${
              working ? "pointer-events-none opacity-60" : ""
            }`}
          >
            {working ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" /> {stageLabel}
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5" /> Auto-caption this video
              </>
            )}
          </button>
        </div>
      )}

      {/* step 2: style + edit */}
      {segments && (
        <>
          <div className="rounded-2xl glass p-6">
            {/* style presets */}
            <label className="text-sm font-medium">Caption style</label>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {(Object.keys(STYLES) as StyleId[]).map((id) => (
                <button
                  key={id}
                  onClick={() => setStyleId(id)}
                  className={`rounded-xl px-3 py-3 text-sm font-semibold transition-all ${
                    styleId === id
                      ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-glow"
                      : "border border-white/10 bg-white/5 text-foreground/70 hover:text-foreground"
                  }`}
                >
                  {STYLES[id].label}
                </button>
              ))}
            </div>

            {/* position */}
            <label className="mt-6 block text-sm font-medium">Position</label>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {(["top", "center", "bottom"] as Position[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPosition(p)}
                  className={`rounded-xl px-3 py-2.5 text-sm font-semibold capitalize transition-all ${
                    position === p
                      ? "bg-white/10 text-foreground ring-1 ring-white/20"
                      : "border border-white/10 bg-white/5 text-foreground/60 hover:text-foreground"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            {/* size + uppercase */}
            <div className="mt-6 flex flex-wrap items-center gap-6">
              <div className="min-w-[200px] flex-1">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <label className="font-medium">Text size</label>
                  <span className="text-foreground/60">{fontScale}%</span>
                </div>
                <input
                  type="range"
                  min={3}
                  max={12}
                  step={0.5}
                  value={fontScale}
                  onChange={(e) => setFontScale(parseFloat(e.target.value))}
                  className="w-full accent-purple-500"
                />
              </div>
              <button
                onClick={() => setUppercase((u) => !u)}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                  uppercase
                    ? "bg-white/10 text-foreground ring-1 ring-white/20"
                    : "border border-white/10 bg-white/5 text-foreground/60 hover:text-foreground"
                }`}
              >
                <Type className="h-4 w-4" /> UPPERCASE
              </button>
            </div>
          </div>

          {/* transcript editor */}
          <div className="rounded-2xl glass p-6">
            <div className="mb-3 flex items-center justify-between text-sm">
              <span className="font-medium">Transcript · {segments.length} lines</span>
              <span className="text-foreground/50">Tap any line to fix wording</span>
            </div>
            <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {segments.map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-14 shrink-0 text-right text-xs tabular-nums text-foreground/40">
                    {fmt(s.start)}
                  </span>
                  <input
                    value={s.text}
                    onChange={(e) => editSeg(i, e.target.value)}
                    className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-foreground focus:border-purple-500/50 focus:outline-none"
                  />
                  <button
                    onClick={() => deleteSeg(i)}
                    className="shrink-0 rounded-lg p-2 text-foreground/40 transition-colors hover:text-rose-300"
                    aria-label="Delete line"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* actions */}
          <div className="flex flex-col gap-3 sm:flex-row">
            {resultUrl ? (
              <a
                href={resultUrl}
                download={`${base}-captioned.mp4`}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-3.5 text-base font-semibold text-white shadow-glow transition-transform hover:scale-[1.02]"
              >
                <Download className="h-5 w-5" /> Download captioned video
              </a>
            ) : (
              <button
                onClick={() => void burn()}
                disabled={working}
                className={`inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-3.5 text-base font-semibold text-white shadow-glow transition-transform hover:scale-[1.02] ${
                  working ? "pointer-events-none opacity-60" : ""
                }`}
              >
                {working ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" /> {stageLabel}
                  </>
                ) : (
                  <>
                    <Captions className="h-5 w-5" /> Burn captions into video
                  </>
                )}
              </button>
            )}

            <button
              onClick={downloadSrt}
              disabled={working}
              className="inline-flex items-center justify-center gap-2 rounded-2xl glass glass-hover px-6 py-3.5 text-base font-semibold disabled:opacity-60"
            >
              <Download className="h-5 w-5" /> .SRT
            </button>

            <button
              onClick={reset}
              disabled={working}
              className="inline-flex items-center justify-center gap-2 rounded-2xl glass glass-hover px-6 py-3.5 text-base font-semibold disabled:opacity-60"
            >
              <RefreshCw className="h-5 w-5" /> New video
            </button>
          </div>
        </>
      )}
    </div>
  );
}
