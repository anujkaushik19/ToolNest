"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Download,
  Eye,
  EyeOff,
  FileText,
  Loader2,
  Lock,
  LockOpen,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import { Dropzone, formatBytes } from "@/components/Dropzone";

const API =
  process.env.NEXT_PUBLIC_CONVERT_API?.replace(/\/$/, "") || "http://localhost:8080";

const ALLOWED = /\.pdf$/i;

type Mode = "protect" | "unlock";

function PdfPasswordTool({ mode }: { mode: Mode }) {
  const isProtect = mode === "protect";

  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  const onFiles = useCallback((files: File[]) => {
    const pdf = files.find((f) => ALLOWED.test(f.name));
    if (!pdf) {
      setError("Please choose a PDF file.");
      return;
    }
    setError(null);
    setResultUrl((p) => (p && URL.revokeObjectURL(p), null));
    setFile(pdf);
  }, []);

  const submit = useCallback(async () => {
    if (!file) return;
    if (!password) {
      setError("Please enter the password.");
      return;
    }
    if (isProtect && password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("password", password);
      const resp = await fetch(`${API}/api/pdf/${mode}`, {
        method: "POST",
        body: form,
      });
      if (!resp.ok) {
        let msg = `Operation failed (${resp.status}).`;
        try {
          const j = await resp.json();
          if (j?.message) msg = Array.isArray(j.message) ? j.message[0] : j.message;
        } catch {
          /* non-JSON */
        }
        throw new Error(msg);
      }
      const blob = await resp.blob();
      setResultUrl((p) => {
        if (p) URL.revokeObjectURL(p);
        return URL.createObjectURL(blob);
      });
    } catch (err) {
      setError(
        err instanceof Error && err.message !== "Failed to fetch"
          ? err.message
          : "Couldn't reach the service. Is the backend running?"
      );
    } finally {
      setBusy(false);
    }
  }, [file, password, confirm, isProtect, mode]);

  const reset = () => {
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    setFile(null);
    setPassword("");
    setConfirm("");
    setResultUrl(null);
    setError(null);
  };

  useEffect(() => {
    return () => {
      if (resultUrl) URL.revokeObjectURL(resultUrl);
    };
  }, [resultUrl]);

  const downloadName =
    (file?.name.replace(/\.[^.]+$/, "") || "document") +
    (isProtect ? "-protected.pdf" : "-unlocked.pdf");

  if (!file) {
    return (
      <div className="space-y-4">
        <ServerNotice />
        <Dropzone
          accept=".pdf"
          onFiles={onFiles}
          hint={isProtect ? "PDF → password-protected PDF" : "Locked PDF → open PDF"}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ServerNotice />

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3 rounded-2xl glass p-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-600 to-slate-800">
          <FileText className="h-5 w-5 text-white" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{file.name}</p>
          <p className="text-xs text-foreground/50">{formatBytes(file.size)}</p>
        </div>
        <button
          onClick={reset}
          className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-sm text-foreground/70 transition hover:bg-white/5"
        >
          <RefreshCw className="h-4 w-4" /> New file
        </button>
      </div>

      {!resultUrl && (
        <div className="space-y-3 rounded-2xl glass p-4">
          <label className="block text-sm text-foreground/70">
            {isProtect ? "Set a password" : "Enter the PDF's password"}
          </label>
          <div className="relative">
            <input
              type={show ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              autoComplete={isProtect ? "new-password" : "current-password"}
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 pr-11 text-sm outline-none focus:border-brand-400"
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/50 hover:text-foreground"
              aria-label={show ? "Hide password" : "Show password"}
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {isProtect && (
            <input
              type={show ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Confirm password"
              autoComplete="new-password"
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm outline-none focus:border-brand-400"
            />
          )}
        </div>
      )}

      {resultUrl ? (
        <a
          href={resultUrl}
          download={downloadName}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-accent-cyan px-6 py-3.5 text-base font-semibold text-white shadow-glow transition-transform hover:scale-[1.02]"
        >
          <Download className="h-5 w-5" />{" "}
          {isProtect ? "Download protected PDF" : "Download unlocked PDF"}
        </a>
      ) : (
        <button
          onClick={submit}
          disabled={busy}
          className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-brand-600 px-6 py-3.5 text-base font-semibold text-white shadow-glow transition-transform hover:scale-[1.02] ${
            busy ? "opacity-60" : ""
          }`}
        >
          {busy ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />{" "}
              {isProtect ? "Protecting…" : "Unlocking…"}
            </>
          ) : isProtect ? (
            <>
              <Lock className="h-5 w-5" /> Protect PDF
            </>
          ) : (
            <>
              <LockOpen className="h-5 w-5" /> Unlock PDF
            </>
          )}
        </button>
      )}
    </div>
  );
}

function ServerNotice() {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/90">
      <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
      <p>
        This tool needs server-side processing, so your file and password are sent
        over an encrypted connection, processed in memory, and immediately
        discarded — nothing is stored. All our other tools run fully in your browser.
      </p>
    </div>
  );
}

export function ProtectPdf() {
  return <PdfPasswordTool mode="protect" />;
}

export function UnlockPdf() {
  return <PdfPasswordTool mode="unlock" />;
}
