"use client";

import { Printer } from "lucide-react";

// Turns the report into a PDF with the browser's own print dialog — no library,
// no server, no cost. "Save as PDF" is a destination in every print dialog.
export function PrintButton({ className = "" }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className={`inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 ${className}`}
    >
      <Printer className="h-4 w-4" /> Save as PDF
    </button>
  );
}
