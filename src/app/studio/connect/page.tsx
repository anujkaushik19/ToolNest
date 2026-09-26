import Link from "next/link";
import { AtSign, Check, Lock, ShieldCheck, TriangleAlert } from "lucide-react";
import { getConnection } from "@/lib/studio/session";
import { isConfigured } from "@/lib/studio/instagram";
import { Card } from "@/components/studio/ui";

const MESSAGES: Record<string, { tone: "ok" | "warn" | "error"; text: string }> = {
  ok: { tone: "ok", text: "Instagram connected. Your dashboard is now showing live data." },
  denied: { tone: "warn", text: "You cancelled the connection. No data was accessed." },
  error: { tone: "error", text: "Something went wrong connecting. Please try again." },
  unconfigured: {
    tone: "warn",
    text: "The Meta app isn't configured yet. Add META_APP_ID, META_APP_SECRET and META_REDIRECT_URI to .env.local.",
  },
};

export default async function ConnectPage({
  searchParams,
}: {
  searchParams: { status?: string; message?: string };
}) {
  const conn = await getConnection();
  const configured = isConfigured();
  const status = searchParams.status ? MESSAGES[searchParams.status] : undefined;

  if (conn) {
    return (
      <div className="mx-auto max-w-lg">
        <Card className="p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <Check className="h-7 w-7" />
          </div>
          <h1 className="mt-4 text-xl font-bold text-slate-900">You&apos;re connected</h1>
          <p className="mt-2 text-sm text-slate-500">
            {conn.pageName ? `Linked via ${conn.pageName}. ` : ""}Your studio is showing live data from your account.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Link
              href="/studio"
              className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Open dashboard
            </Link>
            <a
              href="/api/instagram/disconnect"
              className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Disconnect
            </a>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      {status && (
        <div
          className={`mb-4 flex items-start gap-2 rounded-xl border p-3 text-sm ${
            status.tone === "ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : status.tone === "error"
                ? "border-rose-200 bg-rose-50 text-rose-800"
                : "border-amber-200 bg-amber-50 text-amber-800"
          }`}
        >
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {status.text}
            {searchParams.message ? <span className="mt-1 block text-xs opacity-80">{searchParams.message}</span> : null}
          </span>
        </div>
      )}

      <Card className="overflow-hidden">
        <div className="bg-gradient-to-br from-indigo-600 to-fuchsia-600 px-8 py-8 text-white">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
            <AtSign className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-2xl font-bold">Connect your Instagram</h1>
          <p className="mt-2 text-sm text-white/85">
            Securely link your own account to turn your real insights into a growth plan. Read-only — we never post,
            message, or touch anyone else&apos;s account.
          </p>
        </div>

        <div className="space-y-4 p-8">
          <Requirement text="Your Instagram is a Business or Creator account" />
          <Requirement text="It's linked to a Facebook Page you manage" />
          <Requirement text="You grant read-only insights access via Meta" />

          <a
            href={configured ? "/api/instagram/login" : undefined}
            aria-disabled={!configured}
            className={`mt-2 flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white transition ${
              configured
                ? "bg-gradient-to-r from-indigo-600 to-fuchsia-600 hover:opacity-95"
                : "pointer-events-none cursor-not-allowed bg-slate-300"
            }`}
          >
            <AtSign className="h-4 w-4" />
            Continue with Facebook
          </a>
          {!configured && (
            <p className="text-center text-xs text-slate-400">
              Add your Meta app credentials to <code className="rounded bg-slate-100 px-1">.env.local</code> to enable this.
            </p>
          )}

          <Link
            href="/studio"
            className="block text-center text-sm font-medium text-slate-500 hover:text-slate-700"
          >
            Explore with demo data instead →
          </Link>

          <div className="mt-4 flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
            <span>
              We request the minimum Meta permissions to read your own account&apos;s insights. You can disconnect any
              time, which removes our access token.
            </span>
          </div>
          <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
            <Lock className="h-3 w-3" /> Your login happens on Facebook — we never see your password.
          </div>
        </div>
      </Card>
    </div>
  );
}

function Requirement({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3 text-sm text-slate-700">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
        <Check className="h-3 w-3" />
      </span>
      {text}
    </div>
  );
}
