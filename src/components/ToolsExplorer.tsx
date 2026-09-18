"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Search, ArrowUpRight, Sparkles } from "lucide-react";
import { categories, tools } from "@/lib/tools";

export function ToolsExplorer() {
  const params = useSearchParams();
  const initialCategory = params.get("category") ?? "all";
  const [active, setActive] = useState(initialCategory);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    return tools.filter((t) => {
      const matchesCategory = active === "all" || t.category === active;
      const q = query.trim().toLowerCase();
      const matchesQuery =
        !q ||
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });
  }, [active, query]);

  return (
    <div className="mx-auto max-w-7xl px-4 pb-28 pt-32">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          All <span className="gradient-text">tools</span>
        </h1>
        <p className="mt-4 text-lg text-foreground/60">
          Every tool in one place. Search, pick a category, and get going.
        </p>
      </div>

      {/* search */}
      <div className="mx-auto mt-10 max-w-xl">
        <div className="flex items-center gap-3 rounded-2xl glass px-4 py-3">
          <Search className="h-5 w-5 text-foreground/40" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tools, e.g. 'compress'"
            className="w-full bg-transparent text-sm outline-none placeholder:text-foreground/40"
          />
        </div>
      </div>

      {/* category filters */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
        <FilterChip
          label="All"
          active={active === "all"}
          onClick={() => setActive("all")}
        />
        {categories.map((c) => (
          <FilterChip
            key={c.id}
            label={c.title}
            active={active === c.id}
            onClick={() => setActive(c.id)}
          />
        ))}
      </div>

      {/* grid */}
      {filtered.length === 0 ? (
        <p className="mt-16 text-center text-foreground/50">
          No tools match your search.
        </p>
      ) : (
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((t, i) => {
            const cat = categories.find((c) => c.id === t.category)!;
            const isLive = t.status === "live";
            const card = (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: Math.min(i * 0.03, 0.3) }}
                whileHover={{ y: -4 }}
                className={`group relative flex h-full flex-col overflow-hidden rounded-2xl glass p-6 ${
                  isLive ? "glass-hover cursor-pointer" : "opacity-70"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${cat.gradient}`}
                  >
                    <cat.icon className="h-5 w-5 text-white" />
                  </div>
                  {isLive ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-300">
                      <Sparkles className="h-3 w-3" /> Live
                    </span>
                  ) : (
                    <span className="rounded-full bg-white/5 px-2.5 py-1 text-xs font-medium text-foreground/50">
                      Soon
                    </span>
                  )}
                </div>
                <h3 className="mt-4 flex items-center gap-1.5 text-lg font-semibold">
                  {t.name}
                  {isLive && (
                    <ArrowUpRight className="h-4 w-4 text-foreground/30 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-foreground" />
                  )}
                </h3>
                <p className="mt-1.5 text-sm text-foreground/55">
                  {t.description}
                </p>
              </motion.div>
            );

            return isLive ? (
              <Link key={t.slug} href={`/tools/${t.slug}`}>
                {card}
              </Link>
            ) : (
              <div key={t.slug}>{card}</div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
        active
          ? "bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-glow"
          : "glass text-foreground/70 hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}
