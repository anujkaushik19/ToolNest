"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Reveal } from "./Reveal";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    desc: "Everything you need for everyday tasks.",
    features: [
      "Access to all core tools",
      "Files up to 50 MB",
      "In-browser processing",
      "3 tasks at a time",
    ],
    cta: "Start free",
    highlight: false,
  },
  {
    name: "Pro",
    price: "$6",
    period: "/month",
    desc: "For power users who do this daily.",
    features: [
      "Everything in Free",
      "Files up to 5 GB",
      "Unlimited batch pipelines",
      "AI tools & OCR",
      "No ads, priority speed",
      "Cloud storage & history",
    ],
    cta: "Go Pro",
    highlight: true,
  },
  {
    name: "Business",
    price: "$18",
    period: "/month",
    desc: "For teams and developers building on top.",
    features: [
      "Everything in Pro",
      "Team workspaces",
      "Developer API access",
      "White-label options",
      "Priority support",
    ],
    cta: "Contact sales",
    highlight: false,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="relative mx-auto max-w-7xl px-4 py-28">
      <Reveal className="mx-auto max-w-2xl text-center">
        <span className="text-sm font-semibold uppercase tracking-widest text-accent-cyan">
          Pricing
        </span>
        <h2 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
          Fair, <span className="gradient-text">transparent</span> pricing
        </h2>
        <p className="mt-4 text-lg text-foreground/60">
          Generous free tier. Upgrade only when you need more muscle.
        </p>
      </Reveal>

      <div className="mt-16 grid items-stretch gap-6 lg:grid-cols-3">
        {plans.map((p, i) => (
          <Reveal key={p.name} delay={i * 0.1}>
            <motion.div
              whileHover={{ y: -6 }}
              className={`relative flex h-full flex-col rounded-3xl p-8 ${
                p.highlight
                  ? "bg-gradient-to-b from-brand-500/20 to-transparent ring-2 ring-brand-500/60 shadow-glow-lg"
                  : "glass glass-hover"
              }`}
            >
              {p.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-brand-500 to-accent-cyan px-3 py-1 text-xs font-semibold text-white shadow-glow">
                  Most popular
                </span>
              )}
              <h3 className="text-lg font-semibold">{p.name}</h3>
              <p className="mt-1 text-sm text-foreground/55">{p.desc}</p>
              <div className="mt-5 flex items-end gap-1">
                <span className="text-4xl font-extrabold">{p.price}</span>
                <span className="mb-1 text-sm text-foreground/50">
                  {p.period}
                </span>
              </div>

              <ul className="mt-6 flex-1 space-y-3">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent-cyan" />
                    <span className="text-foreground/75">{f}</span>
                  </li>
                ))}
              </ul>

              <a
                href="#"
                className={`mt-8 rounded-xl px-5 py-3 text-center text-sm font-semibold transition-transform hover:scale-105 ${
                  p.highlight
                    ? "bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-glow"
                    : "glass text-foreground"
                }`}
              >
                {p.cta}
              </a>
            </motion.div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
