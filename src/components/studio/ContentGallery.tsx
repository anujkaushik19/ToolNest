"use client";

import { useEffect, useMemo, useState } from "react";
import { Bookmark, Eye, Heart, MessageCircle, Play, Share2, X, ExternalLink } from "lucide-react";
import type { CreatorData, Media } from "@/lib/studio/types";
import { benchmark, mediaMetrics } from "@/lib/studio/metrics";
import { ScorePill, compact } from "@/components/studio/ui";

type Filter = "all" | "Reel" | "Carousel" | "Image";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "Reel", label: "Reels" },
  { key: "Carousel", label: "Carousels" },
  { key: "Image", label: "Images" },
];

function poster(m: Media): React.CSSProperties {
  return { background: `linear-gradient(150deg, ${m.tileColor} 0%, #0b1220 130%)` };
}

export default function ContentGallery({ data }: { data: CreatorData }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [active, setActive] = useState<Media | null>(null);
  const bench = useMemo(() => benchmark(data.media), [data.media]);

  const items = useMemo(
    () => (filter === "all" ? data.media : data.media.filter((m) => m.format === filter)),
    [data.media, filter],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setActive(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Your Content</h1>
          <p className="mt-1 text-sm text-slate-500">
            Every post from your account, newest first. {data.isDemo ? "Connect to play your real Reels." : "Tap any Reel to play it."}
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                filter === f.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((m) => {
          const x = mediaMetrics(m, bench);
          const isVideo = m.format === "Reel";
          return (
            <button
              key={m.id}
              onClick={() => setActive(m)}
              className="group relative overflow-hidden rounded-2xl text-left ring-1 ring-slate-200 transition hover:ring-indigo-300"
              style={{ aspectRatio: "4 / 5" }}
            >
              {m.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.thumbnailUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
              ) : (
                <div className="absolute inset-0" style={poster(m)} />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/25" />

              <div className="absolute left-2 top-2 flex items-center gap-1.5">
                <span className="rounded-md bg-black/40 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur">
                  {m.topic}
                </span>
              </div>
              <div className="absolute right-2 top-2">
                <ScorePill score={x.score} />
              </div>

              {isVideo && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/25 backdrop-blur transition group-hover:scale-110">
                    <Play className="h-5 w-5 translate-x-0.5 fill-white text-white" />
                  </span>
                </div>
              )}

              <div className="absolute inset-x-0 bottom-0 p-3">
                <p className="line-clamp-2 text-xs font-semibold text-white drop-shadow">“{m.hook}”</p>
                <div className="mt-1.5 flex items-center gap-3 text-[11px] font-medium text-white/90">
                  <span className="inline-flex items-center gap-1"><Eye className="h-3 w-3" />{compact(m.insights.views)}</span>
                  <span className="inline-flex items-center gap-1"><Heart className="h-3 w-3" />{compact(m.insights.likes)}</span>
                  <span className="inline-flex items-center gap-1"><Bookmark className="h-3 w-3" />{compact(m.insights.saved)}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {items.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-200 p-12 text-center text-sm text-slate-400">
          No {filter === "all" ? "posts" : filter.toLowerCase() + "s"} yet.
        </div>
      )}

      {active && <Lightbox media={active} bench={bench} isDemo={data.isDemo} onClose={() => setActive(null)} />}
    </div>
  );
}

function Lightbox({
  media,
  bench,
  isDemo,
  onClose,
}: {
  media: Media;
  bench: ReturnType<typeof benchmark>;
  isDemo: boolean;
  onClose: () => void;
}) {
  const x = mediaMetrics(media, bench);
  const canPlay = Boolean(media.mediaUrl) && media.format === "Reel";
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl md:flex-row"
        onClick={(e) => e.stopPropagation()}
      >
        {/* media */}
        <div className="relative flex items-center justify-center bg-black md:w-1/2" style={{ aspectRatio: "4 / 5" }}>
          {canPlay ? (
            <video src={media.mediaUrl} controls autoPlay playsInline className="h-full w-full object-contain" />
          ) : media.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={media.thumbnailUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center text-center" style={poster(media)}>
              <Play className="h-10 w-10 fill-white/90 text-white/90" />
              <p className="mt-3 max-w-[80%] text-sm font-semibold text-white/95">“{media.hook}”</p>
              {isDemo && <p className="mt-3 text-[11px] text-white/70">Connect your account to play your real Reels</p>}
            </div>
          )}
        </div>

        {/* details */}
        <div className="flex min-w-0 flex-1 flex-col p-5 md:w-1/2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">{media.topic}</span>
              <span className="ml-2 text-xs text-slate-400">
                {new Date(media.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>
            </div>
            <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
              <X className="h-5 w-5" />
            </button>
          </div>

          <p className="mt-3 text-sm font-semibold text-slate-900">“{media.hook}”</p>
          {media.caption && <p className="mt-2 line-clamp-4 text-xs leading-relaxed text-slate-500">{media.caption}</p>}

          <div className="mt-4 grid grid-cols-3 gap-2">
            <Stat icon={<Eye className="h-4 w-4" />} label="Views" value={compact(media.insights.views)} />
            <Stat icon={<Heart className="h-4 w-4" />} label="Likes" value={compact(media.insights.likes)} />
            <Stat icon={<MessageCircle className="h-4 w-4" />} label="Comments" value={compact(media.insights.comments)} />
            <Stat icon={<Bookmark className="h-4 w-4" />} label="Saves" value={compact(media.insights.saved)} />
            <Stat icon={<Share2 className="h-4 w-4" />} label="Shares" value={compact(media.insights.shares)} />
            <Stat icon={<span className="text-xs font-bold">±</span>} label="Reach" value={compact(media.insights.reach)} />
          </div>

          <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
            <span className="text-xs font-medium text-slate-500">Performance score</span>
            <ScorePill score={x.score} />
          </div>

          <div className="mt-auto pt-4">
            {media.permalink ? (
              <a
                href={media.permalink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
              >
                <ExternalLink className="h-4 w-4" /> View on Instagram
              </a>
            ) : (
              <div className="rounded-xl bg-slate-50 px-4 py-2.5 text-center text-xs text-slate-400">
                Demo post — real posts link straight to Instagram
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-2.5 text-center">
      <div className="flex justify-center text-slate-400">{icon}</div>
      <div className="mt-1 text-sm font-bold text-slate-900">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-slate-400">{label}</div>
    </div>
  );
}
