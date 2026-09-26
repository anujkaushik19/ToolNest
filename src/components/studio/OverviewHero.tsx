"use client";

import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";
import dynamic from "next/dynamic";
import { Sparkles } from "lucide-react";
import { AnimatedNumber } from "./motion";

// WebGL scene is client-only + lazy so three.js never touches SSR or other pages.
const HeroScene = dynamic(() => import("./HeroScene").then((m) => m.HeroScene), {
  ssr: false,
  loading: () => null,
});

const SPRING = { stiffness: 120, damping: 18, mass: 0.7 };

/**
 * The overview hero: an animated gradient stage with cursor parallax and a
 * floating, tilting 3D glass stat card. Pure CSS/framer-motion — no 3D lib.
 */
export function OverviewHero({
  title,
  subtitle,
  isDemo,
  followers,
  followerPct,
  gained,
}: {
  title: string;
  subtitle: string;
  isDemo: boolean;
  followers: number;
  followerPct: number;
  gained: number;
}) {
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);

  const rotateX = useSpring(useTransform(my, [0, 1], [12, -12]), SPRING);
  const rotateY = useSpring(useTransform(mx, [0, 1], [-14, 14]), SPRING);
  const orbX = useSpring(useTransform(mx, [0, 1], [-24, 24]), SPRING);
  const orbY = useSpring(useTransform(my, [0, 1], [-18, 18]), SPRING);
  const orb2X = useSpring(useTransform(mx, [0, 1], [20, -20]), SPRING);
  const orb2Y = useSpring(useTransform(my, [0, 1], [14, -14]), SPRING);

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width);
    my.set((e.clientY - r.top) / r.height);
  }
  function onLeave() {
    mx.set(0.5);
    my.set(0.5);
  }

  return (
    <motion.section
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="relative mb-6 overflow-hidden rounded-3xl border border-white/10 p-7 text-white shadow-[0_30px_70px_-30px_rgba(79,70,229,0.65)] sm:p-9"
      style={{ perspective: 1200 }}
    >
      {/* animated gradient base */}
      <div className="absolute inset-0 -z-20 animate-gradient-x bg-[linear-gradient(120deg,#4f46e5_0%,#7c3aed_35%,#c026d3_70%,#4f46e5_100%)] bg-[length:200%_100%]" />
      {/* rotating conic sheen */}
      <div className="animate-aurora absolute -inset-1/2 -z-10 bg-[conic-gradient(from_0deg,transparent_0deg,rgba(255,255,255,0.18)_60deg,transparent_140deg)] opacity-60" />
      {/* grain */}
      <div
        className="absolute inset-0 -z-10 opacity-[0.12] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />
      {/* parallax orbs */}
      <motion.div
        style={{ x: orbX, y: orbY }}
        className="pointer-events-none absolute -left-10 -top-16 h-56 w-56 rounded-full bg-white/25 blur-3xl"
      />
      <motion.div
        style={{ x: orb2X, y: orb2Y }}
        className="pointer-events-none absolute -bottom-24 right-10 h-64 w-64 rounded-full bg-fuchsia-300/30 blur-3xl"
      />

      <div className="relative flex flex-col items-start justify-between gap-8 sm:flex-row sm:items-center">
        <div className="max-w-xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider ring-1 ring-white/25 backdrop-blur">
            {isDemo ? (
              <>
                <Sparkles className="h-3 w-3" /> Demo workspace
              </>
            ) : (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-300" />
                </span>
                Live account
              </>
            )}
          </span>
          <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            {title}
          </h1>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-white/80">{subtitle}</p>
        </div>

        {/* WebGL orb + floating glass stat chip in front of it */}
        <motion.div
          style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
          className="relative h-60 w-full shrink-0 sm:h-64 sm:w-80"
        >
          {/* three.js scene */}
          <div className="absolute inset-0 [transform:translateZ(0)]">
            <HeroScene className="!absolute inset-0" />
          </div>
          {/* radial glow under the orb */}
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_60%_45%,rgba(196,181,253,0.35),transparent_60%)] blur-2xl" />

          {/* floating glass stat chip */}
          <div
            className="absolute bottom-1 left-1 w-44 rounded-2xl border border-white/25 bg-white/10 p-4 backdrop-blur-xl [transform:translateZ(60px)]"
            style={{ boxShadow: "0 20px 50px -20px rgba(0,0,0,0.5)" }}
          >
            <div className="text-[10px] font-semibold uppercase tracking-wider text-white/70">
              Followers
            </div>
            <div className="mt-0.5 text-3xl font-bold tracking-tight">
              <AnimatedNumber value={followers} format="compact" />
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-emerald-400/20 px-2 py-0.5 text-[11px] font-semibold text-emerald-100 ring-1 ring-emerald-300/30">
                ▲ {Math.abs(followerPct).toFixed(1)}%
              </span>
              <span className="text-[11px] text-white/70">
                +<AnimatedNumber value={gained} format="int" />
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.section>
  );
}
