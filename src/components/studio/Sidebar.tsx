"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  FileText,
  FlaskConical,
  Grid2x2,
  IdCard,
  LayoutDashboard,
  Lightbulb,
  Film,
  Megaphone,
  Sparkles,
  UserPlus,
  Users,
} from "lucide-react";

type NavItem = { href: string; label: string; icon: typeof Users; match?: "exact" | "prefix" };

const AGENCY: NavItem[] = [
  { href: "/studio/agency", label: "Command Center", icon: Building2, match: "exact" },
  { href: "/studio/agency/campaigns", label: "Campaigns", icon: Megaphone, match: "prefix" },
  { href: "/studio/agency/import", label: "Add creator", icon: UserPlus, match: "prefix" },
];

const CREATOR: NavItem[] = [
  { href: "/studio/brief", label: "Monday Brief", icon: Sparkles },
  { href: "/studio", label: "Overview", icon: LayoutDashboard },
  { href: "/studio/posts", label: "Content", icon: Grid2x2 },
  { href: "/studio/reels", label: "Reel Autopsy", icon: Film },
  { href: "/studio/content", label: "What's Working", icon: Lightbulb },
  { href: "/studio/plan", label: "Growth Plan", icon: FlaskConical },
  { href: "/studio/audience", label: "Audience", icon: Users },
  { href: "/studio/report", label: "Weekly Report", icon: FileText },
  { href: "/studio/media-kit", label: "Media Kit", icon: IdCard },
];

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden w-60 shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
      <div className="flex h-16 items-center gap-2 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-sm font-bold text-white">
          T
        </div>
        <div className="leading-tight">
          <div className="text-sm font-bold text-slate-900">Toolnest</div>
          <div className="text-[11px] font-medium text-indigo-600">Creator Studio</div>
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        <NavGroup label="Agency" items={AGENCY} pathname={pathname} />
        <div className="pt-4">
          <NavGroup label="Creator view" items={CREATOR} pathname={pathname} />
        </div>
      </nav>
      <div className="border-t border-slate-200 p-4">
        <Link
          href="/tools"
          className="block rounded-xl px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-900"
        >
          ← Back to tools
        </Link>
      </div>
    </aside>
  );
}

function NavGroup({ label, items, pathname }: { label: string; items: NavItem[]; pathname: string }) {
  return (
    <div className="space-y-1">
      <div className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      {items.map((item) => {
        const active = item.match === "prefix" ? pathname.startsWith(item.href) : pathname === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${
              active
                ? "bg-indigo-50 text-indigo-700"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <Icon className={`h-4 w-4 ${active ? "text-indigo-600" : "text-slate-400"}`} />
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
