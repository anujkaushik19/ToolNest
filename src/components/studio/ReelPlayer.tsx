"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Play, Pause, Volume2, VolumeX, Heart, MessageCircle, Share2, Bookmark } from "lucide-react";
import { ScorePill, compact } from "@/components/studio/ui";
import type { ReelCardData } from "@/components/studio/ReelsCarousel3D";

const DURATION = 9; // seconds per loop

interface Account {
  username: string;
  name: string;
}

function shade(hex: string, amt: number): string {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  const clamp = (v: number) => Math.max(0, Math.min(255, v));
  return `rgb(${clamp(((n >> 16) & 255) + amt)},${clamp(((n >> 8) & 255) + amt)},${clamp((n & 255) + amt)})`;
}

/** Procedural "reel" — an animated preview rendered to canvas (no video asset, fully offline). */
function drawFrame(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, color: string) {
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, shade(color, 34));
  g.addColorStop(Math.min(0.85, Math.max(0.2, 0.5 + 0.28 * Math.sin(t * 0.45))), color);
  g.addColorStop(1, shade(color, -64));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // drifting light blobs
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 4; i++) {
    const bx = w * (0.5 + 0.42 * Math.sin(t * 0.3 + i * 1.7));
    const by = h * (0.42 + 0.4 * Math.cos(t * 0.26 + i * 2.1));
    const br = Math.min(w, h) * (0.32 + 0.08 * Math.sin(t * 0.8 + i));
    const rg = ctx.createRadialGradient(bx, by, 0, bx, by, br);
    const tint = i % 2 === 0 ? "255,255,255" : "180,190,255";
    rg.addColorStop(0, `rgba(${tint},0.16)`);
    rg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, w, h);
  }

  // sweeping light streak
  const sx = ((t * 0.18) % 1.4 - 0.2) * w;
  const streak = ctx.createLinearGradient(sx, 0, sx + w * 0.35, h);
  streak.addColorStop(0, "rgba(255,255,255,0)");
  streak.addColorStop(0.5, "rgba(255,255,255,0.10)");
  streak.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = streak;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = "source-over";

  // bottom vignette
  const vg = ctx.createLinearGradient(0, h * 0.5, 0, h);
  vg.addColorStop(0, "rgba(4,6,16,0)");
  vg.addColorStop(1, "rgba(4,6,16,0.7)");
  ctx.fillStyle = vg;
  ctx.fillRect(0, h * 0.5, w, h * 0.5);

  // animated audio waveform
  const bars = 40;
  const bw = w / (bars * 1.6);
  const baseY = h * 0.9;
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  for (let i = 0; i < bars; i++) {
    const amp = (0.5 + 0.5 * Math.sin(t * 6 + i * 0.6)) * (0.4 + 0.6 * Math.sin(i * 0.4 + t));
    const bh = 6 + amp * h * 0.09;
    const x = w * 0.08 + i * bw * 1.6;
    const r = bw / 2;
    ctx.beginPath();
    ctx.roundRect(x, baseY - bh, bw, bh, r);
    ctx.fill();
  }
}

