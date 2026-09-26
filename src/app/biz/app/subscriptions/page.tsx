"use client";

import { useState } from "react";
import { Plus, Repeat } from "lucide-react";
import { useBiz, money } from "@/lib/biz/store";
import type { Frequency } from "@/lib/biz/types";
import { Badge, Button, EmptyState, Field, Input, Modal, Select } from "@/components/biz/ui";

const FREQ_PER_MONTH: Record<Frequency, number> = { daily: 30, weekly: 4, monthly: 1 };

export default function SubscriptionsPage() {
  const { tenant, contacts, items, subscriptions, addSubscription, updateSubscription } = useBiz();
  const [open, setOpen] = useState(false);
  const [contactId, setContactId] = useState("");
  const [name, setName] = useState("");
  const [itemName, setItemName] = useState("");
  const [qty, setQty] = useState("1");
  const [price, setPrice] = useState("");
  const [frequency, setFrequency] = useState<Frequency>("daily");

  const cfg = tenant?.config;
  if (!tenant || !cfg) return null;

  function pickItem(value: string) {
    setItemName(value);
    const item = items.find((i) => i.name === value);
    if (item) setPrice(String(item.price));
  }

  function save() {
    const contact = contacts.find((c) => c.id === contactId);
    const finalName = contact?.name || name.trim();
    if (!finalName || !itemName) return;
    addSubscription({
      contactId: contact?.id,
      contactName: finalName,
      itemName,
      qty: Number(qty) || 1,
      price: Number(price) || 0,
      frequency,
      startDate: new Date().toISOString(),
      active: true,
    });
    setOpen(false);
    setContactId(""); setName(""); setItemName(""); setQty("1"); setPrice(""); setFrequency("daily");
  }

  const monthlyValue = subscriptions
    .filter((s) => s.active)
    .reduce((sum, s) => sum + s.price * s.qty * FREQ_PER_MONTH[s.frequency], 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Subscriptions</h1>
          <p className="text-sm text-slate-500">
            {subscriptions.filter((s) => s.active).length} active · est. {money(monthlyValue, tenant.currency)}/mo
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> New subscription
        </Button>
      </div>

      {subscriptions.length === 0 ? (
        <EmptyState icon={Repeat} title="No subscriptions yet" hint="Set up recurring deliveries for your regular customers." action={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> New subscription</Button>} />
      ) : (
        <div className="card-elevated overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-3 font-medium">{cfg.labels.contact}</th>
                  <th className="px-5 py-3 font-medium">{cfg.labels.item}</th>
                  <th className="px-5 py-3 font-medium">Frequency</th>
                  <th className="px-5 py-3 font-medium">Per delivery</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {subscriptions.map((s) => (
                  <tr key={s.id} className="transition hover:bg-slate-50/60">
                    <td className="px-5 py-3 font-medium text-slate-800">{s.contactName}</td>
                    <td className="px-5 py-3 text-slate-600">{s.itemName} × {s.qty}</td>
                    <td className="px-5 py-3 capitalize text-slate-500">{s.frequency}</td>
                    <td className="px-5 py-3 font-medium text-slate-800">{money(s.price * s.qty, tenant.currency)}</td>
                    <td className="px-5 py-3">
                      <button onClick={() => updateSubscription(s.id, { active: !s.active })}>
                        <Badge tone={s.active ? "green" : "slate"}>{s.active ? "Active" : "Paused"}</Badge>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="New subscription"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>Create</Button>
          </>
        }
      >
        <div className="grid gap-5">
          {contacts.length > 0 ? (
            <Field label={cfg.labels.contact}>
              <Select value={contactId} onChange={(e) => setContactId(e.target.value)}>
                <option value="">New / walk-in</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            </Field>
          ) : null}
          {!contactId ? (
            <Field label={`${cfg.labels.contact} name`} required>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
            </Field>
          ) : null}
          <Field label={cfg.labels.item} required>
            {items.length > 0 ? (
              <Select value={itemName} onChange={(e) => pickItem(e.target.value)}>
                <option value="">Select {cfg.labels.item.toLowerCase()}…</option>
                {items.map((i) => (
                  <option key={i.id} value={i.name}>{i.name}</option>
                ))}
              </Select>
            ) : (
              <Input value={itemName} onChange={(e) => setItemName(e.target.value)} placeholder="e.g. Full Cream Milk" />
            )}
          </Field>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Qty">
              <Input type="number" value={qty} onChange={(e) => setQty(e.target.value)} />
            </Field>
            <Field label="Price (₹)">
              <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
            </Field>
            <Field label="Frequency">
              <Select value={frequency} onChange={(e) => setFrequency(e.target.value as Frequency)}>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </Select>
            </Field>
          </div>
        </div>
      </Modal>
    </div>
  );
}
