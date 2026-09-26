// Domain model for "BizNest" — a config-driven, multi-tenant
// business OS. A vertical (clinic, dairy, apparel…) is expressed entirely as a
// BusinessPack (labels + modules + custom fields + receipt + seed data), so
// adding a vertical is a new config object, never new core code.

export type ItemType = "product" | "service" | "subscription" | "package";

export type ModuleId =
  | "billing"
  | "items"
  | "contacts"
  | "appointments"
  | "subscriptions"
  | "reports";

export type FieldType = "text" | "number" | "select" | "textarea" | "date" | "phone";

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  options?: string[];
  required?: boolean;
  placeholder?: string;
}

/** What the UI *calls* the shared primitives for a given vertical. */
export interface Labels {
  contact: string;
  contactPlural: string;
  item: string;
  itemPlural: string;
  bill: string;
  billPlural: string;
}

export interface ReceiptConfig {
  size: "58mm" | "80mm" | "a4";
  showGst: boolean;
  footer?: string;
}

export interface SeedItem {
  name: string;
  itemType: ItemType;
  price: number;
  taxRate?: number;
  unit?: string;
  trackStock?: boolean;
  stock?: number;
  attributes?: Record<string, string | number>;
}

/** A vertical template. Adding a new business type = adding one of these. */
export interface BusinessPack {
  id: string;
  name: string;
  tagline: string;
  /** lucide-react icon name resolved by the UI. */
  icon: string;
  /** tailwind gradient stops, e.g. "from-indigo-500 to-fuchsia-500". */
  accent: string;
  labels: Labels;
  modules: ModuleId[];
  itemTypes: ItemType[];
  itemFields: FieldDef[];
  contactFields: FieldDef[];
  taxDefault: number;
  units: string[];
  receipt: ReceiptConfig;
  seedItems: SeedItem[];
}

/** The resolved, per-business configuration (pack defaults ← tenant overrides). */
export interface TenantConfig {
  labels: Labels;
  modules: ModuleId[];
  itemTypes: ItemType[];
  itemFields: FieldDef[];
  contactFields: FieldDef[];
  taxDefault: number;
  units: string[];
  receipt: ReceiptConfig;
  accent: string;
  icon: string;
}

export interface Tenant {
  id: string;
  name: string;
  category: string;
  currency: string;
  gstin?: string;
  phone?: string;
  address?: string;
  config: TenantConfig;
  createdAt: string;
}

export interface Item {
  id: string;
  tenantId: string;
  itemType: ItemType;
  name: string;
  price: number;
  taxRate: number;
  unit?: string;
  trackStock: boolean;
  stock?: number;
  hsnSac?: string;
  attributes: Record<string, string | number>;
  active: boolean;
}

export interface Contact {
  id: string;
  tenantId: string;
  name: string;
  phone?: string;
  attributes: Record<string, string | number>;
  dues: number;
  createdAt: string;
}

export interface BillLine {
  itemId?: string;
  name: string;
  qty: number;
  price: number;
  taxRate: number;
}

export type PaymentMode = "cash" | "upi" | "card" | "credit";

export interface Payment {
  mode: PaymentMode;
  amount: number;
}

export interface Bill {
  id: string;
  tenantId: string;
  number: string;
  contactId?: string;
  contactName?: string;
  lines: BillLine[];
  subtotal: number;
  tax: number;
  total: number;
  payments: Payment[];
  createdAt: string;
}

export interface Appointment {
  id: string;
  tenantId: string;
  contactId?: string;
  contactName: string;
  service: string;
  start: string;
  durationMin: number;
  notes?: string;
  status: "booked" | "done" | "cancelled";
}

export type Frequency = "daily" | "weekly" | "monthly";

export interface Subscription {
  id: string;
  tenantId: string;
  contactId?: string;
  contactName: string;
  itemName: string;
  qty: number;
  price: number;
  frequency: Frequency;
  startDate: string;
  active: boolean;
}
