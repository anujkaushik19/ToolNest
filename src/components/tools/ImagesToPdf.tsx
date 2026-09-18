"use client";

import { useCallback, useEffect, useState } from "react";
import { PDFDocument, PageSizes } from "pdf-lib";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Download, Loader2, RefreshCw, Plus, X } from "lucide-react";
import { Dropzone, formatBytes } from "@/components/Dropzone";

type ImgItem = {
  id: string;
  file: File;
  url: string;
};

type PageSize = "fit" | "a4" | "letter";
type Orientation = "portrait" | "landscape";

// Convert any image file into PNG bytes via canvas (handles webp, gif, etc.).
async function toPngBytes(url: string): Promise<Uint8Array> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("Could not load image."));
    el.src = url;
  });
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported.");
  ctx.drawImage(img, 0, 0);
  const blob = await new Promise<Blob | null>((r) =>
    canvas.toBlob(r, "image/png")
  );
  if (!blob) throw new Error("Image conversion failed.");
  return new Uint8Array(await blob.arrayBuffer());
}

export function ImagesToPdf() {
  const [items, setItems] = useState<ImgItem[]>([]);
  const [pageSize, setPageSize] = useState<PageSize>("fit");
  const [orientation, setOrientation] = useState<Orientation>("portrait");
  const [margin, setMargin] = useState(24);
  const [fileName, setFileName] = useState("images");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const invalidate = () =>
    setPdfUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });

  const addFiles = useCallback((files: File[]) => {
    const imgs = files.filter((f) => f.type.startsWith("image/"));
    if (!imgs.length) {
      setError("Please choose image files (JPG, PNG, WebP…).");
      return;
    }
    setError(null);
    invalidate();
    const newItems: ImgItem[] = imgs.map((file) => ({
      id: `${file.name}-${file.size}-${crypto.randomUUID()}`,
      file,
      url: URL.createObjectURL(file),
    }));
    setItems((prev) => [...prev, ...newItems]);
  }, []);

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setItems((prev) => {
      const oldIndex = prev.findIndex((i) => i.id === active.id);
      const newIndex = prev.findIndex((i) => i.id === over.id);
      return arrayMove(prev, oldIndex, newIndex);
    });
    invalidate();
  };

  const remove = (id: string) => {
    setItems((prev) => {
      const target = prev.find((i) => i.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((i) => i.id !== id);
    });
    invalidate();
  };

  const build = useCallback(async () => {
    if (items.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const doc = await PDFDocument.create();
      for (const item of items) {
        let embedded;
        if (item.file.type === "image/jpeg") {
          embedded = await doc.embedJpg(await item.file.arrayBuffer());
        } else if (item.file.type === "image/png") {
          embedded = await doc.embedPng(await item.file.arrayBuffer());
        } else {
          embedded = await doc.embedPng(await toPngBytes(item.url));
        }

        if (pageSize === "fit") {
          const page = doc.addPage([embedded.width, embedded.height]);
          page.drawImage(embedded, {
            x: 0,
            y: 0,
            width: embedded.width,
            height: embedded.height,
          });
        } else {
          const base =
            pageSize === "a4" ? PageSizes.A4 : PageSizes.Letter;
          const [pw, ph] =
            orientation === "portrait" ? base : [base[1], base[0]];
          const page = doc.addPage([pw, ph]);
          const maxW = pw - margin * 2;
          const maxH = ph - margin * 2;
          const scale = Math.min(
            maxW / embedded.width,
            maxH / embedded.height
          );
          const w = embedded.width * scale;
          const h = embedded.height * scale;
          page.drawImage(embedded, {
            x: (pw - w) / 2,
            y: (ph - h) / 2,
            width: w,
            height: h,
          });
        }
      }
      const bytes = await doc.save();
      const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
      setPdfUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(blob);
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong building the PDF."
      );
    } finally {
      setBusy(false);
    }
  }, [items, pageSize, orientation, margin]);

  const reset = () => {
    items.forEach((i) => URL.revokeObjectURL(i.url));
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    setItems([]);
    setPdfUrl(null);
    setError(null);
  };

  useEffect(() => {
    return () => {
      items.forEach((i) => URL.revokeObjectURL(i.url));
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalSize = items.reduce((s, i) => s + i.file.size, 0);

  const safeName =
    (fileName.trim() || "images").replace(/[\\/:*?"<>|]+/g, "-") + ".pdf";

  if (items.length === 0) {
    return (
      <Dropzone
        accept="image/*"
        multiple
        onFiles={addFiles}
        hint="Add JPG or PNG images · built in your browser · never uploaded"
      />
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      )}

      <p className="text-xs text-foreground/40">
        Drag to reorder — each image becomes one page, top-left to bottom-right.
      </p>

      {/* sortable thumbnail grid */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
      >
        <SortableContext
          items={items.map((i) => i.id)}
          strategy={rectSortingStrategy}
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {items.map((item, i) => (
              <SortableThumb
                key={item.id}
                item={item}
                index={i}
                onRemove={remove}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* summary + add more */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl glass px-5 py-3.5 text-sm">
        <span className="text-foreground/60">
          {items.length} image{items.length === 1 ? "" : "s"} ·{" "}
          {formatBytes(totalSize)}
        </span>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 px-3 py-1.5 font-medium glass-hover">
          <Plus className="h-4 w-4" /> Add more
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) addFiles(Array.from(e.target.files));
              e.target.value = "";
            }}
          />
        </label>
      </div>

      {/* page options */}
      <div className="space-y-5 rounded-2xl glass p-6">
        <div>
          <label className="text-sm font-medium">File name</label>
          <div className="mt-3 flex items-center rounded-xl border border-white/10 bg-white/5 focus-within:border-brand-400/60">
            <input
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="images"
              className="w-full bg-transparent px-4 py-3 text-sm outline-none placeholder:text-foreground/40"
            />
            <span className="px-4 text-sm text-foreground/40">.pdf</span>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">Page size</label>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {(
              [
                { v: "fit", l: "Fit to image" },
                { v: "a4", l: "A4" },
                { v: "letter", l: "Letter" },
              ] as { v: PageSize; l: string }[]
            ).map((o) => (
              <button
                key={o.v}
                onClick={() => {
                  setPageSize(o.v);
                  invalidate();
                }}
                className={`rounded-xl px-3 py-2.5 text-sm font-semibold transition-all ${
                  pageSize === o.v
                    ? "bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-glow"
                    : "border border-white/10 bg-white/5 text-foreground/70 hover:text-foreground"
                }`}
              >
                {o.l}
              </button>
            ))}
          </div>
        </div>

        {pageSize !== "fit" && (
          <>
            <div>
              <label className="text-sm font-medium">Orientation</label>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {(
                  [
                    { v: "portrait", l: "Portrait" },
                    { v: "landscape", l: "Landscape" },
                  ] as { v: Orientation; l: string }[]
                ).map((o) => (
                  <button
                    key={o.v}
                    onClick={() => {
                      setOrientation(o.v);
                      invalidate();
                    }}
                    className={`rounded-xl px-3 py-2.5 text-sm font-semibold transition-all ${
                      orientation === o.v
                        ? "bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-glow"
                        : "border border-white/10 bg-white/5 text-foreground/70 hover:text-foreground"
                    }`}
                  >
                    {o.l}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <label className="font-medium">Margin</label>
                <span className="text-foreground/60">{margin}px</span>
              </div>
              <input
                type="range"
                min={0}
                max={96}
                step={4}
                value={margin}
                onChange={(e) => {
                  setMargin(parseInt(e.target.value));
                  invalidate();
                }}
                className="w-full accent-brand-500"
              />
            </div>
          </>
        )}
      </div>

      {/* actions */}
      <div className="flex flex-col gap-3 sm:flex-row">
        {pdfUrl ? (
          <a
            href={pdfUrl}
            download={safeName}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-accent-cyan px-6 py-3.5 text-base font-semibold text-white shadow-glow transition-transform hover:scale-[1.02]"
          >
            <Download className="h-5 w-5" /> Download PDF
          </a>
        ) : (
          <button
            onClick={build}
            disabled={busy || items.length === 0}
            className={`inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-brand-600 px-6 py-3.5 text-base font-semibold text-white shadow-glow transition-transform hover:scale-[1.02] ${
              busy || items.length === 0 ? "opacity-60" : ""
            }`}
          >
            {busy ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" /> Building PDF…
              </>
            ) : (
              <>Create PDF from {items.length} image{items.length === 1 ? "" : "s"}</>
            )}
          </button>
        )}
        <button
          onClick={reset}
          className="inline-flex items-center justify-center gap-2 rounded-2xl glass glass-hover px-6 py-3.5 text-base font-semibold"
        >
          <RefreshCw className="h-5 w-5" /> Start over
        </button>
      </div>
    </div>
  );
}

function SortableThumb({
  item,
  index,
  onRemove,
}: {
  item: ImgItem;
  index: number;
  onRemove: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`group relative aspect-square cursor-grab overflow-hidden rounded-xl border border-white/10 bg-[#0a0b16] active:cursor-grabbing ${
        isDragging ? "z-10 shadow-glow ring-1 ring-brand-400/50" : ""
      }`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={item.url}
        alt={item.file.name}
        className="h-full w-full object-cover"
      />
      <span className="absolute left-1.5 top-1.5 flex h-6 min-w-6 items-center justify-center rounded-md bg-black/60 px-1.5 text-xs font-semibold text-white">
        {index + 1}
      </span>
      <button
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => onRemove(item.id)}
        aria-label="Remove"
        className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-md bg-black/60 text-white opacity-0 transition-opacity hover:bg-rose-500 group-hover:opacity-100"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
