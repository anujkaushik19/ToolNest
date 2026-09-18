"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
import { UploadCloud } from "lucide-react";

export function Dropzone({
  accept = "*/*",
  multiple = false,
  onFiles,
  hint,
  children,
}: {
  accept?: string;
  multiple?: boolean;
  onFiles: (files: File[]) => void;
  hint?: string;
  children?: ReactNode;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFiles = useCallback(
    (list: FileList | null) => {
      if (!list) return;
      const files = Array.from(list);
      if (files.length) onFiles(files);
    },
    [onFiles]
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
      }}
      className={`group flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed px-8 py-16 text-center transition-all ${
        dragging
          ? "border-brand-400 bg-brand-500/10 shadow-glow"
          : "border-white/15 bg-white/[0.02] hover:border-brand-400/60 hover:bg-white/[0.04]"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <div
        className={`flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-accent-cyan shadow-glow transition-transform ${
          dragging ? "scale-110" : "group-hover:scale-105"
        }`}
      >
        <UploadCloud className="h-8 w-8 text-white" />
      </div>
      {children ?? (
        <>
          <p className="mt-5 text-lg font-semibold">
            Drop your file{multiple ? "s" : ""} here
          </p>
          <p className="mt-1 text-sm text-foreground/50">
            or click to browse
          </p>
        </>
      )}
      {hint && <p className="mt-3 text-xs text-foreground/40">{hint}</p>}
    </div>
  );
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
