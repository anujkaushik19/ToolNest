"use client";

import { ArrowRight } from "lucide-react";
import { Reveal } from "./Reveal";

export function CTA() {
  return (
    <section className="relative mx-auto max-w-6xl px-4 py-20">
      <Reveal>
        <div className="relative overflow-hidden rounded-[2rem] px-8 py-16 text-center sm:px-16">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-600/40 via-accent-violet/20 to-accent-cyan/30" />
          <div className="absolute inset-0 grid-pattern opacity-40" />
          <div className="absolute -left-20 -top-20 h-64 w-64 animate-float rounded-full bg-brand-500/40 blur-3xl" />
          <div className="absolute -bottom-20 -right-20 h-64 w-64 animate-float-slow rounded-full bg-accent-cyan/30 blur-3xl" />

          <div className="relative z-10">
            <h2 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">
              Ready to sort all your files
              <br />
              in <span className="gradient-text">one place?</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-foreground/70">
              Join millions who ditched a dozen sketchy websites for one they
              trust. Free to start — no card, no catch.
            </p>
            <a
              href="#tools"
              className="group mt-8 inline-flex items-center gap-2 rounded-2xl bg-white px-8 py-4 text-base font-semibold text-brand-700 shadow-glow-lg transition-transform hover:scale-105"
            >
              Get started free
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </a>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
