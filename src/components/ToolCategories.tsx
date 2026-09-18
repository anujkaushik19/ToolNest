"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { categories, getToolsByCategory } from "@/lib/tools";
import { Reveal } from "./Reveal";

export function ToolCategories() {
  return (
    <section id="tools" className="relative mx-auto max-w-7xl px-4 py-28">
      <Reveal className="mx-auto max-w-2xl text-center">
        <span className="text-sm font-semibold uppercase tracking-widest text-accent-cyan">
          The toolkit
        </span>
        <h2 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
          One portal. <span className="gradient-text">Every format.</span>
        </h2>
        <p className="mt-4 text-lg text-foreground/60">
          Stop hopping between websites. Whatever the file, there&apos;s a tool for
          it here — fast, free and beautifully simple.
        </p>
      </Reveal>

      <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((cat, i) => {
          const catTools = getToolsByCategory(cat.id).slice(0, 6);
          return (
            <Reveal key={cat.id} delay={i * 0.08}>
              <motion.div whileHover={{ y: -6 }} className="h-full">
                <Link
                  href={`/tools?category=${cat.id}`}
                  className="group relative flex h-full flex-col overflow-hidden rounded-3xl glass glass-hover p-7"
                >
                  <div
                    className={`absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br ${cat.gradient} opacity-20 blur-2xl transition-opacity duration-500 group-hover:opacity-40`}
                  />
                  <div
                    className={`mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${cat.gradient} shadow-lg`}
                  >
                    <cat.icon className="h-7 w-7 text-white" />
                  </div>

                  <h3 className="flex items-center gap-2 text-xl font-semibold">
                    {cat.title}
                    <ArrowUpRight className="h-4 w-4 text-foreground/30 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-foreground" />
                  </h3>
                  <p className="mt-2 text-sm text-foreground/55">
                    {cat.description}
                  </p>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {catTools.map((t) => (
                      <span
                        key={t.slug}
                        className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-foreground/70"
                      >
                        {t.name}
                      </span>
                    ))}
                  </div>
                </Link>
              </motion.div>
            </Reveal>
          );
        })}
      </div>

      <Reveal delay={0.2} className="mt-12 text-center">
        <Link
          href="/tools"
          className="inline-flex items-center gap-2 rounded-2xl glass glass-hover px-6 py-3 text-sm font-semibold"
        >
          Browse all tools
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </Reveal>
    </section>
  );
}
