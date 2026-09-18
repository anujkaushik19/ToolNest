"use client";

import { useMemo, useState } from "react";
import { KeyRound, ShieldCheck, ShieldAlert } from "lucide-react";

const SAMPLE =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." +
  "eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IlRvb2xuZXN0IiwiaWF0IjoxNzI2NjAwMDAwLCJleHAiOjE3MjY2ODY0MDB9." +
  "3Q0X7m8mZ0aQmFhRz0m6r0m3Yy0m3Yy0m3Yy0m3Yy0";

function b64urlDecode(part: string): string {
  let s = part.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const bin = atob(s);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function pretty(json: string): string {
  try {
    return JSON.stringify(JSON.parse(json), null, 2);
  } catch {
    return json;
  }
}

const TIME_CLAIMS: Record<string, string> = {
  exp: "Expires",
  iat: "Issued at",
  nbf: "Not before",
};

export function JwtDecoder() {
  const [token, setToken] = useState("");

  const decoded = useMemo<
    | null
    | { ok: false; error: string }
    | { ok: true; header: string; payload: string; claims: Record<string, unknown>; signature: string }
  >(() => {
    const t = token.trim();
    if (!t) return null;
    const parts = t.split(".");
    if (parts.length < 2)
      return { ok: false, error: "A JWT has three dot-separated parts (header.payload.signature)." };
    try {
      const header = b64urlDecode(parts[0]);
      const payload = b64urlDecode(parts[1]);
      const claims = JSON.parse(payload) as Record<string, unknown>;
      return { ok: true, header: pretty(header), payload: pretty(payload), claims, signature: parts[2] ?? "" };
    } catch {
      return { ok: false, error: "Couldn't decode this token — check it's a valid JWT." };
    }
  }, [token]);

  const now = Math.floor(Date.now() / 1000);
  const expClaim = decoded?.ok ? (decoded.claims.exp as number | undefined) : undefined;
  const isExpired = typeof expClaim === "number" && expClaim < now;

  return (
    <div className="space-y-4">
      <LocalNotice />

      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-foreground/50">JWT</label>
        <button onClick={() => setToken(SAMPLE)} className="text-xs text-brand-300 hover:text-brand-200">
          Try a sample
        </button>
      </div>
      <textarea
        value={token}
        onChange={(e) => setToken(e.target.value)}
        spellCheck={false}
        placeholder="Paste a JSON Web Token…"
        className="h-28 w-full resize-none rounded-2xl border border-white/10 bg-white/[0.02] p-4 font-mono text-sm outline-none transition focus:border-brand-400/60"
      />

      {decoded && !decoded.ok && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {decoded.error}
        </div>
      )}

      {decoded && decoded.ok && (
        <>
          {typeof expClaim === "number" && (
            <div
              className={`rounded-xl border px-4 py-3 text-sm ${
                isExpired
                  ? "border-rose-500/30 bg-rose-500/10 text-rose-200"
                  : "border-emerald-500/25 bg-emerald-500/10 text-emerald-100"
              }`}
            >
              {isExpired ? "This token has expired." : "This token is still valid."}
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground/50">Header</label>
              <pre className="h-56 overflow-auto rounded-2xl border border-white/10 bg-white/[0.02] p-4 font-mono text-sm text-sky-100/90">
                {decoded.header}
              </pre>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground/50">Payload</label>
              <pre className="h-56 overflow-auto rounded-2xl border border-white/10 bg-white/[0.02] p-4 font-mono text-sm text-emerald-100/90">
                {decoded.payload}
              </pre>
            </div>
          </div>

          {/* human-readable time claims */}
          {Object.keys(TIME_CLAIMS).some((k) => k in decoded.claims) && (
            <div className="flex flex-wrap gap-3">
              {Object.entries(TIME_CLAIMS).map(([key, label]) => {
                const v = decoded.claims[key];
                if (typeof v !== "number") return null;
                return (
                  <div key={key} className="rounded-xl glass px-4 py-2 text-sm">
                    <span className="text-foreground/50">{label}: </span>
                    <span className="font-medium">{new Date(v * 1000).toLocaleString()}</span>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex items-start gap-3 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/90">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
            <p>
              The signature is <b>not verified</b> — decoding only reveals the contents. Never trust a token&apos;s
              claims without checking its signature on your server.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

function LocalNotice() {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100/90">
      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
      <p className="flex items-center gap-1.5">
        <KeyRound className="h-3.5 w-3.5" />
        Decoding happens locally — your token never leaves the browser.
      </p>
    </div>
  );
}
