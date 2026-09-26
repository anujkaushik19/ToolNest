"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type {
  Appointment,
  Bill,
  BillLine,
  Contact,
  Item,
  Payment,
  Subscription,
  Tenant,
} from "./types";
import { configFromPack, getPack } from "./packs";

const STORAGE_KEY = "toolnest.biz.v1";

interface BizState {
  tenants: Tenant[];
  items: Item[];
  contacts: Contact[];
  bills: Bill[];
  appointments: Appointment[];
  subscriptions: Subscription[];
  currentTenantId: string | null;
}

const EMPTY: BizState = {
  tenants: [],
  items: [],
  contacts: [],
  bills: [],
  appointments: [],
  subscriptions: [],
  currentTenantId: null,
};

// ---- helpers ---------------------------------------------------------------

export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "id-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function money(amount: number, currency = "INR"): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function computeTotals(lines: BillLine[]): { subtotal: number; tax: number; total: number } {
  let subtotal = 0;
  let tax = 0;
  for (const l of lines) {
    const lineTotal = l.price * l.qty;
    subtotal += lineTotal;
    tax += (lineTotal * l.taxRate) / 100;
  }
  subtotal = round2(subtotal);
  tax = round2(tax);
  return { subtotal, tax, total: round2(subtotal + tax) };
}

// ---- context ---------------------------------------------------------------

interface BizContextValue {
  loaded: boolean;
  tenants: Tenant[];
  tenant: Tenant | null;
  items: Item[];
  contacts: Contact[];
  bills: Bill[];
  appointments: Appointment[];
  subscriptions: Subscription[];
  provisionTenant: (input: {
    category: string;
    name: string;
    phone?: string;
    gstin?: string;
    address?: string;
  }) => Tenant | null;
  selectTenant: (id: string) => void;
  deleteTenant: (id: string) => void;
  addItem: (item: Omit<Item, "id" | "tenantId">) => void;
  updateItem: (id: string, patch: Partial<Item>) => void;
  deleteItem: (id: string) => void;
  addContact: (contact: Omit<Contact, "id" | "tenantId" | "createdAt" | "dues">) => Contact | null;
  updateContact: (id: string, patch: Partial<Contact>) => void;
  deleteContact: (id: string) => void;
  createBill: (input: {
    lines: BillLine[];
    payments: Payment[];
    contactId?: string;
    contactName?: string;
  }) => Bill | null;
  addAppointment: (appt: Omit<Appointment, "id" | "tenantId">) => void;
  updateAppointment: (id: string, patch: Partial<Appointment>) => void;
  addSubscription: (sub: Omit<Subscription, "id" | "tenantId">) => void;
  updateSubscription: (id: string, patch: Partial<Subscription>) => void;
  getBill: (id: string) => Bill | undefined;
}

const BizContext = createContext<BizContextValue | null>(null);

