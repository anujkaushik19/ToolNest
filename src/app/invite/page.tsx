import Link from "next/link";
import { AtSign, ArrowRight, Check, Eye, Lock, ShieldCheck, X } from "lucide-react";

// Creator-facing invite. This is what an agency sends a creator. It leads with
// reassurance and what the creator GETS — never with what we take — because
// that framing is the whole reason a creator agrees to connect.
export default function InvitePage({
  searchParams,
}: {
  searchParams: { agency?: string; campaign?: string; handle?: string };
}) {
  const agency = searchParams.agency || "Your agency";
  const campaign = searchParams.campaign;

  const canSee = [
    "Your reach, views and follower count",
    "How each post performed (the numbers you already see)",
    "Basic audience breakdown (age, gender, location)",
  ];
  const cantSee = [
    "Your password — you never type it here",
    "Your DMs or private messages",
    "Ability to post, edit or delete anything",
  ];

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12 text-slate-900">
      <div className="mx-auto max-w-lg">
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-lg font-bold text-white">
            T
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight">You&apos;re invited to connect</h1>
          <p className="mt-2 text-sm text-slate-600">
            <span className="font-semibold text-slate-900">{agency}</span> invited you to link your Instagram
            {campaign ? (
              <>
                {" "}for the <span className="font-semibold text-slate-900">{campaign}</span> campaign
              </>
            ) : null}
            . It takes about 20 seconds.
          </p>
        </div>

        {/* You get this */}
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-indigo-800">
            <ShieldCheck className="h-4 w-4" /> What you get
          </div>
          <p className="mt-1.5 text-sm text-indigo-900/80">
            A free growth dashboard of your own — reach trends, your best posts, and a weekly plan. No more sending screenshots every week.
          </p>
        </div>

        {/* Transparency grid */}
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Eye className="h-4 w-4 text-slate-500" /> What we can see
            </div>
            <ul className="mt-3 space-y-2">
              {canSee.map((t) => (
                <li key={t} className="flex items-start gap-2 text-xs text-slate-600">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" /> {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Lock className="h-4 w-4 text-slate-500" /> What we can&apos;t
            </div>
            <ul className="mt-3 space-y-2">
              {cantSee.map((t) => (
                <li key={t} className="flex items-start gap-2 text-xs text-slate-600">
                  <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-500" /> {t}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-slate-500">
          It&apos;s read-only, covers only your own account, and you can disconnect in two taps from Instagram anytime.
        </p>

        {/* Actions */}
        <div className="mt-6 space-y-3">
          <a
            href="/api/instagram/login"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1877F2] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1568d8]"
          >
            <AtSign className="h-4 w-4" /> Continue with Facebook
          </a>
          <Link
            href="/invite/manual"
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            No Instagram Business account? Add your stats manually <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <p className="mt-6 text-center text-[11px] text-slate-400">
          Connecting uses Instagram&apos;s official login. BizNest never sees your password.
        </p>
      </div>
    </main>
  );
}
