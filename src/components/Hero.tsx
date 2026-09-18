"use client";

import { motion } from "framer-motion";
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  FileText,
  Image as ImageIcon,
  Video,
  QrCode,
  FileType2,
  Music,
} from "lucide-react";
import { stats } from "@/lib/tools";

const floatingIcons = [
  { Icon: FileText, className: "left-[6%] top-[22%]", delay: 0, color: "text-rose-400" },
  { Icon: ImageIcon, className: "right-[8%] top-[18%]", delay: 1.2, color: "text-emerald-400" },
  { Icon: Video, className: "left-[12%] bottom-[16%]", delay: 0.6, color: "text-fuchsia-400" },
  { Icon: QrCode, className: "right-[12%] bottom-[20%]", delay: 1.8, color: "text-amber-400" },
  { Icon: FileType2, className: "left-[20%] top-[46%]", delay: 2.2, color: "text-blue-400" },
  { Icon: Music, className: "right-[20%] top-[48%]", delay: 0.9, color: "text-cyan-400" },
];

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.2 } },
};
const item = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const },
  },
};

export function Hero() {
  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 pt-28">
      {/* floating tool icons */}
      {floatingIcons.map(({ Icon, className, delay, color }, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6 + i * 0.15, duration: 0.6 }}
          className={`absolute hidden lg:block ${className}`}
        >
          <div
            className="flex h-14 w-14 animate-float items-center justify-center rounded-2xl glass shadow-glow"
            style={{ animationDelay: `${delay}s` }}
          >
            <Icon className={`h-6 w-6 ${color}`} />
          </div>
        </motion.div>
      ))}

      <motion.div
        variants={container}
        initial="hidden"
        animate="visible"
        className="relative z-10 mx-auto max-w-4xl text-center"
      >
        <motion.div variants={item} className="mb-6 flex justify-center">
          <div className="inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-sm">
            <Sparkles className="h-4 w-4 text-accent-cyan" />
            <span className="text-foreground/80">
              120+ tools · one portal · zero clutter
            </span>
          </div>
        </motion.div>

        <motion.h1
          variants={item}
          className="text-balance text-5xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl md:text-7xl"
        >
          Every file tool you need,
          <br />
          <span className="gradient-text bg-[length:200%_auto] animate-gradient-x">
            all in one place.
          </span>
        </motion.h1>

        <motion.p
          variants={item}
          className="mx-auto mt-6 max-w-2xl text-balance text-lg text-foreground/60 sm:text-xl"
        >
          Merge, convert, compress and edit PDFs, documents, images, audio and
          video — beautifully fast and privacy-first. No downloads, no clutter,
          free to start.
        </motion.p>

        <motion.div
          variants={item}
          className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
        >
          <a
            href="#tools"
            className="group inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-brand-600 px-7 py-3.5 text-base font-semibold text-white shadow-glow-lg transition-transform hover:scale-105"
          >
            Explore tools
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </a>
          <a
            href="#how"
            className="inline-flex items-center gap-2 rounded-2xl glass glass-hover px-7 py-3.5 text-base font-semibold text-foreground"
          >
            See how it works
          </a>
        </motion.div>

        <motion.div
          variants={item}
          className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm text-foreground/50"
        >
          <span className="inline-flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400" /> Files never leave
            your device
          </span>
          <span className="inline-flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-400" /> Instant, in-browser
            processing
          </span>
        </motion.div>

        {/* stats */}
        <motion.div
          variants={item}
          className="mx-auto mt-16 grid max-w-2xl grid-cols-2 gap-4 sm:grid-cols-4"
        >
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-2xl glass px-4 py-5 text-center"
            >
              <div className="gradient-text text-3xl font-bold">{s.value}</div>
              <div className="mt-1 text-xs text-foreground/50">{s.label}</div>
            </div>
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
}
