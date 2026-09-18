import Link from "next/link";
import { ChevronRight, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import type { Tool } from "@/lib/tools";
import { getCategory } from "@/lib/tools";

export function ToolShell({
  tool,
  children,
}: {
  tool: Tool;
  children: ReactNode;
}) {
  const category = getCategory(tool.category);

  return (
    <section className="mx-auto max-w-4xl px-4 pb-28 pt-32">
      {/* breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-foreground/50">
        <Link href="/" className="hover:text-foreground">
          Home
        </Link>
        <ChevronRight className="h-4 w-4" />
        <Link href="/tools" className="hover:text-foreground">
          Tools
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground/80">{tool.name}</span>
      </nav>

      {/* header */}
      <div className="mt-6 flex items-start gap-4">
        {category && (
          <div
            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${category.gradient} shadow-lg`}
          >
            <category.icon className="h-7 w-7 text-white" />
          </div>
        )}
        <div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {tool.name}
          </h1>
          <p className="mt-2 max-w-2xl text-foreground/60">
            {tool.description}
          </p>
        </div>
      </div>

      {/* privacy badge */}
      <div className="mt-5 inline-flex items-center gap-2 rounded-full glass px-3 py-1.5 text-xs text-foreground/70">
        <ShieldCheck className="h-4 w-4 text-emerald-400" />
        Processed entirely in your browser — your files never leave your device.
      </div>

      {/* body */}
      <div className="mt-8">{children}</div>
    </section>
  );
}
