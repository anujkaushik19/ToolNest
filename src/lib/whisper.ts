// In-browser speech-to-text via Transformers.js (Whisper on onnxruntime-web).
// Everything runs on-device — audio never leaves the browser.
import type { Pipeline } from "@xenova/transformers";

export type WhisperModel = "Xenova/whisper-tiny" | "Xenova/whisper-base";

export type Segment = { start: number; end: number; text: string };

type ProgressItem = { status: string; progress?: number; file?: string };

const pipelines: Partial<Record<WhisperModel, Promise<Pipeline>>> = {};

/** Load (once per model) the automatic-speech-recognition pipeline. */
async function getTranscriber(
  model: WhisperModel,
  onDownload?: (pct: number) => void
): Promise<Pipeline> {
  if (!pipelines[model]) {
    pipelines[model] = (async () => {
      const { pipeline, env } = await import("@xenova/transformers");
      // Always fetch weights from the Hugging Face hub (cached by the browser).
      env.allowLocalModels = false;
      const seen: Record<string, number> = {};
      const p = await pipeline("automatic-speech-recognition", model, {
        quantized: true,
        progress_callback: (item: ProgressItem) => {
          if (item.status === "progress" && item.file) {
            seen[item.file] = item.progress ?? 0;
            const vals = Object.values(seen);
            const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
            onDownload?.(Math.round(avg));
          }
        },
      });
      onDownload?.(100);
      return p as Pipeline;
    })();
    pipelines[model]?.catch(() => {
      delete pipelines[model];
    });
  }
  return pipelines[model]!;
}

/** Split an overly long chunk into short caption-sized lines by word count. */
function splitChunk(text: string, start: number, end: number, maxWords = 6): Segment[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return [{ start, end, text: text.trim() }];
  const lines: string[] = [];
  for (let i = 0; i < words.length; i += maxWords) {
    lines.push(words.slice(i, i + maxWords).join(" "));
  }
  const dur = (end - start) / lines.length;
  return lines.map((line, i) => ({
    start: start + i * dur,
    end: start + (i + 1) * dur,
    text: line,
  }));
}

/** Transcribe 16 kHz mono PCM into short, timed caption segments. */
export async function transcribe(
  audio: Float32Array,
  model: WhisperModel,
  onDownload?: (pct: number) => void
): Promise<Segment[]> {
  const transcriber = await getTranscriber(model, onDownload);
  const output = (await transcriber(audio, {
    return_timestamps: true,
    chunk_length_s: 30,
    stride_length_s: 5,
  })) as { chunks?: { text: string; timestamp: [number, number | null] }[] };

  const chunks = output.chunks ?? [];
  const segments: Segment[] = [];
  for (let i = 0; i < chunks.length; i++) {
    const c = chunks[i];
    const start = c.timestamp[0] ?? 0;
    const end = c.timestamp[1] ?? (chunks[i + 1]?.timestamp[0] ?? start + 2);
    if (!c.text.trim()) continue;
    segments.push(...splitChunk(c.text, start, end));
  }
  return segments;
}

/** Format seconds as an SRT timestamp: HH:MM:SS,mmm */
function srtTime(t: number): string {
  const ms = Math.floor((t % 1) * 1000);
  const s = Math.floor(t) % 60;
  const m = Math.floor(t / 60) % 60;
  const h = Math.floor(t / 3600);
  const pad = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(ms, 3)}`;
}

/** Serialise segments to a downloadable .srt file body. */
export function toSrt(segments: Segment[]): string {
  return segments
    .map((s, i) => `${i + 1}\n${srtTime(s.start)} --> ${srtTime(s.end)}\n${s.text}\n`)
    .join("\n");
}
