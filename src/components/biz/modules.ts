import { BarChart3, CalendarClock, LayoutDashboard, Package, Receipt, Repeat, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Labels, ModuleId } from "@/lib/biz/types";

export interface NavEntry {
  icon: LucideIcon;
  route: string;
  label: (l: Labels) => string;
}

/** The dashboard is always present, independent of the pack's module list. */
export const HOME_NAV: NavEntry = {
  icon: LayoutDashboard,
  route: "",
  label: () => "Dashboard",
};

export const MODULE_NAV: Record<ModuleId, NavEntry> = {
  billing: { icon: Receipt, route: "billing", label: (l) => `New ${l.bill}` },
  items: { icon: Package, route: "items", label: (l) => l.itemPlural },
  contacts: { icon: Users, route: "contacts", label: (l) => l.contactPlural },
  appointments: { icon: CalendarClock, route: "appointments", label: () => "Appointments" },
  subscriptions: { icon: Repeat, route: "subscriptions", label: () => "Subscriptions" },
  reports: { icon: BarChart3, route: "reports", label: () => "Reports" },
};
