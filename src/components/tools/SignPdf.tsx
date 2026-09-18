"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  Download,
  Loader2,
  PenLine,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Type as TypeIcon,
} from "lucide-react";
import { Dropzone, formatBytes } from "@/components/Dropzone";

const ALLOWED = /\.pdf$/i;

// pdf.js loader (lazy so it never runs on the server).
let pdfjsPromise: Promise<typeof import("pdfjs-dist")> | null = null;
async function getPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import("pdfjs-dist").then((lib) => {
      lib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
      return lib;
    });
  }
  return pdfjsPromise;
}

type PageInfo = { width: number; height: number }; // unscaled points
type Placement = {
  id: string;
  page: number; // 1-based
  xPt: number;
  yPt: number; // top-left origin, in points
  wPt: number;
  hPt: number;
};

type Interaction =
  | { kind: "move"; id: string; startX: number; startY: number; ox: number; oy: number }
  | { kind: "resize"; id: string; startX: number; startY: number; ow: number; oh: number };

const SIG_FONTS = [
  { label: "Signature", css: "'Snell Roundhand','Segoe Script',cursive" },
  { label: "Casual", css: "'Bradley Hand','Comic Sans MS',cursive" },
  { label: "Formal", css: "'Palatino Linotype','Book Antiqua',serif" },
];

