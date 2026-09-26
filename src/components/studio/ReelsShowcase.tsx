"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { Play, Eye, UserPlus, Sparkles } from "lucide-react";
import type { CreatorData } from "@/lib/studio/types";
import { benchmark, mediaMetrics } from "@/lib/studio/metrics";
import { ScorePill, compact } from "@/components/studio/ui";
import { TiltCard, Stagger, StaggerItem } from "@/components/studio/motion";
import ReelPlayer from "@/components/studio/ReelPlayer";
import type { ReelCardData } from "@/components/studio/ReelsCarousel3D";

const ReelsCarousel3D = dynamic(() => import("@/components/studio/ReelsCarousel3D"), {
  ssr: false,
  loading: () => <div className="h-[380px] w-full animate-pulse rounded-2xl bg-slate-200/50 sm:h-[420px]" />,
});

export default function ReelsShowcase({ data }: { data: CreatorData }) {
  const [active, setActive] = useState<ReelCardData | null>(null);

  const cards = useMemo<ReelCardData[]>(() => {
    const bench = benchmark(data.media);
    return data.media
      .filter((m) => m.mediaType === "REEL" || m.mediaType === "VIDEO")
      .map((m) => ({ media: m, views: m.insights.views, follows: m.insights.follows, score: mediaMetrics(m, bench).score }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 9);
  }, [data.media]);

  if (cards.length === 0) return null;

  return (
    <section className="mt-10">
      <div className="mb-3 flex items-end justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Sparkles className="h-4 w-4 text-indigo-500" />
            Your top Reels
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Ranked against your own average. Drag to spin, or use the arrows.
            {data.isDemo ? " Connect your account to play the real thing." : ""}
          </p>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-950 p-2 shadow-xl ring-1 ring-slate-900/10">
        {/* ambient stage glows so the deck floats on light, not a flat void */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-6 h-64 w-[46rem] max-w-full -translate-x-1/2 rounded-full bg-indigo-500/25 blur-[90px]" />
          <div className="absolute -left-16 bottom-0 h-56 w-72 rounded-full bg-fuchsia-500/20 blur-[80px]" />
          <div className="absolute -right-16 top-10 h-56 w-72 rounded-full bg-cyan-400/15 blur-[80px]" />
          <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_-10%,transparent_55%,rgba(2,4,14,0.65)_100%)]" />
        </div>
        <div className="relative">
          <ReelsCarousel3D cards={cards} onOpen={(i) => setActive(cards[i])} />
        </div>
      </div>

      <Stagger className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6">
        {cards.slice(0, 6).map((card, i) => (
          <StaggerItem key={card.media.id}>
            <TiltCard max={10} spotlight="rgba(129,140,248,0.22)">
              <button
                type="button"
                onClick={() => setActive(card)}
                aria-label={`Play reel: ${card.media.hook || card.media.caption}`}
                className="group/card relative block aspect-[9/16] w-full overflow-hidden rounded-2xl p-3 text-left shadow-lg ring-1 ring-white/10"
                style={{ background: `linear-gradient(155deg, ${card.media.tileColor} 0%, #0b1220 135%)` }}
              >
                {/* sheen */}
                <div className="pointer-events-none absolute inset-x-0 -top-1/2 h-full bg-gradient-to-b from-white/20 to-transparent" />

                <div className="relative flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span className="flex h-5 w-5 items-center justify-center rounded-md bg-white/90 text-[10px] font-bold text-slate-900 shadow-sm">
                      {i + 1}
                    </span>
                    <span className="rounded-md bg-white/15 px-1.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
                      {card.media.topic}
                    </span>
                  </span>
                  <ScorePill score={card.score} />
                </div>

                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/40 backdrop-blur-sm transition duration-300 group-hover/card:scale-110 group-hover/card:bg-white/25">
                    <Play className="h-4 w-4 translate-x-[1px] fill-white text-white" />
                  </span>
                </div>

                <div className="absolute inset-x-3 bottom-3">
                  <p className="line-clamp-2 text-xs font-semibold leading-snug text-white drop-shadow">
                    {card.media.hook || card.media.caption}
                  </p>
                  <div className="mt-2 flex items-center gap-3 border-t border-white/15 pt-2 text-[11px] font-medium text-white/85">
                    <span className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {compact(card.views)}
                    </span>
                    <span className="flex items-center gap-1">
                      <UserPlus className="h-3 w-3" />
                      {compact(card.follows)}
                    </span>
                  </div>
                </div>
              </button>
            </TiltCard>
          </StaggerItem>
        ))}
      </Stagger>

      <ReelPlayer reel={active} account={data.account} onClose={() => setActive(null)} />
    </section>
  );
}
