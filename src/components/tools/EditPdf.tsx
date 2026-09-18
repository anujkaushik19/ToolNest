"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Eraser,
  GripVertical,
  Highlighter,
  ImagePlus,
  Loader2,
  MousePointer2,
  Pen,
  Pencil,
  PenTool,
  Redo2,
  RotateCw,
  Square,
  Type as TypeIcon,
  Trash2,
  Undo2,
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from "lucide-react";
import { Dropzone, formatBytes } from "@/components/Dropzone";

// ---------------------------------------------------------------------------
// Types — everything is stored in PDF points (unscaled, top-left origin) so
// zoom and page switches never move an annotation. Screen px = pt * scale.
// ---------------------------------------------------------------------------

type Tool = "select" | "text" | "draw" | "highlight" | "rect" | "image" | "erase" | "edittext";

type FontKey = "helvetica" | "times" | "courier";

type BaseAnn = { id: string; page: number; groupId?: string };

type TextAnn = BaseAnn & {
  type: "text";
  xPt: number;
  yPt: number;
  text: string;
  color: string;
  fontSize: number;
  fontKey?: FontKey;
};

type DrawAnn = BaseAnn & {
  type: "draw";
  color: string;
  strokeWidth: number;
  points: { x: number; y: number }[]; // in PDF points
};

type BoxAnn = BaseAnn & {
  type: "highlight" | "rect" | "whiteout";
  xPt: number;
  yPt: number;
  wPt: number;
  hPt: number;
  color: string;
  strokeWidth: number;
};

type ImageAnn = BaseAnn & {
  type: "image";
  xPt: number;
  yPt: number;
  wPt: number;
  hPt: number;
  dataUrl: string; // always PNG
};

type Ann = TextAnn | DrawAnn | BoxAnn | ImageAnn;

type PageInfo = { width: number; height: number }; // unscaled points

// One entry per visible page: which original page it maps to + user rotation.
type PageState = { src: number; rot: number }; // src = 0-based original index; rot = 0|90|180|270

// A line of real text extracted from the PDF, in PDF points (top-left origin).
type EditableTextItem = {
  str: string;
  xPt: number;
  yPt: number;
  wPt: number;
  hPt: number;
  fontSize: number;
  fontKey: FontKey;
};

// ---------------------------------------------------------------------------
// pdf.js loader (lazy so it never runs on the server)
// ---------------------------------------------------------------------------

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

const COLORS = [
  "#111827",
  "#ef4444",
  "#f59e0b",
  "#10b981",
  "#3b82f6",
  "#8b5cf6",
  "#ffffff",
];

function hexToRgb01(hex: string) {
  const h = hex.replace("#", "");
  const n = parseInt(
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h,
    16
  );
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 };
}

function withAlpha(hex: string, a: number) {
  const { r, g, b } = hexToRgb01(hex);
  return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(
    b * 255
  )}, ${a})`;
}

const CSS_FONTS: Record<FontKey, string> = {
  helvetica: "Helvetica, Arial, sans-serif",
  times: "'Times New Roman', Times, serif",
  courier: "'Courier New', Courier, monospace",
};

const HIGHLIGHT_OPACITY = 0.35;

// Eraser-shaped mouse cursor (lucide "eraser" glyph), hotspot near the tip.
const ERASER_SVG =
  "<svg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24' fill='white' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21'/><path d='M22 21H7'/><path d='m5 11 9 9'/></svg>";
const ERASER_CURSOR = `url("data:image/svg+xml,${encodeURIComponent(
  ERASER_SVG
)}") 4 15, auto`;

// Convert an arbitrary image file to a PNG data URL so pdf-lib can always embed it.
async function fileToPngDataUrl(file: File): Promise<{ dataUrl: string; w: number; h: number }> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0);
    return { dataUrl: canvas.toDataURL("image/png"), w: img.naturalWidth, h: img.naturalHeight };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(",")[1];
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

// --- Eraser hit-testing (all in PDF points) --------------------------------
const ERASE_RADIUS = 8;

function distToSegment(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number
) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
}