export default function ReelPlayer({ reel, account, onClose }: { reel: ReelCardData | null; account?: Account; onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [tSec, setTSec] = useState(0);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [following, setFollowing] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  // caption chunks that "tick in" like auto-generated subtitles
  const subtitles = useMemo(() => {
    if (!reel) return [] as string[];
    const words = (reel.media.caption || reel.media.hook || "").split(/\s+/).filter(Boolean);
    const chunks: string[] = [];
    for (let i = 0; i < words.length; i += 4) chunks.push(words.slice(i, i + 4).join(" "));
    return chunks.length ? chunks : [reel.media.hook || "Reel"];
  }, [reel]);

  useEffect(() => {
    if (!reel) return;
    setLiked(false);
    setSaved(false);
    setFollowing(false);
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === " ") {
        e.preventDefault();
        setPlaying((p) => !p);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [reel, onClose]);

  useEffect(() => {
    if (!reel) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let raf = 0;
    let elapsed = 0;
    let prev = performance.now();

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(r.width * dpr));
      canvas.height = Math.max(1, Math.round(r.height * dpr));
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min((now - prev) / 1000, 0.05);
      prev = now;
      if (playing) elapsed += dt;
      const t = elapsed;
      setProgress((elapsed % DURATION) / DURATION);
      setTSec(elapsed);
      ctx.save();
      ctx.scale(dpr, dpr);
      const r = canvas.getBoundingClientRect();
      drawFrame(ctx, r.width, r.height, t, reel.media.tileColor);
      ctx.restore();
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [reel, playing]);

  if (!reel) return null;
  const m = reel.media;
  const ins = m.insights;

  // counters ease up to target on open, then trickle for a "live" feel
  const ease = 1 - Math.pow(1 - Math.min(tSec / 1.4, 1), 3);
  const trickle = Math.max(0, tSec - 1.4);
  const likes = Math.round(ins.likes * ease) + Math.floor(trickle * 3) + (liked ? 1 : 0);
  const comments = Math.round(ins.comments * ease) + Math.floor(trickle * 0.4);
  const shares = Math.round(ins.shares * ease);
  const savesCount = Math.round(ins.saved * ease) + (saved ? 1 : 0);
  const subIndex = subtitles.length ? Math.min(subtitles.length - 1, Math.floor(progress * subtitles.length)) : 0;
  const handle = account?.username ?? "creator";
  const avatarLetter = (account?.name ?? account?.username ?? "C").charAt(0).toUpperCase();

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`Playing reel: ${m.hook || m.caption}`}
      onClick={onClose}
    >
      <div
        className="relative aspect-[9/16] h-[min(86vh,720px)] max-w-full overflow-hidden rounded-3xl bg-slate-900 shadow-2xl ring-1 ring-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

        {/* click canvas to toggle playback */}
        <button
          type="button"
          aria-label={playing ? "Pause" : "Play"}
          onClick={() => setPlaying((p) => !p)}
          className="absolute inset-0 flex items-center justify-center"
        >
          <span
            className={`flex h-16 w-16 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/40 backdrop-blur-sm transition ${
              playing ? "scale-90 opacity-0" : "scale-100 opacity-100"
            }`}
          >
            <Play className="h-6 w-6 translate-x-[2px] fill-white text-white" />
          </span>
        </button>

        {/* top bar */}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-4">
          <span className="rounded-md bg-white/15 px-2 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
            {m.topic}
          </span>
          <div className="pointer-events-auto flex items-center gap-2">
            <ScorePill score={reel.score} />
            <button
              ref={closeRef}
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white ring-1 ring-white/30 backdrop-blur-sm transition hover:bg-white/25"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* right action rail — Instagram-style engagement */}
        <div className="absolute bottom-32 right-3 flex flex-col items-center gap-4">
          <RailButton
            label={liked ? "Unlike" : "Like"}
            count={likes}
            active={liked}
            onClick={() => setLiked((v) => !v)}
            icon={<Heart className={`h-6 w-6 ${liked ? "fill-rose-500 text-rose-500" : "text-white"}`} />}
            bump={liked}
          />
          <RailButton label="Comments" count={comments} icon={<MessageCircle className="h-6 w-6 text-white" />} />
          <RailButton label="Shares" count={shares} icon={<Share2 className="h-6 w-6 text-white" />} />
          <RailButton
            label={saved ? "Unsave" : "Save"}
            count={savesCount}
            active={saved}
            onClick={() => setSaved((v) => !v)}
            icon={<Bookmark className={`h-6 w-6 ${saved ? "fill-amber-400 text-amber-400" : "text-white"}`} />}
            bump={saved}
          />
        </div>

        {/* ticking subtitles */}
        <div className="pointer-events-none absolute inset-x-0 bottom-40 flex justify-center px-6">
          <AnimatePresence mode="wait">
            <motion.p
              key={subIndex}
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
              className="rounded-lg bg-black/40 px-3 py-1.5 text-center text-sm font-bold text-white backdrop-blur-sm drop-shadow"
            >
              {subtitles[subIndex]}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* bottom: creator + follow + controls */}
        <div className="absolute inset-x-0 bottom-0 p-4">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-fuchsia-500 text-sm font-bold text-white ring-2 ring-white/70">
              {avatarLetter}
            </span>
            <span className="text-sm font-semibold text-white drop-shadow">@{handle}</span>
            <button
              type="button"
              onClick={() => setFollowing((v) => !v)}
              className={`ml-1 rounded-full px-3 py-1 text-xs font-semibold transition ${
                following ? "bg-white/20 text-white ring-1 ring-white/40" : "bg-white text-slate-900 hover:bg-white/90"
              }`}
            >
              {following ? "Following" : "Follow"}
            </button>
            <span className="ml-auto rounded-full bg-black/30 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/80 backdrop-blur-sm">
              Preview
            </span>
          </div>

          <p className="mb-2 line-clamp-2 text-xs font-medium leading-snug text-white/90 drop-shadow">
            {m.caption || m.hook}
          </p>

          {/* progress bar */}
          <div className="mb-3 h-1 w-full overflow-hidden rounded-full bg-white/20">
            <div className="h-full rounded-full bg-white" style={{ width: `${progress * 100}%` }} />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label={playing ? "Pause" : "Play"}
              onClick={() => setPlaying((p) => !p)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-900 shadow-sm transition hover:bg-white/90"
            >
              {playing ? <Pause className="h-4 w-4 fill-slate-900" /> : <Play className="h-4 w-4 translate-x-[1px] fill-slate-900" />}
            </button>
            <button
              type="button"
              aria-label={muted ? "Unmute" : "Mute"}
              onClick={() => setMuted((v) => !v)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white ring-1 ring-white/30 backdrop-blur-sm transition hover:bg-white/25"
            >
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            <span className="ml-auto text-xs font-semibold text-white/80">▶ {compact(reel.views)} views</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function RailButton({
  icon,
  count,
  label,
  onClick,
  active,
  bump,
}: {
  icon: React.ReactNode;
  count: number;
  label: string;
  onClick?: () => void;
  active?: boolean;
  bump?: boolean;
}) {
  return (
    <button type="button" aria-label={label} aria-pressed={active} onClick={onClick} className="flex flex-col items-center gap-1">
      <motion.span
        animate={bump ? { scale: [1, 1.35, 1] } : { scale: 1 }}
        transition={{ duration: 0.3 }}
        className="flex h-11 w-11 items-center justify-center rounded-full bg-black/25 ring-1 ring-white/15 backdrop-blur-sm"
      >
        {icon}
      </motion.span>
      <span className="text-[11px] font-semibold text-white drop-shadow">{compact(count)}</span>
    </button>
  );
}
