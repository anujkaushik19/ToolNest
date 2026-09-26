"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Banknote, CreditCard, Minus, Plus, QrCode, Search, ShoppingCart, Trash2, UserRound } from "lucide-react";
import { useBiz, money, computeTotals } from "@/lib/biz/store";
import type { BillLine, PaymentMode } from "@/lib/biz/types";
import { Button, EmptyState, Input, Select, cn } from "@/components/biz/ui";

const PAYMENT_MODES: { id: PaymentMode; label: string; icon: typeof Banknote }[] = [
  { id: "cash", label: "Cash", icon: Banknote },
  { id: "upi", label: "UPI", icon: QrCode },
  { id: "card", label: "Card", icon: CreditCard },
  { id: "credit", label: "Credit", icon: UserRound },
];

export default function BillingPage() {
  const router = useRouter();
  const { tenant, items, contacts, createBill } = useBiz();
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [contactId, setContactId] = useState("");
  const [walkIn, setWalkIn] = useState("");
  const [mode, setMode] = useState<PaymentMode>("cash");

  const cfg = tenant?.config;

  const active = useMemo(() => items.filter((i) => i.active), [items]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return active;
    return active.filter((i) => i.name.toLowerCase().includes(q));
  }, [active, query]);

  const lines: BillLine[] = useMemo(() => {
    return Object.entries(cart)
      .map(([id, qty]) => {
        const item = items.find((i) => i.id === id);
        if (!item || qty <= 0) return null;
        return { itemId: item.id, name: item.name, qty, price: item.price, taxRate: item.taxRate };
      })
      .filter((l): l is BillLine => l !== null);
  }, [cart, items]);

  const totals = useMemo(() => computeTotals(lines), [lines]);
  const count = lines.reduce((s, l) => s + l.qty, 0);

  if (!tenant || !cfg) return null;

  const setQty = (id: string, qty: number) => {
    setCart((prev) => {
      const next = { ...prev };
      if (qty <= 0) delete next[id];
      else next[id] = qty;
      return next;
    });
  };

  function checkout() {
    if (lines.length === 0) return;
    const contact = contacts.find((c) => c.id === contactId);
    const contactName = contact?.name || walkIn.trim() || undefined;
    if (mode === "credit" && !contact) return;
    const bill = createBill({
      lines,
      payments: [{ mode, amount: totals.total }],
      contactId: contact?.id,
      contactName,
    });
    if (bill) router.push(`/biz/app/receipt/${bill.id}`);
  }

  const creditDisabled = mode === "credit" && !contactId;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      {/* Item picker */}
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">New {cfg.labels.bill}</h1>
          <p className="text-sm text-slate-500">Tap {cfg.labels.itemPlural.toLowerCase()} to add them to the {cfg.labels.bill.toLowerCase()}.</p>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Search ${cfg.labels.itemPlural.toLowerCase()}…`} className="pl-9" />
        </div>

        {active.length === 0 ? (
          <EmptyState
            icon={ShoppingCart}
            title={`No ${cfg.labels.itemPlural.toLowerCase()} to bill`}
            hint={`Add ${cfg.labels.itemPlural.toLowerCase()} first, then come back to start billing.`}
            action={<Button onClick={() => router.push("/biz/app/items")}>Add {cfg.labels.itemPlural.toLowerCase()}</Button>}
          />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {filtered.map((i) => {
              const qty = cart[i.id] ?? 0;
              return (
                <button
                  key={i.id}
                  onClick={() => setQty(i.id, qty + 1)}
                  className={cn(
                    "card-elevated lift relative flex flex-col items-start gap-1 p-4 text-left",
                    qty > 0 && "ring-2 ring-indigo-400",
                  )}
                >
                  {qty > 0 ? (
                    <span className="absolute right-2 top-2 grid h-6 min-w-6 place-items-center rounded-full bg-indigo-600 px-1.5 text-xs font-semibold text-white">{qty}</span>
                  ) : null}
                  <span className="line-clamp-2 pr-6 text-sm font-medium text-slate-800">{i.name}</span>
                  <span className="text-sm font-semibold text-indigo-600">{money(i.price, tenant.currency)}</span>
                  {i.trackStock && typeof i.stock === "number" ? (
                    <span className={cn("text-[11px]", i.stock <= 5 ? "text-amber-600" : "text-slate-400")}>{i.stock} in stock</span>
                  ) : (
                    <span className="text-[11px] capitalize text-slate-400">{i.itemType}</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Cart */}
      <div className="lg:sticky lg:top-4 lg:self-start">
        <div className="card-elevated flex max-h-[calc(100vh-8rem)] flex-col p-0">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div className="flex items-center gap-2 font-semibold text-slate-900">
              <ShoppingCart className="h-4 w-4 text-indigo-500" /> Current {cfg.labels.bill}
            </div>
            {count > 0 ? <span className="text-sm text-slate-400">{count} item{count > 1 ? "s" : ""}</span> : null}
          </div>

          <div className="scroll-light flex-1 overflow-y-auto px-5 py-3">
            {lines.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-400">No items added yet.</p>
            ) : (
              <div className="space-y-3">
                {lines.map((l) => (
                  <div key={l.itemId} className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800">{l.name}</p>
                      <p className="text-xs text-slate-400">{money(l.price, tenant.currency)}{l.taxRate ? ` · ${l.taxRate}% GST` : ""}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => setQty(l.itemId!, l.qty - 1)} className="grid h-7 w-7 place-items-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50">
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-6 text-center text-sm font-medium">{l.qty}</span>
                      <button onClick={() => setQty(l.itemId!, l.qty + 1)} className="grid h-7 w-7 place-items-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50">
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <span className="w-16 text-right text-sm font-semibold text-slate-800">{money(l.price * l.qty, tenant.currency)}</span>
                    <button onClick={() => setQty(l.itemId!, 0)} className="grid h-7 w-7 place-items-center rounded-lg text-slate-300 hover:bg-rose-50 hover:text-rose-500">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4 border-t border-slate-100 px-5 py-4">
            {/* Customer */}
            <div className="space-y-2">
              {contacts.length > 0 ? (
                <Select value={contactId} onChange={(e) => setContactId(e.target.value)}>
                  <option value="">Walk-in {cfg.labels.contact.toLowerCase()}</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}{c.phone ? ` · ${c.phone}` : ""}</option>
                  ))}
                </Select>
              ) : null}
              {!contactId ? (
                <Input value={walkIn} onChange={(e) => setWalkIn(e.target.value)} placeholder={`${cfg.labels.contact} name (optional)`} />
              ) : null}
            </div>

            {/* Totals */}
            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal</span><span>{money(totals.subtotal, tenant.currency)}</span>
              </div>
              {cfg.receipt.showGst && totals.tax > 0 ? (
                <div className="flex justify-between text-slate-500">
                  <span>GST</span><span>{money(totals.tax, tenant.currency)}</span>
                </div>
              ) : null}
              <div className="flex justify-between pt-1 text-base font-semibold text-slate-900">
                <span>Total</span><span>{money(totals.total, tenant.currency)}</span>
              </div>
            </div>

            {/* Payment mode */}
            <div className="grid grid-cols-4 gap-2">
              {PAYMENT_MODES.map((m) => {
                const Icon = m.icon;
                const activeMode = mode === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setMode(m.id)}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-xl border px-2 py-2 text-xs font-medium transition",
                      activeMode ? "border-indigo-400 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-500 hover:bg-slate-50",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {m.label}
                  </button>
                );
              })}
            </div>
            {creditDisabled ? <p className="text-xs text-rose-500">Select a {cfg.labels.contact.toLowerCase()} to bill on credit.</p> : null}

            <Button size="lg" className="w-full" onClick={checkout} disabled={lines.length === 0 || creditDisabled}>
              Charge {money(totals.total, tenant.currency)}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