function eraseHit(a: Ann, x: number, y: number): boolean {
  if (a.type === "draw") {
    const r = ERASE_RADIUS + a.strokeWidth / 2;
    if (a.points.length === 1) {
      return Math.hypot(x - a.points[0].x, y - a.points[0].y) <= r;
    }
    for (let i = 1; i < a.points.length; i++) {
      const p0 = a.points[i - 1];
      const p1 = a.points[i];
      if (distToSegment(x, y, p0.x, p0.y, p1.x, p1.y) <= r) return true;
    }
    return false;
  }
  let bw: number;
  let bh: number;
  if (a.type === "text") {
    const lines = a.text.split("\n");
    bw = Math.max(12, lines.reduce((m, l) => Math.max(m, l.length), 1) * a.fontSize * 0.55);
    bh = (lines.length || 1) * a.fontSize * 1.18;
  } else {
    bw = a.wPt;
    bh = a.hPt;
  }
  return (
    x >= a.xPt - ERASE_RADIUS &&
    x <= a.xPt + bw + ERASE_RADIUS &&
    y >= a.yPt - ERASE_RADIUS &&
    y <= a.yPt + bh + ERASE_RADIUS
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function EditPdf() {
  const [file, setFile] = useState<File | null>(null);
  const [fileBytes, setFileBytes] = useState<Uint8Array | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [page, setPage] = useState(1);
  const [scale, setScale] = useState(1.25);
  const [pageInfos, setPageInfos] = useState<PageInfo[]>([]);
  // Page management: display order + per-page rotation, keyed to the original
  // (source) page index so annotations stay attached through reorder/delete.
  const [pageOrder, setPageOrder] = useState<PageState[]>([]);
  const [thumbs, setThumbs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [tool, setTool] = useState<Tool>("select");
  const [anns, setAnns] = useState<Ann[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [color, setColor] = useState("#111827");
  const [fontSize, setFontSize] = useState(16);
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [signOpen, setSignOpen] = useState(false);
  // existing PDF text lines on the current page (for the Edit-text tool)
  const [textItems, setTextItems] = useState<EditableTextItem[]>([]);

  const pdfRef = useRef<import("pdfjs-dist").PDFDocumentProxy | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const renderTaskRef = useRef<import("pdfjs-dist").RenderTask | null>(null);

  // ---- Undo / redo history -----------------------------------------------
  const annsRef = useRef<Ann[]>(anns);
  useEffect(() => {
    annsRef.current = anns;
  }, [anns]);
  const undoStack = useRef<Ann[][]>([]);
  const redoStack = useRef<Ann[][]>([]);
  const editSessionRef = useRef<string | null>(null);
  const [histVersion, setHistVersion] = useState(0);

  // Snapshot the current annotations before a discrete, undoable change.
  const pushHistory = useCallback(() => {
    undoStack.current.push(annsRef.current);
    if (undoStack.current.length > 100) undoStack.current.shift();
    redoStack.current = [];
    setHistVersion((v) => v + 1);
  }, []);

  const undo = useCallback(() => {
    if (!undoStack.current.length) return;
    const prev = undoStack.current.pop()!;
    redoStack.current.push(annsRef.current);
    editSessionRef.current = null;
    setAnns(prev);
    setSelectedId(null);
    setHistVersion((v) => v + 1);
  }, []);

  const redo = useCallback(() => {
    if (!redoStack.current.length) return;
    const next = redoStack.current.pop()!;
    undoStack.current.push(annsRef.current);
    editSessionRef.current = null;
    setAnns(next);
    setSelectedId(null);
    setHistVersion((v) => v + 1);
  }, []);

  // Keyboard shortcuts: Cmd/Ctrl+Z undo, Cmd/Ctrl+Shift+Z or Cmd/Ctrl+Y redo.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      const k = e.key.toLowerCase();
      if (k === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((k === "z" && e.shiftKey) || k === "y") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  // ---- Page operations (rotate / delete / reorder) -----------------------
  const pageSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const rotatePage = (displayIndex: number, delta: number) => {
    setPageOrder((prev) =>
      prev.map((p, i) =>
        i === displayIndex ? { ...p, rot: (((p.rot + delta) % 360) + 360) % 360 } : p
      )
    );
  };

  const deletePage = (displayIndex: number) => {
    if (pageOrder.length <= 1) return; // always keep at least one page
    const entry = pageOrder[displayIndex];
    pushHistory();
    setAnns((a) => a.filter((x) => x.page !== entry.src + 1));
    setPageOrder((prev) => prev.filter((_, i) => i !== displayIndex));
    setSelectedId(null);
    setPage((p) => {
      const newLen = pageOrder.length - 1;
      const np = displayIndex < p ? p - 1 : p;
      return Math.max(1, Math.min(np, newLen));
    });
  };

  const onPagesDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setPageOrder((prev) => {
      const oldIndex = prev.findIndex((en) => `pg-${en.src}` === active.id);
      const newIndex = prev.findIndex((en) => `pg-${en.src}` === over.id);
      if (oldIndex < 0 || newIndex < 0) return prev;
      setPage((p) => {
        if (p - 1 === oldIndex) return newIndex + 1; // follow the moved page
        return p;
      });
      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  // active freehand path being drawn
  const [draftDraw, setDraftDraw] = useState<DrawAnn | null>(null);
  // active rubber-band box being created
  const [draftBox, setDraftBox] = useState<BoxAnn | null>(null);
  const creatingRef = useRef<{ startXpt: number; startYpt: number } | null>(null);
  // eraser drag in progress
  const erasingRef = useRef(false);
  // move/resize interaction on an existing annotation
  const interactRef = useRef<
    | {
        id: string;
        mode: "move" | "resize";
        startX: number;
        startY: number;
        orig: Ann;
        committed: boolean;
      }
    | null
  >(null);

  // Resolve the current display page to its source page + rotation.
  const curEntry = pageOrder[page - 1];
  const curSrc = curEntry ? curEntry.src : page - 1; // 0-based original index
  const srcPage = curSrc + 1; // 1-based original page number — the annotation key
  const rot = ((curEntry?.rot ?? 0) % 360 + 360) % 360;
  const current = pageInfos[curSrc];

  // ---- Load a PDF ---------------------------------------------------------
  const loadFile = useCallback(async (f: File) => {
    setLoading(true);
    setFile(f);
    setAnns([]);
    setSelectedId(null);
    setPage(1);
    try {
      const buf = new Uint8Array(await f.arrayBuffer());
      // keep a pristine copy for export (pdf.js transfers/detaches the buffer)
      setFileBytes(buf.slice(0));
      const pdfjs = await getPdfjs();
      const doc = await pdfjs.getDocument({ data: buf }).promise;
      pdfRef.current = doc;
      setNumPages(doc.numPages);
      const infos: PageInfo[] = [];
      const thumbList: string[] = [];
      for (let i = 1; i <= doc.numPages; i++) {
        const p = await doc.getPage(i);
        const vp = p.getViewport({ scale: 1 });
        infos.push({ width: vp.width, height: vp.height });
        // small thumbnail for the page sidebar
        const tvp = p.getViewport({ scale: Math.min(140 / vp.width, 180 / vp.height) });
        const tc = document.createElement("canvas");
        tc.width = Math.max(1, Math.floor(tvp.width));
        tc.height = Math.max(1, Math.floor(tvp.height));
        const tctx = tc.getContext("2d");
        if (tctx) {
          await p.render({ canvasContext: tctx, viewport: tvp }).promise;
          thumbList.push(tc.toDataURL("image/jpeg", 0.7));
        } else {
          thumbList.push("");
        }
      }
      setPageInfos(infos);
      setThumbs(thumbList);
      setPageOrder(Array.from({ length: doc.numPages }, (_, i) => ({ src: i, rot: 0 })));
    } catch (err) {
      console.error(err);
      alert("Sorry — that file could not be opened as a PDF.");
      setFile(null);
      setFileBytes(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // ---- Render the current page to canvas ---------------------------------
  useEffect(() => {
    const doc = pdfRef.current;
    const canvas = canvasRef.current;
    if (!doc || !canvas || !current) return;
    let cancelled = false;

    (async () => {
      try {
        renderTaskRef.current?.cancel();
        const p = await doc.getPage(curSrc + 1);
        const vp = p.getViewport({ scale });
        const ctx = canvas.getContext("2d");
        if (!ctx || cancelled) return;
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.floor(vp.width * dpr);
        canvas.height = Math.floor(vp.height * dpr);
        canvas.style.width = `${vp.width}px`;
        canvas.style.height = `${vp.height}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const task = p.render({ canvasContext: ctx, viewport: vp });
        renderTaskRef.current = task;
        await task.promise;
      } catch (err: unknown) {
        if ((err as { name?: string })?.name !== "RenderingCancelledException") {
          console.error(err);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [page, scale, current, curSrc]);

  // ---- Extract real PDF text lines when the Edit-text tool is active ------
  useEffect(() => {
    if (tool !== "edittext") {
      setTextItems([]);
      return;
    }
    const doc = pdfRef.current;
    if (!doc || !current) return;
    let cancelled = false;

    (async () => {
      const pdfjs = await getPdfjs();
      const p = await doc.getPage(curSrc + 1);
      const vp = p.getViewport({ scale: 1 });
      const tc = await p.getTextContent();
      if (cancelled) return;
      const items: EditableTextItem[] = [];
      for (const raw of tc.items) {
        if (!("str" in raw) || !raw.str.trim()) continue;
        const it = raw as {
          str: string;
          width: number;
          transform: number[];
          fontName: string;
        };
        const tx = pdfjs.Util.transform(vp.transform, it.transform);
        const fontSize = Math.hypot(tx[2], tx[3]);
        if (fontSize < 1) continue;
        const style = tc.styles[it.fontName] as { fontFamily?: string } | undefined;
        const fam = (style?.fontFamily || "").toLowerCase();
        let fontKey: FontKey = "helvetica";
        if (fam.includes("mono") || fam.includes("courier")) fontKey = "courier";
        else if (fam.includes("times") || fam.includes("georgia") || fam === "serif")
          fontKey = "times";
        items.push({
          str: it.str,
          xPt: tx[4],
          yPt: tx[5] - fontSize,
          wPt: it.width,
          hPt: fontSize,
          fontSize,
          fontKey,
        });
      }
      setTextItems(items);
    })();

    return () => {
      cancelled = true;
    };
  }, [tool, page, current, curSrc]);

  // Click an existing line: cover it and drop an editable copy in its place.
  const editTextItem = (it: EditableTextItem) => {
    const whiteId = crypto.randomUUID();
    const textId = crypto.randomUUID();
    const groupId = crypto.randomUUID(); // links the whiteout + replacement so they delete together
    pushHistory();
    setAnns((prev) => [
      ...prev,
      {
        id: whiteId,
        groupId,
        type: "whiteout",
        page: srcPage,
        xPt: it.xPt - 1,
        yPt: it.yPt - 1,
        wPt: it.wPt + 2,
        hPt: it.hPt + 2,
        color: "#ffffff",
        strokeWidth: 0,
      },
      {
        id: textId,
        groupId,
        type: "text",
        page: srcPage,
        xPt: it.xPt,
        yPt: it.yPt,
        text: it.str,
        color: "#111827",
        fontSize: it.fontSize,
        fontKey: it.fontKey,
      },
    ]);
    setSelectedId(textId);
    setTool("select");
    requestAnimationFrame(() => {
      (document.getElementById(`ann-${textId}`) as HTMLTextAreaElement | null)?.focus();
    });
  };

  // screen->pt for a pointer event relative to the overlay.
  // The canvas wrapper is CSS-rotated by `rot`, so undo that rotation about the
  // element centre before converting to unrotated PDF points.
  const eventToPt = (e: { clientX: number; clientY: number }) => {
    const rect = overlayRef.current!.getBoundingClientRect();
    if (!current) return { xPt: 0, yPt: 0 };
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const vx = e.clientX - cx;
    const vy = e.clientY - cy;
    const rad = (rot * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    // inverse rotation (screen -> unrotated local, y-down clockwise convention)
    const lx = cos * vx + sin * vy;
    const ly = -sin * vx + cos * vy;
    const halfW = (current.width * scale) / 2;
    const halfH = (current.height * scale) / 2;
    return {
      xPt: (lx + halfW) / scale,
      yPt: (ly + halfH) / scale,
    };
  };

  // ---- Overlay pointer handling (creation of text/draw/box) --------------
  const onOverlayPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!overlayRef.current || !current) return;
    // only start creation from the background, not from an existing element
    if (e.target !== overlayRef.current) return;
    const { xPt, yPt } = eventToPt(e);

    // clicking empty page area clears the current selection
    if (tool === "select") {
      setSelectedId(null);
      editSessionRef.current = null;
      return;
    }

    if (tool === "erase") {
      overlayRef.current.setPointerCapture(e.pointerId);
      erasingRef.current = true;
      pushHistory();
      eraseAt(xPt, yPt);
      return;
    }

    if (tool === "text") {
      const id = crypto.randomUUID();
      pushHistory();
      setAnns((prev) => [
        ...prev,
        { id, type: "text", page: srcPage, xPt, yPt, text: "", color, fontSize },
      ]);
      setSelectedId(id);
      setTool("select");
      requestAnimationFrame(() => {
        (document.getElementById(`ann-${id}`) as HTMLTextAreaElement | null)?.focus();
      });
      return;
    }

    if (tool === "draw") {
      overlayRef.current.setPointerCapture(e.pointerId);
      setDraftDraw({
        id: crypto.randomUUID(),
        type: "draw",
        page: srcPage,
        color,
        strokeWidth,
        points: [{ x: xPt, y: yPt }],
      });
      return;
    }

    if (tool === "highlight" || tool === "rect") {
      overlayRef.current.setPointerCapture(e.pointerId);
      creatingRef.current = { startXpt: xPt, startYpt: yPt };
      setDraftBox({
        id: crypto.randomUUID(),
        type: tool,
        page: srcPage,
        xPt,
        yPt,
        wPt: 0,
        hPt: 0,
        color,
        strokeWidth,
      });
      return;
    }
  };

  const eraseAt = (xPt: number, yPt: number) => {
    setAnns((prev) => {
      const next = prev.filter((a) => a.page !== srcPage || !eraseHit(a, xPt, yPt));
      if (next.length !== prev.length) {
        setSelectedId((sel) => (sel && !next.some((a) => a.id === sel) ? null : sel));
      }
      return next;
    });
  };

  const onOverlayPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (erasingRef.current) {
      const { xPt, yPt } = eventToPt(e);
      eraseAt(xPt, yPt);
      return;
    }
    if (draftDraw) {
      const { xPt, yPt } = eventToPt(e);
      setDraftDraw((d) => (d ? { ...d, points: [...d.points, { x: xPt, y: yPt }] } : d));
      return;
    }
    if (draftBox && creatingRef.current) {
      const { xPt, yPt } = eventToPt(e);
      const { startXpt, startYpt } = creatingRef.current;
      setDraftBox((b) =>
        b
          ? {
              ...b,
              xPt: Math.min(startXpt, xPt),
              yPt: Math.min(startYpt, yPt),
              wPt: Math.abs(xPt - startXpt),
              hPt: Math.abs(yPt - startYpt),
            }
          : b
      );
    }
  };

  const onOverlayPointerUp = () => {
    if (erasingRef.current) {
      erasingRef.current = false;
      return;
    }
    if (draftDraw) {
      if (draftDraw.points.length > 1) {
        const finished = draftDraw;
        pushHistory();
        setAnns((prev) => [...prev, finished]);
        setSelectedId(finished.id);
      }
      setDraftDraw(null);
    }
    if (draftBox) {
      if (draftBox.wPt > 3 && draftBox.hPt > 3) {
        const finished = draftBox;
        pushHistory();
        setAnns((prev) => [...prev, finished]);
        setSelectedId(finished.id);
      }
      setDraftBox(null);
      creatingRef.current = null;
      setTool("select");
    }
  };

  // ---- Move / resize existing annotations --------------------------------
  const startInteract = (
    e: ReactPointerEvent<HTMLElement>,
    ann: Ann,
    mode: "move" | "resize"
  ) => {
    if (tool !== "select") return;
    e.stopPropagation();
    editSessionRef.current = null;
    setSelectedId(ann.id);
    interactRef.current = {
      id: ann.id,
      mode,
      startX: e.clientX,
      startY: e.clientY,
      orig: ann,
      committed: false,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const moveInteract = (e: ReactPointerEvent<HTMLElement>) => {
    const it = interactRef.current;
    if (!it) return;
    const sx = (e.clientX - it.startX) / scale;
    const sy = (e.clientY - it.startY) / scale;
    // convert the screen-space drag into the page's unrotated coordinate space
    const rad = (rot * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const dx = cos * sx + sin * sy;
    const dy = -sin * sx + cos * sy;
    if (!it.committed && (dx !== 0 || dy !== 0)) {
      pushHistory();
      it.committed = true;
    }
    setAnns((prev) =>
      prev.map((a) => {
        if (a.id !== it.id) return a;
        const o = it.orig;
        if (it.mode === "move") {
          if (o.type === "draw") {
            return { ...o, points: o.points.map((p) => ({ x: p.x + dx, y: p.y + dy })) };
          }
          return { ...(o as Exclude<Ann, DrawAnn>), xPt: (o as TextAnn).xPt + dx, yPt: (o as TextAnn).yPt + dy } as Ann;
        }
        // resize (boxes + images only)
        if (o.type === "highlight" || o.type === "rect" || o.type === "whiteout" || o.type === "image") {
          return {
            ...o,
            wPt: Math.max(8, o.wPt + dx),
            hPt: Math.max(8, o.hPt + dy),
          } as Ann;
        }
        return a;
      })
    );
  };

  const endInteract = (e: ReactPointerEvent<HTMLElement>) => {
    if (interactRef.current) {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      interactRef.current = null;
    }
  };

  const updateAnn = (id: string, patch: Partial<TextAnn>) =>
    setAnns((prev) => prev.map((a) => (a.id === id ? ({ ...a, ...patch } as Ann) : a)));

  const deleteAnn = (id: string) => {
    pushHistory();
    setAnns((prev) => {
      const target = prev.find((a) => a.id === id);
      // remove the whole edit-text group (whiteout + replacement) if linked
      if (target?.groupId) return prev.filter((a) => a.groupId !== target.groupId);
      return prev.filter((a) => a.id !== id);
    });
    if (selectedId === id) setSelectedId(null);
  };

  // apply toolbar color / size to the selected annotation
  useEffect(() => {
    if (!selectedId) return;
    setAnns((prev) =>
      prev.map((a) => {
        if (a.id !== selectedId) return a;
        if (a.type === "text") return { ...a, color, fontSize };
        if (a.type === "draw" || a.type === "rect" || a.type === "highlight")
          return { ...a, color, strokeWidth };
        return a;
      })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [color, fontSize, strokeWidth]);

  // keyboard: delete selected
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        const active = document.activeElement;
        if (active && active.id === `ann-${selectedId}`) return; // editing text
        e.preventDefault();
        deleteAnn(selectedId);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  // ---- Image / signature placement ---------------------------------------
  const placeImage = (dataUrl: string, w: number, h: number) => {
    if (!current) return;
    // fit within ~40% of page width, keep aspect
    const targetW = Math.min(current.width * 0.4, w);
    const targetH = (h / w) * targetW;
    const id = crypto.randomUUID();
    pushHistory();
    setAnns((prev) => [
      ...prev,
      {
        id,
        type: "image",
        page: srcPage,
        xPt: (current.width - targetW) / 2,
        yPt: (current.height - targetH) / 2,
        wPt: targetW,
        hPt: targetH,
        dataUrl,
      },
    ]);
    setSelectedId(id);
    setTool("select");
  };

  const onPickImage = async (f: File | undefined) => {
    if (!f || !current) return;
    const { dataUrl, w, h } = await fileToPngDataUrl(f);
    placeImage(dataUrl, w, h);
  };

  // ---- Export -------------------------------------------------------------
  const exportPdf = useCallback(async () => {
    if (!fileBytes) return;
    setExporting(true);
    try {
      const { PDFDocument, StandardFonts, rgb, degrees } = await import("pdf-lib");
      const doc = await PDFDocument.load(fileBytes);
      const stdFont: Record<FontKey, (typeof StandardFonts)[keyof typeof StandardFonts]> = {
        helvetica: StandardFonts.Helvetica,
        times: StandardFonts.TimesRoman,
        courier: StandardFonts.Courier,
      };
      const fontCache: Partial<Record<FontKey, Awaited<ReturnType<typeof doc.embedFont>>>> = {};
      const getFont = async (key: FontKey) => {
        if (!fontCache[key]) fontCache[key] = await doc.embedFont(stdFont[key]);
        return fontCache[key]!;
      };
      const pages = doc.getPages();

      for (const a of anns) {
        const pg = pages[a.page - 1];
        if (!pg) continue;
        const H = pg.getHeight();

        if (a.type === "text") {
          if (!a.text.trim()) continue;
          const font = await getFont(a.fontKey || "helvetica");
          const { r, g, b } = hexToRgb01(a.color);
          const lineHeight = a.fontSize * 1.18;
          a.text.split("\n").forEach((line, i) => {
            const yTop = a.yPt + i * lineHeight;
            pg.drawText(line, {
              x: a.xPt,
              y: H - yTop - a.fontSize,
              size: a.fontSize,
              font,
              color: rgb(r, g, b),
            });
          });
        } else if (a.type === "draw") {
          const { r, g, b } = hexToRgb01(a.color);
          for (let i = 1; i < a.points.length; i++) {
            const p0 = a.points[i - 1];
            const p1 = a.points[i];
            pg.drawLine({
              start: { x: p0.x, y: H - p0.y },
              end: { x: p1.x, y: H - p1.y },
              thickness: a.strokeWidth,
              color: rgb(r, g, b),
            });
          }
        } else if (a.type === "highlight") {
          const { r, g, b } = hexToRgb01(a.color);
          pg.drawRectangle({
            x: a.xPt,
            y: H - a.yPt - a.hPt,
            width: a.wPt,
            height: a.hPt,
            color: rgb(r, g, b),
            opacity: HIGHLIGHT_OPACITY,
          });
        } else if (a.type === "rect") {
          const { r, g, b } = hexToRgb01(a.color);
          pg.drawRectangle({
            x: a.xPt,
            y: H - a.yPt - a.hPt,
            width: a.wPt,
            height: a.hPt,
            borderColor: rgb(r, g, b),
            borderWidth: a.strokeWidth,
          });
        } else if (a.type === "whiteout") {
          pg.drawRectangle({
            x: a.xPt,
            y: H - a.yPt - a.hPt,
            width: a.wPt,
            height: a.hPt,
            color: rgb(1, 1, 1),
          });
        } else if (a.type === "image") {
          const png = await doc.embedPng(dataUrlToBytes(a.dataUrl));
          pg.drawImage(png, {
            x: a.xPt,
            y: H - a.yPt - a.hPt,
            width: a.wPt,
            height: a.hPt,
          });
        }
      }

      // Apply per-page rotation (additive to any intrinsic /Rotate).
      for (const entry of pageOrder) {
        const pg = pages[entry.src];
        if (!pg || !entry.rot) continue;
        const base = pg.getRotation().angle || 0;
        pg.setRotation(degrees(((base + entry.rot) % 360 + 360) % 360));
      }

      // Reorder / drop pages by copying the source pages in display order.
      let outDoc = doc;
      const needsReorder =
        pageOrder.length !== pages.length ||
        pageOrder.some((entry, i) => entry.src !== i);
      if (needsReorder) {
        outDoc = await PDFDocument.create();
        const copied = await outDoc.copyPages(
          doc,
          pageOrder.map((entry) => entry.src)
        );
        copied.forEach((p) => outDoc.addPage(p));
      }

      const bytes = await outDoc.save();
      const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = (file?.name.replace(/\.pdf$/i, "") || "document") + "-edited.pdf";
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Something went wrong while exporting the PDF.");
    } finally {
      setExporting(false);
    }
  }, [anns, fileBytes, file, pageOrder]);

  const reset = () => {
    renderTaskRef.current?.cancel();
    pdfRef.current = null;
    setFile(null);
    setFileBytes(null);
    setNumPages(0);
    setPageInfos([]);
    setPageOrder([]);
    setThumbs([]);
    setAnns([]);
    setSelectedId(null);
    setPage(1);
    setTool("select");
    undoStack.current = [];
    redoStack.current = [];
    editSessionRef.current = null;
    setHistVersion(0);
  };

  // -------------------------------------------------------------------------
  // Empty state
  // -------------------------------------------------------------------------
  if (!file) {
    return (
      <Dropzone
        accept="application/pdf"
        onFiles={(files) => files[0] && loadFile(files[0])}
        hint="Your PDF is processed entirely in your browser — it never leaves your device."
      >
        <p className="mt-5 text-lg font-semibold">Drop a PDF here to edit</p>
        <p className="mt-1 text-sm text-foreground/50">or click to browse</p>
      </Dropzone>
    );
  }

  const pageAnns = anns.filter((a) => a.page === srcPage);
  const drawAnns = pageAnns.filter((a): a is DrawAnn => a.type === "draw");
  const boxImgTextAnns = pageAnns.filter((a) => a.type !== "draw");
  const showStroke = tool === "draw" || tool === "rect" || tool === "highlight";

  return (
    <div className="flex flex-col gap-4">
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          onPickImage(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-2">
        <div className="flex items-center gap-1 rounded-xl bg-white/5 p-1">
          <ToolButton active={tool === "select"} onClick={() => setTool("select")} label="Select / move">
            <MousePointer2 className="h-4 w-4" />
          </ToolButton>
          <ToolButton active={tool === "text"} onClick={() => setTool("text")} label="Add text">
            <TypeIcon className="h-4 w-4" />
          </ToolButton>
          <ToolButton active={tool === "edittext"} onClick={() => setTool("edittext")} label="Edit existing text (beta)">
            <Pencil className="h-4 w-4" />
          </ToolButton>
          <ToolButton active={tool === "draw"} onClick={() => setTool("draw")} label="Pen / draw">
            <Pen className="h-4 w-4" />
          </ToolButton>
          <ToolButton active={tool === "highlight"} onClick={() => setTool("highlight")} label="Highlight">
            <Highlighter className="h-4 w-4" />
          </ToolButton>
          <ToolButton active={tool === "rect"} onClick={() => setTool("rect")} label="Rectangle">
            <Square className="h-4 w-4" />
          </ToolButton>
          <ToolButton
            active={tool === "image"}
            onClick={() => {
              setTool("image");
              imageInputRef.current?.click();
            }}
            label="Image"
          >
            <ImagePlus className="h-4 w-4" />
          </ToolButton>
          <ToolButton active={signOpen} onClick={() => setSignOpen(true)} label="Signature">
            <PenTool className="h-4 w-4" />
          </ToolButton>
          <ToolButton active={tool === "erase"} onClick={() => setTool("erase")} label="Erase edits">
            <Eraser className="h-4 w-4" />
          </ToolButton>
        </div>

        {/* color */}
        <div className="flex items-center gap-1">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              aria-label={`Color ${c}`}
              className={`h-6 w-6 rounded-full border transition ${
                color === c ? "border-white ring-2 ring-brand-400" : "border-white/20"
              }`}
              style={{ background: c }}
            />
          ))}
        </div>

        {/* font size (text) */}
        {(tool === "text" || (selectedId && anns.find((a) => a.id === selectedId)?.type === "text")) && (
          <div className="flex items-center gap-2 text-sm text-foreground/70">
            <span>Size</span>
            <input
              type="range"
              min={8}
              max={48}
              step={1}
              value={fontSize}
              onChange={(e) => setFontSize(parseInt(e.target.value))}
              className="w-24 accent-brand-500"
            />
            <span className="w-6 tabular-nums">{fontSize}</span>
          </div>
        )}

        {/* stroke width (draw / shapes) */}
        {showStroke && (
          <div className="flex items-center gap-2 text-sm text-foreground/70">
            <span>Stroke</span>
            <input
              type="range"
              min={1}
              max={16}
              step={1}
              value={strokeWidth}
              onChange={(e) => setStrokeWidth(parseInt(e.target.value))}
              className="w-24 accent-brand-500"
            />
            <span className="w-6 tabular-nums">{strokeWidth}</span>
          </div>
        )}

        <div className="mx-1 h-6 w-px bg-white/10" />

        {/* undo / redo */}
        <div className="flex items-center gap-1" data-hist={histVersion}>
          <IconBtn onClick={undo} label="Undo" disabled={undoStack.current.length === 0}>
            <Undo2 className="h-4 w-4" />
          </IconBtn>
          <IconBtn onClick={redo} label="Redo" disabled={redoStack.current.length === 0}>
            <Redo2 className="h-4 w-4" />
          </IconBtn>
        </div>

        <div className="mx-1 h-6 w-px bg-white/10" />

        {/* zoom */}
        <div className="flex items-center gap-1">
          <IconBtn onClick={() => setScale((s) => Math.max(0.5, +(s - 0.25).toFixed(2)))} label="Zoom out">
            <ZoomOut className="h-4 w-4" />
          </IconBtn>
          <span className="w-12 text-center text-sm tabular-nums text-foreground/70">
            {Math.round(scale * 100)}%
          </span>
          <IconBtn onClick={() => setScale((s) => Math.min(3, +(s + 0.25).toFixed(2)))} label="Zoom in">
            <ZoomIn className="h-4 w-4" />
          </IconBtn>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={reset}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-sm text-foreground/70 transition hover:bg-white/5"
          >
            <RotateCcw className="h-4 w-4" /> New file
          </button>
          <button
            onClick={exportPdf}
            disabled={exporting}
            className={`inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-glow transition-transform hover:scale-[1.02] ${
              exporting ? "opacity-60" : ""
            }`}
          >
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Download
          </button>
        </div>
      </div>

      {/* file meta + page nav */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-foreground/60">
        <span className="truncate">
          {file.name} · {formatBytes(file.size)}
        </span>
        <div className="flex items-center gap-2">
          <IconBtn onClick={() => rotatePage(page - 1, -90)} label="Rotate left">
            <RotateCcw className="h-4 w-4" />
          </IconBtn>
          <IconBtn onClick={() => rotatePage(page - 1, 90)} label="Rotate right">
            <RotateCw className="h-4 w-4" />
          </IconBtn>
          <IconBtn
            onClick={() => deletePage(page - 1)}
            label="Delete page"
            disabled={pageOrder.length <= 1}
          >
            <Trash2 className="h-4 w-4" />
          </IconBtn>
          <div className="mx-1 h-6 w-px bg-white/10" />
          <IconBtn onClick={() => setPage((p) => Math.max(1, p - 1))} label="Previous page" disabled={page <= 1}>
            <ChevronLeft className="h-4 w-4" />
          </IconBtn>
          <span className="tabular-nums">
            Page {page} / {pageOrder.length || numPages}
          </span>
          <IconBtn
            onClick={() => setPage((p) => Math.min(pageOrder.length, p + 1))}
            label="Next page"
            disabled={page >= pageOrder.length}
          >
            <ChevronRight className="h-4 w-4" />
          </IconBtn>
        </div>
      </div>

      {/* Page sidebar + canvas */}
      <div className="flex gap-4">
        <PageSidebar
          pageOrder={pageOrder}
          thumbs={thumbs}
          currentPage={page}
          sensors={pageSensors}
          onSelect={setPage}
          onRotate={rotatePage}
          onDelete={deletePage}
          onDragEnd={onPagesDragEnd}
        />

        {/* Canvas + overlay */}
        <div className="flex flex-1 justify-center overflow-auto rounded-2xl border border-white/10 bg-black/30 p-4">
          <div
            className="relative shrink-0"
            style={
              current
                ? {
                    width:
                      (rot % 180 === 0 ? current.width : current.height) * scale,
                    height:
                      (rot % 180 === 0 ? current.height : current.width) * scale,
                  }
                : undefined
            }
          >
            {loading && (
              <div className="flex h-96 w-72 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-brand-400" />
              </div>
            )}
            {/* rotated inner frame keeps annotations in unrotated page space */}
            <div
              className="absolute left-1/2 top-1/2"
              style={
                current
                  ? {
                      width: current.width * scale,
                      height: current.height * scale,
                      transform: `translate(-50%, -50%) rotate(${rot}deg)`,
                    }
                  : undefined
              }
            >
              <canvas ref={canvasRef} className="block rounded-lg shadow-2xl" />

              {/* freehand strokes (SVG) */}
              {current && (
                <svg
                  className="pointer-events-none absolute left-0 top-0"
                  width={current.width * scale}
                  height={current.height * scale}
                >
                  {drawAnns.map((a) => (
                <polyline
                  key={a.id}
                  points={a.points.map((p) => `${p.x * scale},${p.y * scale}`).join(" ")}
                  fill="none"
                  stroke={a.color}
                  strokeWidth={a.strokeWidth * scale}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={selectedId === a.id ? "opacity-100" : ""}
                />
              ))}
              {draftDraw && (
                <polyline
                  points={draftDraw.points.map((p) => `${p.x * scale},${p.y * scale}`).join(" ")}
                  fill="none"
                  stroke={draftDraw.color}
                  strokeWidth={draftDraw.strokeWidth * scale}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
            </svg>
          )}

          {/* interaction overlay */}
          <div
            ref={overlayRef}
            onPointerDown={onOverlayPointerDown}
            onPointerMove={onOverlayPointerMove}
            onPointerUp={onOverlayPointerUp}
            className="absolute inset-0"
            style={{
              cursor:
                tool === "text"
                  ? "text"
                  : tool === "erase"
                  ? ERASER_CURSOR
                  : tool === "edittext"
                  ? "default"
                  : tool === "draw" || tool === "highlight" || tool === "rect"
                  ? "crosshair"
                  : "default",
              width: current ? current.width * scale : undefined,
              height: current ? current.height * scale : undefined,
            }}
          >
            {/* clickable layer of existing PDF text (Edit-text tool) */}
            {tool === "edittext" &&
              current &&
              textItems.map((it, i) => (
                <button
                  key={i}
                  onClick={() => editTextItem(it)}
                  title="Click to edit this text"
                  className="absolute rounded-[2px] bg-brand-400/10 ring-1 ring-brand-400/40 transition hover:bg-brand-400/30"
                  style={{
                    left: it.xPt * scale,
                    top: it.yPt * scale,
                    width: it.wPt * scale,
                    height: it.hPt * scale,
                    pointerEvents: "auto",
                  }}
                />
              ))}
            {/* draft box preview */}
            {draftBox && (
              <div
                className="absolute"
                style={{
                  left: draftBox.xPt * scale,
                  top: draftBox.yPt * scale,
                  width: draftBox.wPt * scale,
                  height: draftBox.hPt * scale,
                  background: draftBox.type === "highlight" ? withAlpha(draftBox.color, HIGHLIGHT_OPACITY) : "transparent",
                  border: draftBox.type === "rect" ? `${draftBox.strokeWidth * scale}px solid ${draftBox.color}` : "none",
                }}
              />
            )}

            {boxImgTextAnns.map((a) => {
              const selected = selectedId === a.id;
              // pointer events only active in select mode so creation tools pass through
              const pe = tool === "select" ? "auto" : "none";

              if (a.type === "text") {
                return (
                  <div
                    key={a.id}
                    onPointerDown={(e) => startInteract(e, a, "move")}
                    onPointerMove={moveInteract}
                    onPointerUp={endInteract}
                    className={`group absolute ${selected ? "outline outline-2 outline-brand-400" : ""}`}
                    style={{ left: a.xPt * scale, top: a.yPt * scale, pointerEvents: pe, cursor: "move" }}
                  >
                    <textarea
                      id={`ann-${a.id}`}
                      value={a.text}
                      onChange={(e) => {
                        if (editSessionRef.current !== a.id) {
                          pushHistory();
                          editSessionRef.current = a.id;
                        }
                        updateAnn(a.id, { text: e.target.value });
                      }}
                      onFocus={() => setSelectedId(a.id)}
                      onPointerDown={(e) => {
                        if (selected) e.stopPropagation();
                      }}
                      rows={1}
                      spellCheck={false}
                      placeholder="Type…"
                      className="resize-none overflow-hidden whitespace-pre bg-transparent p-0 leading-tight outline-none placeholder:text-current/40"
                      style={{
                        color: a.color,
                        fontSize: a.fontSize * scale,
                        lineHeight: 1.18,
                        fontFamily: CSS_FONTS[a.fontKey || "helvetica"],
                        minWidth: 12,
                        width: `${Math.max(
                          12,
                          (a.text.split("\n").reduce((m, l) => Math.max(m, l.length), 1) + 1) *
                            a.fontSize *
                            scale *
                            0.55
                        )}px`,
                        height: `${(a.text.split("\n").length || 1) * a.fontSize * scale * 1.18 + 4}px`,
                      }}
                    />
                    {selected && <DeleteDot onClick={() => deleteAnn(a.id)} />}
                  </div>
                );
              }

              // box (highlight/rect) or image
              const box = a as BoxAnn | ImageAnn;
              return (
                <div
                  key={a.id}
                  onPointerDown={(e) => startInteract(e, a, "move")}
                  onPointerMove={moveInteract}
                  onPointerUp={endInteract}
                  className={`group absolute ${selected ? "outline outline-2 outline-brand-400" : ""}`}
                  style={{
                    left: box.xPt * scale,
                    top: box.yPt * scale,
                    width: box.wPt * scale,
                    height: box.hPt * scale,
                    pointerEvents: pe,
                    cursor: "move",
                    background:
                      a.type === "highlight"
                        ? withAlpha((a as BoxAnn).color, HIGHLIGHT_OPACITY)
                        : a.type === "whiteout"
                        ? "#ffffff"
                        : "transparent",
                    border:
                      a.type === "rect"
                        ? `${(a as BoxAnn).strokeWidth * scale}px solid ${(a as BoxAnn).color}`
                        : "none",
                  }}
                >
                  {a.type === "image" && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={(a as ImageAnn).dataUrl}
                      alt="stamp"
                      className="pointer-events-none h-full w-full select-none"
                      draggable={false}
                    />
                  )}
                  {selected && (
                    <>
                      <DeleteDot onClick={() => deleteAnn(a.id)} />
                      <div
                        onPointerDown={(e) => startInteract(e, a, "resize")}
                        onPointerMove={moveInteract}
                        onPointerUp={endInteract}
                        className="absolute -bottom-1.5 -right-1.5 h-3.5 w-3.5 cursor-nwse-resize rounded-full border border-white bg-brand-500"
                      />
                    </>
                  )}
                </div>
              );
            })}
          </div>
          </div>
          </div>
        </div>
      </div>

      <p className="text-center text-xs text-foreground/40">
        Pick a tool, then work on the page: click to add text, use the pencil to edit existing text, draw,
        highlight or box, add an image or signature. Select to move or resize, and use the eraser to remove
        any edit. Everything happens locally in your browser.
      </p>

      {signOpen && (
        <SignaturePad
          onClose={() => setSignOpen(false)}
          onComplete={(dataUrl, w, h) => {
            placeImage(dataUrl, w, h);
            setSignOpen(false);
          }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Small UI helpers
// ---------------------------------------------------------------------------

// Thumbnail sidebar: reorder (drag), rotate and delete pages.
function PageSidebar({
  pageOrder,
  thumbs,
  currentPage,
  sensors,
  onSelect,
  onRotate,
  onDelete,
  onDragEnd,
}: {
  pageOrder: PageState[];
  thumbs: string[];
  currentPage: number;
  sensors: ReturnType<typeof useSensors>;
  onSelect: (page: number) => void;
  onRotate: (displayIndex: number, delta: number) => void;
  onDelete: (displayIndex: number) => void;
  onDragEnd: (e: DragEndEvent) => void;
}) {
  if (!pageOrder.length) return null;
  return (
    <div className="hidden max-h-[70vh] w-40 shrink-0 overflow-y-auto rounded-2xl border border-white/10 bg-black/20 p-2 md:block">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext
          items={pageOrder.map((e) => `pg-${e.src}`)}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex flex-col gap-2">
            {pageOrder.map((entry, i) => (
              <SortableThumb
                key={entry.src}
                id={`pg-${entry.src}`}
                index={i}
                rot={entry.rot}
                thumb={thumbs[entry.src]}
                isCurrent={currentPage === i + 1}
                canDelete={pageOrder.length > 1}
                onSelect={() => onSelect(i + 1)}
                onRotate={(delta) => onRotate(i, delta)}
                onDelete={() => onDelete(i)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

function SortableThumb({
  id,
  index,
  rot,
  thumb,
  isCurrent,
  canDelete,
  onSelect,
  onRotate,
  onDelete,
}: {
  id: string;
  index: number;
  rot: number;
  thumb: string | undefined;
  isCurrent: boolean;
  canDelete: boolean;
  onSelect: () => void;
  onRotate: (delta: number) => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative rounded-lg border p-1 transition ${
        isCurrent ? "border-brand-400 bg-brand-500/10" : "border-white/10 hover:bg-white/5"
      }`}
    >
      <button
        onClick={onSelect}
        className="flex w-full flex-col items-center gap-1"
        title={`Go to page ${index + 1}`}
      >
        <div className="flex h-24 w-full items-center justify-center overflow-hidden rounded bg-white/5">
          {thumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumb}
              alt={`Page ${index + 1}`}
              className="max-h-full max-w-full select-none"
              style={{ transform: `rotate(${rot}deg)` }}
              draggable={false}
            />
          ) : (
            <span className="text-xs text-foreground/40">…</span>
          )}
        </div>
        <span className="text-xs tabular-nums text-foreground/60">{index + 1}</span>
      </button>

      {/* drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="absolute left-1 top-1 cursor-grab rounded bg-black/40 p-0.5 text-foreground/60 opacity-0 transition group-hover:opacity-100 active:cursor-grabbing"
        title="Drag to reorder"
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>

      {/* per-page controls */}
      <div className="absolute right-1 top-1 flex gap-0.5 opacity-0 transition group-hover:opacity-100">
        <button
          onClick={() => onRotate(90)}
          title="Rotate page"
          aria-label="Rotate page"
          className="rounded bg-black/50 p-0.5 text-foreground/70 hover:bg-black/70"
        >
          <RotateCw className="h-3.5 w-3.5" />
        </button>
        {canDelete && (
          <button
            onClick={onDelete}
            title="Delete page"
            aria-label="Delete page"
            className="rounded bg-black/50 p-0.5 text-red-300 hover:bg-red-500/70 hover:text-white"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

function DeleteDot({ onClick }: { onClick: () => void }) {
  return (
    <button
      onPointerDown={(e) => {
        e.stopPropagation();
        e.preventDefault();
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white opacity-0 shadow transition group-hover:opacity-100"
      aria-label="Delete"
    >
      <Trash2 className="h-3 w-3" />
    </button>
  );
}

function ToolButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
        active ? "bg-brand-500 text-white shadow-glow" : "text-foreground/70 hover:bg-white/10"
      }`}
    >
      {children}
    </button>
  );
}

function IconBtn({
  onClick,
  label,
  disabled,
  children,
}: {
  onClick: () => void;
  label: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      disabled={disabled}
      className={`flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 transition ${
        disabled ? "opacity-30" : "text-foreground/70 hover:bg-white/10"
      }`}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Signature pad — draw or type a signature, returns a trimmed PNG data URL.
// This is a visible (handwritten) signature, not a cryptographic PKI signature.
// ---------------------------------------------------------------------------

const SIGN_COLORS = ["#111827", "#1d4ed8"];
const SIGN_FONTS = [
  { label: "Signature", css: "'Brush Script MT', 'Segoe Script', cursive" },
  { label: "Classic", css: "'Snell Roundhand', 'Apple Chancery', cursive" },
  { label: "Casual", css: "'Comic Sans MS', 'Segoe Print', cursive" },
];

function trimCanvas(
  canvas: HTMLCanvasElement
): { dataUrl: string; w: number; h: number } | null {
  const ctx = canvas.getContext("2d")!;
  const { width, height } = canvas;
  const { data } = ctx.getImageData(0, 0, width, height);
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  let found = false;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 8) {
        found = true;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (!found) return null;
  const pad = 8;
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(width, maxX + pad);
  maxY = Math.min(height, maxY + pad);
  const w = maxX - minX;
  const h = maxY - minY;
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  out.getContext("2d")!.drawImage(canvas, minX, minY, w, h, 0, 0, w, h);
  return { dataUrl: out.toDataURL("image/png"), w, h };
}

function SignaturePad({
  onClose,
  onComplete,
}: {
  onClose: () => void;
  onComplete: (dataUrl: string, w: number, h: number) => void;
}) {
  const [mode, setMode] = useState<"draw" | "type">("draw");
  const [inkColor, setInkColor] = useState(SIGN_COLORS[0]);
  const [typed, setTyped] = useState("");
  const [font, setFont] = useState(SIGN_FONTS[0].css);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const lastRef = useRef<{ x: number; y: number } | null>(null);
  const hasInkRef = useRef(false);

  const W = 500;
  const H = 180;

  const clear = () => {
    const c = canvasRef.current;
    if (c) c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
    hasInkRef.current = false;
  };

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const down = (e: React.PointerEvent<HTMLCanvasElement>) => {
    drawingRef.current = true;
    lastRef.current = pos(e);
    canvasRef.current!.setPointerCapture(e.pointerId);
  };
  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    const p = pos(e);
    const last = lastRef.current!;
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    lastRef.current = p;
    hasInkRef.current = true;
  };
  const up = (e: React.PointerEvent<HTMLCanvasElement>) => {
    drawingRef.current = false;
    canvasRef.current!.releasePointerCapture(e.pointerId);
  };

  const add = () => {
    if (mode === "draw") {
      if (!canvasRef.current || !hasInkRef.current) return;
      const res = trimCanvas(canvasRef.current);
      if (res) onComplete(res.dataUrl, res.w, res.h);
      return;
    }
    // type mode -> render text to a canvas
    const text = typed.trim();
    if (!text) return;
    const fontPx = 72;
    const measure = document.createElement("canvas").getContext("2d")!;
    measure.font = `${fontPx}px ${font}`;
    const tw = Math.ceil(measure.measureText(text).width) + 40;
    const th = Math.ceil(fontPx * 1.6);
    const c = document.createElement("canvas");
    c.width = tw;
    c.height = th;
    const ctx = c.getContext("2d")!;
    ctx.font = `${fontPx}px ${font}`;
    ctx.fillStyle = inkColor;
    ctx.textBaseline = "middle";
    ctx.fillText(text, 20, th / 2);
    const res = trimCanvas(c);
    if (res) onComplete(res.dataUrl, res.w, res.h);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0b0d18] p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Add your signature</h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-foreground/60 hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* mode tabs */}
        <div className="mb-4 inline-flex rounded-xl bg-white/5 p-1 text-sm">
          <button
            onClick={() => setMode("draw")}
            className={`rounded-lg px-4 py-1.5 transition ${
              mode === "draw" ? "bg-brand-500 text-white" : "text-foreground/70"
            }`}
          >
            Draw
          </button>
          <button
            onClick={() => setMode("type")}
            className={`rounded-lg px-4 py-1.5 transition ${
              mode === "type" ? "bg-brand-500 text-white" : "text-foreground/70"
            }`}
          >
            Type
          </button>
        </div>

        {mode === "draw" ? (
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            onPointerDown={down}
            onPointerMove={move}
            onPointerUp={up}
            className="w-full touch-none rounded-xl border border-white/15 bg-white"
            style={{ aspectRatio: `${W} / ${H}`, cursor: "crosshair" }}
          />
        ) : (
          <div className="space-y-3">
            <input
              autoFocus
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder="Type your name"
              className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 outline-none focus:border-brand-400"
            />
            <div className="flex gap-2">
              {SIGN_FONTS.map((f) => (
                <button
                  key={f.label}
                  onClick={() => setFont(f.css)}
                  className={`flex-1 overflow-hidden rounded-xl border bg-white px-2 py-3 text-2xl leading-none transition ${
                    font === f.css ? "border-brand-400 ring-2 ring-brand-400" : "border-white/10"
                  }`}
                  style={{ fontFamily: f.css, color: inkColor }}
                >
                  {typed.trim() || "Signature"}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ink color + actions */}
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-foreground/60">Ink</span>
            {SIGN_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setInkColor(c)}
                aria-label={`Ink ${c}`}
                className={`h-6 w-6 rounded-full border transition ${
                  inkColor === c ? "border-white ring-2 ring-brand-400" : "border-white/20"
                }`}
                style={{ background: c }}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {mode === "draw" && (
              <button
                onClick={clear}
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-sm text-foreground/70 transition hover:bg-white/5"
              >
                <RotateCcw className="h-4 w-4" /> Clear
              </button>
            )}
            <button
              onClick={add}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-glow transition-transform hover:scale-[1.02]"
            >
              <Check className="h-4 w-4" /> Add signature
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