export function BizProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<BizState>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const hydrated = useRef(false);

  // Load once on mount (client only).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<BizState>;
        setState({ ...EMPTY, ...parsed });
      }
    } catch {
      // corrupt storage → start clean
    }
    hydrated.current = true;
    setLoaded(true);
  }, []);

  // Persist on every change (after first load).
  useEffect(() => {
    if (!hydrated.current) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore quota / private-mode errors
    }
  }, [state]);

  const tenant = useMemo(
    () => state.tenants.find((t) => t.id === state.currentTenantId) ?? null,
    [state.tenants, state.currentTenantId],
  );

  const tid = tenant?.id ?? null;
  const items = useMemo(() => state.items.filter((i) => i.tenantId === tid), [state.items, tid]);
  const contacts = useMemo(() => state.contacts.filter((c) => c.tenantId === tid), [state.contacts, tid]);
  const bills = useMemo(
    () => state.bills.filter((b) => b.tenantId === tid).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    [state.bills, tid],
  );
  const appointments = useMemo(
    () => state.appointments.filter((a) => a.tenantId === tid),
    [state.appointments, tid],
  );
  const subscriptions = useMemo(
    () => state.subscriptions.filter((s) => s.tenantId === tid),
    [state.subscriptions, tid],
  );

  const provisionTenant = useCallback<BizContextValue["provisionTenant"]>((input) => {
    const pack = getPack(input.category);
    if (!pack) return null;
    const t: Tenant = {
      id: uid(),
      name: input.name.trim(),
      category: pack.id,
      currency: "INR",
      gstin: input.gstin?.trim() || undefined,
      phone: input.phone?.trim() || undefined,
      address: input.address?.trim() || undefined,
      config: configFromPack(pack),
      createdAt: new Date().toISOString(),
    };
    const seeded: Item[] = pack.seedItems.map((s) => ({
      id: uid(),
      tenantId: t.id,
      itemType: s.itemType,
      name: s.name,
      price: s.price,
      taxRate: s.taxRate ?? pack.taxDefault,
      unit: s.unit,
      trackStock: s.trackStock ?? false,
      stock: s.stock,
      attributes: s.attributes ?? {},
      active: true,
    }));
    setState((prev) => ({
      ...prev,
      tenants: [...prev.tenants, t],
      items: [...prev.items, ...seeded],
      currentTenantId: t.id,
    }));
    return t;
  }, []);

  const selectTenant = useCallback((id: string) => {
    setState((prev) => ({ ...prev, currentTenantId: id }));
  }, []);

  const deleteTenant = useCallback((id: string) => {
    setState((prev) => {
      const tenants = prev.tenants.filter((t) => t.id !== id);
      return {
        ...prev,
        tenants,
        items: prev.items.filter((i) => i.tenantId !== id),
        contacts: prev.contacts.filter((c) => c.tenantId !== id),
        bills: prev.bills.filter((b) => b.tenantId !== id),
        appointments: prev.appointments.filter((a) => a.tenantId !== id),
        subscriptions: prev.subscriptions.filter((s) => s.tenantId !== id),
        currentTenantId: prev.currentTenantId === id ? (tenants[0]?.id ?? null) : prev.currentTenantId,
      };
    });
  }, []);

  const addItem = useCallback<BizContextValue["addItem"]>((item) => {
    if (!tid) return;
    setState((prev) => ({ ...prev, items: [...prev.items, { ...item, id: uid(), tenantId: tid }] }));
  }, [tid]);

  const updateItem = useCallback<BizContextValue["updateItem"]>((id, patch) => {
    setState((prev) => ({
      ...prev,
      items: prev.items.map((i) => (i.id === id ? { ...i, ...patch } : i)),
    }));
  }, []);

  const deleteItem = useCallback((id: string) => {
    setState((prev) => ({ ...prev, items: prev.items.filter((i) => i.id !== id) }));
  }, []);

  const addContact = useCallback<BizContextValue["addContact"]>((contact) => {
    if (!tid) return null;
    const c: Contact = { ...contact, id: uid(), tenantId: tid, dues: 0, createdAt: new Date().toISOString() };
    setState((prev) => ({ ...prev, contacts: [...prev.contacts, c] }));
    return c;
  }, [tid]);

  const updateContact = useCallback<BizContextValue["updateContact"]>((id, patch) => {
    setState((prev) => ({
      ...prev,
      contacts: prev.contacts.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));
  }, []);

  const deleteContact = useCallback((id: string) => {
    setState((prev) => ({ ...prev, contacts: prev.contacts.filter((c) => c.id !== id) }));
  }, []);

  const createBill = useCallback<BizContextValue["createBill"]>((input) => {
    if (!tenant) return null;
    const count = state.bills.filter((b) => b.tenantId === tenant.id).length;
    const prefix = tenant.config.labels.bill.slice(0, 3).toUpperCase();
    const totals = computeTotals(input.lines);
    const bill: Bill = {
      id: uid(),
      tenantId: tenant.id,
      number: `${prefix}-${String(count + 1).padStart(4, "0")}`,
      contactId: input.contactId,
      contactName: input.contactName,
      lines: input.lines,
      subtotal: totals.subtotal,
      tax: totals.tax,
      total: totals.total,
      payments: input.payments,
      createdAt: new Date().toISOString(),
    };
    setState((prev) => {
      // decrement stock where tracked
      const soldByItem = new Map<string, number>();
      for (const l of input.lines) if (l.itemId) soldByItem.set(l.itemId, (soldByItem.get(l.itemId) ?? 0) + l.qty);
      const nextItems = prev.items.map((i) => {
        const sold = soldByItem.get(i.id);
        if (sold && i.trackStock && typeof i.stock === "number") {
          return { ...i, stock: round2(i.stock - sold) };
        }
        return i;
      });
      // credit payments add to contact dues
      const credit = input.payments.filter((p) => p.mode === "credit").reduce((s, p) => s + p.amount, 0);
      const nextContacts =
        credit > 0 && input.contactId
          ? prev.contacts.map((c) => (c.id === input.contactId ? { ...c, dues: round2(c.dues + credit) } : c))
          : prev.contacts;
      return { ...prev, bills: [...prev.bills, bill], items: nextItems, contacts: nextContacts };
    });
    return bill;
  }, [tenant, state.bills]);

  const addAppointment = useCallback<BizContextValue["addAppointment"]>((appt) => {
    if (!tid) return;
    setState((prev) => ({ ...prev, appointments: [...prev.appointments, { ...appt, id: uid(), tenantId: tid }] }));
  }, [tid]);

  const updateAppointment = useCallback<BizContextValue["updateAppointment"]>((id, patch) => {
    setState((prev) => ({
      ...prev,
      appointments: prev.appointments.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    }));
  }, []);

  const addSubscription = useCallback<BizContextValue["addSubscription"]>((sub) => {
    if (!tid) return;
    setState((prev) => ({ ...prev, subscriptions: [...prev.subscriptions, { ...sub, id: uid(), tenantId: tid }] }));
  }, [tid]);

  const updateSubscription = useCallback<BizContextValue["updateSubscription"]>((id, patch) => {
    setState((prev) => ({
      ...prev,
      subscriptions: prev.subscriptions.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    }));
  }, []);

  const getBill = useCallback((id: string) => state.bills.find((b) => b.id === id), [state.bills]);

  const value: BizContextValue = {
    loaded,
    tenants: state.tenants,
    tenant,
    items,
    contacts,
    bills,
    appointments,
    subscriptions,
    provisionTenant,
    selectTenant,
    deleteTenant,
    addItem,
    updateItem,
    deleteItem,
    addContact,
    updateContact,
    deleteContact,
    createBill,
    addAppointment,
    updateAppointment,
    addSubscription,
    updateSubscription,
    getBill,
  };

  return <BizContext.Provider value={value}>{children}</BizContext.Provider>;
}

export function useBiz(): BizContextValue {
  const ctx = useContext(BizContext);
  if (!ctx) throw new Error("useBiz must be used within <BizProvider>");
  return ctx;
}
