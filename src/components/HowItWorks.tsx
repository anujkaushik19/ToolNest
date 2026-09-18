"use client";

import { motion } from "framer-motion";
import { Upload, Settings2, Download } from "lucide-react";
import { Reveal } from "./Reveal";

const steps = [
  {
    icon: Upload,
    title: "Drop your file",
    desc: "Drag & drop or pick a file from your device or cloud. No sign-up needed to start.",
  },
  {
    icon: Settings2,
    title: "Pick your tool",
    desc: "Choose an action and tweak the options. Processing happens right in your browser.",
  },
  {
    icon: Download,
    title: "Download instantly",
    desc: "Grab your result in seconds. Your files auto-delete — nothing is kept.",
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="relative mx-auto max-w-6xl px-4 py-28">
      <Reveal className="mx-auto max-w-2xl text-center">
        <span className="text-sm font-semibold uppercase tracking-widest text-accent-cyan">
          How it works
        </span>
        <h2 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
          Three steps. <span className="gradient-text">That&apos;s it.</span>
        </h2>
      </Reveal>

      <div className="relative mt-20">
        {/* connecting line */}
        <div className="absolute left-0 right-0 top-8 hidden h-px bg-gradient-to-r from-transparent via-brand-500/40 to-transparent md:block" />

        <div className="grid gap-12 md:grid-cols-3">
          {steps.map((s, i) => (
            <Reveal key={s.title} delay={i * 0.15}>
              <div className="relative flex flex-col items-center text-center">
                <motion.div
                  whileHover={{ scale: 1.08 }}
                  className="relative z-10 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-accent-cyan shadow-glow"
                >
                  <s.icon className="h-7 w-7 text-white" />
                  <span className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-[#05060f] text-sm font-bold text-accent-cyan ring-1 ring-white/10">
                    {i + 1}
                  </span>
                </motion.div>
                <h3 className="mt-6 text-xl font-semibold">{s.title}</h3>
                <p className="mt-2 max-w-xs text-sm text-foreground/55">
                  {s.desc}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
