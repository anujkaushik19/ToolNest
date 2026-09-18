"use client";

import { useCallback, useEffect, useState } from "react";
import { PDFDocument } from "pdf-lib";
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
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Download,
  Loader2,
  RefreshCw,
  Plus,
  X,
  FileText,
  GripVertical,
} from "lucide-react";
import { Dropzone, formatBytes } from "@/components/Dropzone";

type PdfItem = {
  id: string;
  file: File;
  pages: number | null;
};

export function PdfMerge() {
  const [items, setItems] = useState<PdfItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mergedUrl, setMergedUrl] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const invalidate = () =>
    setMergedUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });

  const addFiles = useCallback((files: File[]) => {
    const pdfs = files.filter(
      (f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")
    );
    if (!pdfs.length) {
      setError("Please choose PDF files.");
      return;
    }
    setError(null);
    setMergedUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    const newItems: PdfItem[] = pdfs.map((file) => ({
      id: `${file.name}-${file.size}-${crypto.randomUUID()}`,
      file,
      pages: null,
    }));
    setItems((prev) => [...prev, ...newItems]);

    newItems.forEach(async (item) => {
      try {
        const bytes = await item.file.arrayBuffer();
        const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
        const count = doc.getPageCount();
        setItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, pages: count } : i))
        );
      } catch {
        setItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, pages: 0 } : i))
        );
      }
    });
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
    setItems((prev) => prev.filter((i) => i.id !== id));
    invalidate();
  };

  const merge = useCallback(async () => {
    if (items.length < 2) {
      setError("Add at least two PDFs to merge.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const out = await PDFDocument.create();
      for (const item of items) {
        const bytes = await item.file.arrayBuffer();
        const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
        const copied = await out.copyPages(src, src.getPageIndices());
        copied.forEach((p) => out.addPage(p));
      }
      const mergedBytes = await out.save();
      const blob = new Blob([mergedBytes as BlobPart], {
        type: "application/pdf",
      });
      setMergedUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(blob);
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong merging those PDFs."
      );
    } finally {
      setBusy(false);
    }
  }, [items]);

  const reset = () => {
    if (mergedUrl) URL.revokeObjectURL(mergedUrl);
    setItems([]);
    setMergedUrl(null);
    setError(null);
  };

  useEffect(() => {
    return () => {
      if (mergedUrl) URL.revokeObjectURL(mergedUrl);
    };
  }, [mergedUrl]);

  const totalPages = items.reduce((sum, i) => sum + (i.pages ?? 0), 0);
  const totalSize = items.reduce((sum, i) => sum + i.file.size, 0);

  if (items.length === 0) {
    return (
      <Dropzone
        accept="application/pdf"
        multiple
        onFiles={addFiles}
        hint="Add two or more PDFs · processed in your browser · never uploaded"
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
        Drag the handle to reorder — pages merge top to bottom.
      </p>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
      >
        <SortableContext
          items={items.map((i) => i.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-3">
            {items.map((item) => (
              <SortableRow key={item.id} item={item} onRemove={remove} />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl glass px-5 py-3.5 text-sm">
        <span className="text-foreground/60">
          {items.length} file{items.length === 1 ? "" : "s"} · {totalPages} page
          {totalPages === 1 ? "" : "s"} · {formatBytes(totalSize)}
        </span>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 px-3 py-1.5 font-medium glass-hover">
          <Plus className="h-4 w-4" /> Add more
          <input
            type="file"
            accept="application/pdf"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) addFiles(Array.from(e.target.files));
              e.target.value = "";
            }}
          />
        </label>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        {mergedUrl ? (
          <a
            href={mergedUrl}
            download="merged.pdf"
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-accent-cyan px-6 py-3.5 text-base font-semibold text-white shadow-glow transition-transform hover:scale-[1.02]"
          >
            <Download className="h-5 w-5" /> Download merged PDF
          </a>
        ) : (
          <button
            onClick={merge}
            disabled={busy || items.length < 2}
            className={`inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-brand-600 px-6 py-3.5 text-base font-semibold text-white shadow-glow transition-transform hover:scale-[1.02] ${
              busy || items.length < 2 ? "opacity-60" : ""
            }`}
          >
            {busy ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" /> Merging…
              </>
            ) : (
              <>
                <FileText className="h-5 w-5" /> Merge {items.length} PDFs
              </>
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

function SortableRow({
  item,
  onRemove,
}: {
  item: PdfItem;
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
      className={`flex items-center gap-3 rounded-2xl glass p-3.5 ${
        isDragging ? "z-10 shadow-glow ring-1 ring-brand-400/50" : ""
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
        className="flex h-8 w-8 shrink-0 cursor-grab items-center justify-center rounded-lg text-foreground/30 hover:bg-white/10 hover:text-foreground active:cursor-grabbing"
      >
        <GripVertical className="h-5 w-5" />
      </button>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-orange-500">
        <FileText className="h-5 w-5 text-white" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{item.file.name}</p>
        <p className="text-xs text-foreground/50">
          {formatBytes(item.file.size)}
          {item.pages !== null &&
            ` · ${item.pages} page${item.pages === 1 ? "" : "s"}`}
        </p>
      </div>
      <button
        onClick={() => onRemove(item.id)}
        aria-label="Remove"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-foreground/60 transition-colors hover:bg-white/10 hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
