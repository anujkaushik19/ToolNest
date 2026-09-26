"use client";

import { Lock, Sparkles } from "lucide-react";

/** Small gradient "Pro" pill for labelling premium features. */
export function ProBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white ${className}`}
    >
      <Sparkles className="h-3 w-3" /> Pro
    </span>
  );
}

/** Inline notice shown when a free user tries to use a Pro-only feature. */
export function UpgradePrompt({ feature }: { feature: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-purple-500/30 bg-purple-500/10 px-4 py-3 text-sm text-purple-100/90">
      <Lock className="mt-0.5 h-4 w-4 shrink-0 text-purple-300" />
      <p>
        <span className="font-semibold text-white">{feature}</span> is a BizNest
        Pro feature. Pro is coming soon — everything else stays free and private.
      </p>
    </div>
  );
}
