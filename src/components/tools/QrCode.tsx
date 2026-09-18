"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Download, QrCode as QrIcon } from "lucide-react";

type Level = "L" | "M" | "Q" | "H";

const LEVELS: { value: Level; label: string }[] = [
  { value: "L", label: "Low" },
  { value: "M", label: "Medium" },
  { value: "Q", label: "Quartile" },
  { value: "H", label: "High" },
];

export function QrCode() {
  const [text, setText] = useState("https://");
  const [fg, setFg] = useState("#111827");
  const [bg, setBg] = useState("#ffffff");
  const [level, setLevel] = useState<Level>("M");
  const [margin, setMargin] = useState(2);
  const [size, setSize] = useState(512);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const value = text.trim();

  // Live preview whenever any option changes.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!value) {
      const ctx = canvas.getContext("2d");
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }
    QRCode.toCanvas(
      canvas,
      value,
      {
        errorCorrectionLevel: level,
        margin,
        width: 320,
        color: { dark: fg, light: bg },
      },
      (err) => setError(err ? "Text is too long for a QR code." : null)
    );
  }, [value, fg, bg, level, margin]);

  const download = useCallback(
    async (type: "png" | "svg") => {
      if (!value) return;
      try {
        if (type === "svg") {
          const svg = await QRCode.toString(value, {
            type: "svg",
            errorCorrectionLevel: level,
            margin,
            color: { dark: fg, light: bg },
          });
          const blob = new Blob([svg], { type: "image/svg+xml" });
          triggerDownload(URL.createObjectURL(blob), "qr-code.svg");
        } else {
          const url = await QRCode.toDataURL(value, {
            errorCorrectionLevel: level,
            margin,
            width: size,
            color: { dark: fg, light: bg },
          });
          triggerDownload(url, "qr-code.png");
        }
      } catch {
        setError("Couldn't generate the QR code.");
      }
    },
    [value, level, margin, fg, bg, size]
  );

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* controls */}
      <div className="space-y-5">
        <div className="rounded-2xl glass p-6">
          <label className="text-sm font-medium">Content</label>
          <p className="mt-1 text-xs text-foreground/50">
            A URL, text, Wi-Fi string, email — anything.
          </p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            placeholder="https://example.com"
            className="mt-3 w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-brand-400/60"
          />
        </div>

        <div className="grid gap-4 rounded-2xl glass p-6 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Foreground</label>
            <div className="mt-2 flex items-center gap-2">
              <input
                type="color"
                value={fg}
                onChange={(e) => setFg(e.target.value)}
                className="h-9 w-12 cursor-pointer rounded-lg border border-white/10 bg-transparent"
              />
              <span className="font-mono text-xs text-foreground/60">{fg}</span>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Background</label>
            <div className="mt-2 flex items-center gap-2">
              <input
                type="color"
                value={bg}
                onChange={(e) => setBg(e.target.value)}
                className="h-9 w-12 cursor-pointer rounded-lg border border-white/10 bg-transparent"
              />
              <span className="font-mono text-xs text-foreground/60">{bg}</span>
            </div>
          </div>

          <div className="sm:col-span-2">
            <label className="text-sm font-medium">Error correction</label>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {LEVELS.map((l) => (
                <button
                  key={l.value}
                  onClick={() => setLevel(l.value)}
                  className={`rounded-xl border px-2 py-2 text-xs font-medium transition ${
                    level === l.value
                      ? "border-brand-400 bg-brand-500/15 text-white"
                      : "border-white/10 text-foreground/70 hover:bg-white/5"
                  }`}
                  title={`${l.label} — higher survives more damage`}
                >
                  {l.value}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Margin · {margin}</label>
            <input
              type="range"
              min={0}
              max={8}
              step={1}
              value={margin}
              onChange={(e) => setMargin(parseInt(e.target.value, 10))}
              className="mt-4 w-full accent-brand-500"
            />
          </div>
          <div>
            <label className="text-sm font-medium">PNG size · {size}px</label>
            <input
              type="range"
              min={128}
              max={2048}
              step={128}
              value={size}
              onChange={(e) => setSize(parseInt(e.target.value, 10))}
              className="mt-4 w-full accent-brand-500"
            />
          </div>
        </div>
      </div>

      {/* preview + downloads */}
      <div className="flex flex-col items-center gap-5 rounded-2xl glass p-6">
        {error && (
          <div className="w-full rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        )}
        <div className="flex aspect-square w-full max-w-xs items-center justify-center rounded-2xl bg-white/5 p-4">
          {value ? (
            <canvas ref={canvasRef} className="h-auto w-full rounded-lg" />
          ) : (
            <div className="flex flex-col items-center gap-2 text-foreground/40">
              <QrIcon className="h-10 w-10" />
              <span className="text-sm">Enter content to preview</span>
            </div>
          )}
        </div>
        <div className="flex w-full gap-3">
          <button
            onClick={() => download("png")}
            disabled={!value}
            className={`inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-glow transition-transform hover:scale-[1.02] ${
              !value ? "opacity-50" : ""
            }`}
          >
            <Download className="h-4 w-4" /> PNG
          </button>
          <button
            onClick={() => download("svg")}
            disabled={!value}
            className={`inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-white/10 px-5 py-3 text-sm font-semibold text-foreground/80 transition hover:bg-white/5 ${
              !value ? "opacity-50" : ""
            }`}
          >
            <Download className="h-4 w-4" /> SVG
          </button>
        </div>
      </div>
    </div>
  );
}

function triggerDownload(url: string, name: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  if (url.startsWith("blob:")) URL.revokeObjectURL(url);
}