export function SignPdf() {
  const [file, setFile] = useState<File | null>(null);
  const [pageInfos, setPageInfos] = useState<PageInfo[]>([]);
  const [page, setPage] = useState(1); // 1-based
  const [scale, setScale] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [sig, setSig] = useState<{ url: string; aspect: number } | null>(null);
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const docRef = useRef<Awaited<ReturnType<Awaited<ReturnType<typeof getPdfjs>>["getDocument"]>["promise"]> | null>(null);
  const interactRef = useRef<Interaction | null>(null);

  const current = pageInfos[page - 1];

  const loadFile = useCallback(async (f: File) => {
    setError(null);
    setBusy(true);
    try {
      const pdfjs = await getPdfjs();
      const bytes = new Uint8Array(await f.arrayBuffer());
      const doc = await pdfjs.getDocument({ data: bytes.slice(0) }).promise;
      docRef.current = doc;

      const infos: PageInfo[] = [];
      for (let i = 1; i <= doc.numPages; i++) {
        const p = await doc.getPage(i);
        const vp = p.getViewport({ scale: 1 });
        infos.push({ width: vp.width, height: vp.height });
      }
      const fit = Math.min(680 / infos[0].width, 1.5);
      setPageInfos(infos);
      setScale(fit);
      setPage(1);
      setPlacements([]);
      setSelected(null);
      setFile(f);
    } catch {
      setError("Couldn't open this PDF. It may be corrupted or password-protected.");
    } finally {
      setBusy(false);
    }
  }, []);

  const onFiles = useCallback(
    (files: File[]) => {
      const pdf = files.find((f) => ALLOWED.test(f.name));
      if (!pdf) {
        setError("Please choose a PDF file.");
        return;
      }
      void loadFile(pdf);
    },
    [loadFile]
  );

  // Render the current page.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const doc = docRef.current;
      const canvas = canvasRef.current;
      if (!doc || !canvas || !current) return;
      const pdfjs = await getPdfjs();
      void pdfjs;
      const p = await doc.getPage(page);
      const vp = p.getViewport({ scale });
      if (cancelled) return;
      canvas.width = vp.width;
      canvas.height = vp.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      await p.render({ canvasContext: ctx, viewport: vp }).promise;
    })();
    return () => {
      cancelled = true;
    };
  }, [page, scale, current]);

  // Place the current signature centered on the page.
  const placeSignature = useCallback(() => {
    if (!sig || !current) return;
    const wPt = Math.min(current.width * 0.35, 220 / scale);
    const hPt = wPt / sig.aspect;
    const id = Math.random().toString(36).slice(2);
    setPlacements((prev) => [
      ...prev,
      {
        id,
        page,
        xPt: (current.width - wPt) / 2,
        yPt: (current.height - hPt) / 2,
        wPt,
        hPt,
      },
    ]);
    setSelected(id);
  }, [sig, current, page, scale]);

  const onPointerDownBox = (
    e: ReactPointerEvent,
    id: string,
    mode: "move" | "resize"
  ) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const pl = placements.find((p) => p.id === id);
    if (!pl) return;
    setSelected(id);
    interactRef.current =
      mode === "move"
        ? { kind: "move", id, startX: e.clientX, startY: e.clientY, ox: pl.xPt, oy: pl.yPt }
        : { kind: "resize", id, startX: e.clientX, startY: e.clientY, ow: pl.wPt, oh: pl.hPt };
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    const act = interactRef.current;
    if (!act || !current) return;
    const dxPt = (e.clientX - act.startX) / scale;
    const dyPt = (e.clientY - act.startY) / scale;
    setPlacements((prev) =>
      prev.map((p) => {
        if (p.id !== act.id) return p;
        if (act.kind === "move") {
          return {
            ...p,
            xPt: Math.max(0, Math.min(current.width - p.wPt, act.ox + dxPt)),
            yPt: Math.max(0, Math.min(current.height - p.hPt, act.oy + dyPt)),
          };
        }
        const wPt = Math.max(40 / scale, act.ow + dxPt);
        const hPt = wPt / (p.wPt / p.hPt); // keep aspect
        return { ...p, wPt, hPt };
      })
    );
  };

  const onPointerUp = (e: ReactPointerEvent) => {
    (e.target as Element).releasePointerCapture?.(e.pointerId);
    interactRef.current = null;
  };

  const deleteSelected = useCallback(() => {
    if (!selected) return;
    setPlacements((prev) => prev.filter((p) => p.id !== selected));
    setSelected(null);
  }, [selected]);

  const exportPdf = useCallback(async () => {
    if (!file || placements.length === 0) return;
    setExporting(true);
    setError(null);
    try {
      const { PDFDocument } = await import("pdf-lib");
      const bytes = new Uint8Array(await file.arrayBuffer());
      const doc = await PDFDocument.load(bytes);

      // Embed the signature PNG once, reuse for every placement.
      const pngBytes = new Uint8Array(await (await fetch(sig!.url)).arrayBuffer());
      const png = await doc.embedPng(pngBytes);

      for (const pl of placements) {
        const pg = doc.getPage(pl.page - 1);
        const { height } = pg.getSize();
        pg.drawImage(png, {
          x: pl.xPt,
          y: height - pl.yPt - pl.hPt, // convert top-left → bottom-left origin
          width: pl.wPt,
          height: pl.hPt,
        });
      }

      const out = await doc.save();
      const ab = out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength) as ArrayBuffer;
      const blob = new Blob([ab], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = (file.name.replace(/\.[^.]+$/, "") || "document") + "-signed.pdf";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setError("Couldn't export the signed PDF. Please try again.");
    } finally {
      setExporting(false);
    }
  }, [file, placements, sig]);

  const reset = () => {
    if (sig) URL.revokeObjectURL(sig.url);
    docRef.current = null;
    setFile(null);
    setPageInfos([]);
    setPlacements([]);
    setSelected(null);
    setSig(null);
    setError(null);
  };

  useEffect(() => {
    return () => {
      if (sig) URL.revokeObjectURL(sig.url);
    };
  }, [sig]);

  const pageCount = pageInfos.length;
  const pagePlacements = placements.filter((p) => p.page === page);

  if (!file) {
    return (
      <div className="space-y-4">
        <PrivacyNotice />
        <Dropzone accept=".pdf" onFiles={onFiles} hint="Add your signature to a PDF" />
        {error && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PrivacyNotice />

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      )}

      {/* top bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl glass p-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{file.name}</p>
          <p className="text-xs text-foreground/50">{formatBytes(file.size)}</p>
        </div>
        {sig ? (
          <button
            onClick={placeSignature}
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand-500/90 px-3 py-2 text-sm font-medium text-white transition hover:bg-brand-500"
          >
            <PenLine className="h-4 w-4" /> Place signature
          </button>
        ) : null}
        <button
          onClick={deleteSelected}
          disabled={!selected}
          className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-sm text-foreground/70 transition hover:bg-white/5 disabled:opacity-40"
        >
          <Trash2 className="h-4 w-4" /> Delete
        </button>
        <button
          onClick={reset}
          className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-sm text-foreground/70 transition hover:bg-white/5"
        >
          <RefreshCw className="h-4 w-4" /> New file
        </button>
      </div>

      {/* signature creator */}
      {!sig && <SignatureCreator onCreate={(url, aspect) => setSig({ url, aspect })} />}

      {sig && (
        <div className="flex items-center gap-3 rounded-2xl glass p-3">
          <span className="text-xs text-foreground/50">Your signature:</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={sig.url} alt="Signature" className="h-10 w-auto rounded bg-white/90 px-1" />
          <button
            onClick={() => setSig(null)}
            className="ml-auto text-xs text-foreground/60 underline hover:text-foreground"
          >
            Change
          </button>
        </div>
      )}

      {/* page + canvas */}
      {busy ? (
        <div className="flex items-center justify-center rounded-2xl glass py-20 text-foreground/60">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading PDF…
        </div>
      ) : (
        current && (
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-lg border border-white/10 px-3 py-1.5 text-sm disabled:opacity-40"
              >
                Prev
              </button>
              <span className="text-sm text-foreground/60">
                Page {page} / {pageCount}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                disabled={page >= pageCount}
                className="rounded-lg border border-white/10 px-3 py-1.5 text-sm disabled:opacity-40"
              >
                Next
              </button>
            </div>

            <div className="flex justify-center overflow-auto">
              <div
                ref={overlayRef}
                className="relative shadow-2xl"
                style={{ width: current.width * scale, height: current.height * scale }}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
              >
                <canvas ref={canvasRef} className="block" />

                {pagePlacements.map((pl) => {
                  const isSel = pl.id === selected;
                  return (
                    <div
                      key={pl.id}
                      onPointerDown={(e) => onPointerDownBox(e, pl.id, "move")}
                      className={`absolute cursor-move ${
                        isSel ? "ring-2 ring-brand-400" : "ring-1 ring-white/30"
                      }`}
                      style={{
                        left: pl.xPt * scale,
                        top: pl.yPt * scale,
                        width: pl.wPt * scale,
                        height: pl.hPt * scale,
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={sig?.url}
                        alt="Signature"
                        className="pointer-events-none h-full w-full select-none object-contain"
                        draggable={false}
                      />
                      {isSel && (
                        <span
                          onPointerDown={(e) => onPointerDownBox(e, pl.id, "resize")}
                          className="absolute -bottom-1.5 -right-1.5 h-4 w-4 cursor-se-resize rounded-full border border-white bg-brand-500"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )
      )}

      <button
        onClick={exportPdf}
        disabled={placements.length === 0 || exporting}
        className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-accent-cyan px-6 py-3.5 text-base font-semibold text-white shadow-glow transition-transform hover:scale-[1.02] ${
          placements.length === 0 || exporting ? "opacity-60" : ""
        }`}
      >
        {exporting ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" /> Exporting…
          </>
        ) : (
          <>
            <Download className="h-5 w-5" /> Download signed PDF
          </>
        )}
      </button>
    </div>
  );
}

// Draw or type a signature → transparent PNG.
function SignatureCreator({
  onCreate,
}: {
  onCreate: (url: string, aspect: number) => void;
}) {
  const [tab, setTab] = useState<"draw" | "type">("draw");
  const [typed, setTyped] = useState("");
  const [font, setFont] = useState(SIG_FONTS[0].css);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const hasInkRef = useRef(false);

  const clearCanvas = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    ctx?.clearRect(0, 0, c.width, c.height);
    hasInkRef.current = false;
  }, []);

  useEffect(() => {
    if (tab === "draw") clearCanvas();
  }, [tab, clearCanvas]);

  const pos = (e: ReactPointerEvent) => {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) * (c.width / r.width),
      y: (e.clientY - r.top) * (c.height / r.height),
    };
  };

  const start = (e: ReactPointerEvent) => {
    const c = canvasRef.current;
    if (!c) return;
    drawingRef.current = true;
    const ctx = c.getContext("2d")!;
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const { x, y } = pos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };
  const move = (e: ReactPointerEvent) => {
    if (!drawingRef.current) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = pos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    hasInkRef.current = true;
  };
  const end = () => {
    drawingRef.current = false;
  };

  const useDrawn = () => {
    const c = canvasRef.current;
    if (!c || !hasInkRef.current) return;
    onCreate(c.toDataURL("image/png"), c.width / c.height);
  };

  const useTyped = () => {
    if (!typed.trim()) return;
    const c = document.createElement("canvas");
    const ctx = c.getContext("2d")!;
    const fontSize = 96;
    ctx.font = `${fontSize}px ${font}`;
    const w = Math.ceil(ctx.measureText(typed).width) + 40;
    const h = Math.ceil(fontSize * 1.6);
    c.width = w;
    c.height = h;
    const ctx2 = c.getContext("2d")!;
    ctx2.font = `${fontSize}px ${font}`;
    ctx2.fillStyle = "#0f172a";
    ctx2.textBaseline = "middle";
    ctx2.fillText(typed, 20, h / 2);
    onCreate(c.toDataURL("image/png"), w / h);
  };

  return (
    <div className="space-y-3 rounded-2xl glass p-4">
      <div className="flex gap-2">
        <button
          onClick={() => setTab("draw")}
          className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm transition ${
            tab === "draw" ? "bg-white/15 ring-1 ring-white/20" : "hover:bg-white/5"
          }`}
        >
          <PenLine className="h-4 w-4" /> Draw
        </button>
        <button
          onClick={() => setTab("type")}
          className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm transition ${
            tab === "type" ? "bg-white/15 ring-1 ring-white/20" : "hover:bg-white/5"
          }`}
        >
          <TypeIcon className="h-4 w-4" /> Type
        </button>
      </div>

      {tab === "draw" ? (
        <>
          <canvas
            ref={canvasRef}
            width={560}
            height={200}
            onPointerDown={start}
            onPointerMove={move}
            onPointerUp={end}
            onPointerLeave={end}
            className="w-full touch-none rounded-xl bg-white"
            style={{ aspectRatio: "560 / 200" }}
          />
          <div className="flex gap-2">
            <button
              onClick={clearCanvas}
              className="rounded-xl border border-white/10 px-3 py-2 text-sm text-foreground/70 hover:bg-white/5"
            >
              Clear
            </button>
            <button
              onClick={useDrawn}
              className="ml-auto rounded-xl bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
            >
              Use signature
            </button>
          </div>
        </>
      ) : (
        <>
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder="Type your name"
            className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm outline-none focus:border-brand-400"
          />
          <div
            className="flex min-h-[80px] items-center justify-center rounded-xl bg-white px-4 text-slate-900"
            style={{ fontFamily: font, fontSize: 40 }}
          >
            {typed || "Preview"}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {SIG_FONTS.map((f) => (
              <button
                key={f.label}
                onClick={() => setFont(f.css)}
                style={{ fontFamily: f.css }}
                className={`rounded-lg px-3 py-1.5 text-sm transition ${
                  font === f.css ? "bg-white/15 ring-1 ring-white/20" : "hover:bg-white/5"
                }`}
              >
                {f.label}
              </button>
            ))}
            <button
              onClick={useTyped}
              className="ml-auto rounded-xl bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
            >
              Use signature
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function PrivacyNotice() {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100/90">
      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
      <p>
        Signing happens entirely in your browser — your document is never uploaded.
      </p>
    </div>
  );
}
