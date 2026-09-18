"use client";

import { ShieldCheck, Zap, Infinity as InfinityIcon, Layers, Wand2, Globe } from "lucide-react";
import { Reveal } from "./Reveal";

const features = [
  {
    icon: ShieldCheck,
    title: "Privacy-first by design",
    desc: "Most tools run entirely in your browser. Your files never touch our servers — and what we do process is auto-deleted within the hour.",
    color: "text-emerald-400",
  },
  {
    icon: Zap,
    title: "Blazing fast",
    desc: "No uploads for small tasks, no waiting. WebAssembly-powered processing gives you results the instant you drop a file.",
    color: "text-amber-400",
  },
  {
    icon: Layers,
    title: "Batch pipelines",
    desc: "Chain actions together — compress, watermark, then convert — and run them across dozens of files in a single click.",
    color: "text-brand-400",
  },
  {
    icon: Wand2,
    title: "AI superpowers",
    desc: "Remove backgrounds, upscale images, auto-caption videos and chat with your PDFs. The smart stuff, built in.",
    color: "text-accent-fuchsia",
  },
  {
    icon: InfinityIcon,
    title: "Truly unified",
    desc: "Upload once, use it across any tool. PDFs, docs, images, audio and video — no re-uploading between tools.",
    color: "text-accent-cyan",
  },
  {
    icon: Globe,
    title: "Works everywhere",
    desc: "Web, desktop and mobile, in 20+ languages. Plus a developer API so you can build on top of every engine we offer.",
    color: "text-sky-400",
  },
];

export function Features() {
  return (
    <section id="features" className="relative mx-auto max-w-7xl px-4 py-28">
      <Reveal className="mx-auto max-w-2xl text-center">
        <span className="text-sm font-semibold uppercase tracking-widest text-accent-cyan">
          Why Toolnest
        </span>
        <h2 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
          Built to feel <span className="gradient-text">effortless</span>
        </h2>
        <p className="mt-4 text-lg text-foreground/60">
          Top-class quality without the price tag or the clutter. Here&apos;s what
          sets us apart.
        </p>
      </Reveal>

      <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {features.map((f, i) => (
          <Reveal key={f.title} delay={i * 0.07}>
            <div className="group h-full rounded-3xl glass glass-hover p-7">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 ring-1 ring-white/10">
                <f.icon className={`h-6 w-6 ${f.color}`} />
              </div>
              <h3 className="text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-foreground/55">
                {f.desc}
              </p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
