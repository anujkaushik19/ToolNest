// Client-side FFmpeg (WebAssembly) loader shared by all video/audio tools.
// Uses the single-threaded core so we don't need site-wide COOP/COEP headers.
import type { FFmpeg } from "@ffmpeg/ffmpeg";

// Public library code (not user data) — the core is fetched once and cached.
const CORE_VERSION = "0.12.10";
const CORE_BASE =
  process.env.NEXT_PUBLIC_FFMPEG_CORE_URL?.replace(/\/$/, "") ||
  `https://unpkg.com/@ffmpeg/core@${CORE_VERSION}/dist/umd`;

let ffmpegPromise: Promise<FFmpeg> | null = null;

/** Load (once) and return a ready FFmpeg singleton. */
export async function loadFfmpeg(onLoad?: (pct: number) => void): Promise<FFmpeg> {
  if (ffmpegPromise) return ffmpegPromise;
  ffmpegPromise = (async () => {
    const { FFmpeg } = await import("@ffmpeg/ffmpeg");
    const { toBlobURL } = await import("@ffmpeg/util");
    const ff = new FFmpeg();
    const coreURL = await toBlobURL(`${CORE_BASE}/ffmpeg-core.js`, "text/javascript");
    const wasmURL = await toBlobURL(
      `${CORE_BASE}/ffmpeg-core.wasm`,
      "application/wasm",
      true,
      (e) => onLoad?.(Math.round((e.received / (e.total || 1)) * 100))
    );
    await ff.load({ coreURL, wasmURL });
    onLoad?.(100);
    return ff;
  })();
  // Reset on failure so a later attempt can retry.
  ffmpegPromise.catch(() => {
    ffmpegPromise = null;
  });
  return ffmpegPromise;
}

/** Read a File into FFmpeg's virtual filesystem. */
export async function fetchFile(file: File | Blob): Promise<Uint8Array> {
  const { fetchFile } = await import("@ffmpeg/util");
  return fetchFile(file);
}

/** Run a single ffmpeg command, reporting 0–100 progress, then clean up listeners. */
export async function ffRun(
  ff: FFmpeg,
  args: string[],
  onProgress?: (pct: number) => void
): Promise<void> {
  const handler = ({ progress }: { progress: number }) =>
    onProgress?.(Math.min(100, Math.max(0, Math.round(progress * 100))));
  ff.on("progress", handler);
  try {
    await ff.exec(args);
  } finally {
    ff.off("progress", handler);
  }
}

/** Read a produced file out as a Blob of the given MIME type. */
export async function readBlob(
  ff: FFmpeg,
  name: string,
  mime: string
): Promise<Blob> {
  const data = (await ff.readFile(name)) as Uint8Array;
  return new Blob([data as BlobPart], { type: mime });
}
