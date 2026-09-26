"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus, Search, Trash2, Package } from "lucide-react";
import { useBiz, money } from "@/lib/biz/store";
import type { Item, ItemType } from "@/lib/biz/types";
import { Badge, Button, DynamicFields, EmptyState, Field, Input, Modal, Select } from "@/components/biz/ui";

interface Draft {
  name: string;
  itemType: ItemType;
  price: string;
  taxRate: string;
  unit: string;
  trackStock: boolean;
  stock: string;
  hsnSac: string;
  active: boolean;
  attributes: Record<string, string | number>;
}

function emptyDraft(itemType: ItemType, tax: number, unit: string): Draft {
  return {
    name: "",
    itemType,
    price: "",
    taxRate: String(tax),
    unit,
    trackStock: itemType === "product",
    stock: "",
    hsnSac: "",
    active: true,
    attributes: {},
  };
}

export default function ItemsPage() {
  const { tenant, items, addItem, updateItem, deleteItem } = useBiz();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);

  const cfg = tenant?.config;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => i.name.toLowerCase().includes(q));
  }, [items, query]);

  if (!tenant || !cfg) return null;

  function startAdd() {
    setEditingId(null);
    setDraft(emptyDraft(cfg!.itemTypes[0], cfg!.taxDefault, cfg!.units[0] ?? ""));
    setOpen(true);
  }

  function startEdit(item: Item) {
    setEditingId(item.id);
    setDraft({
      name: item.name,
      itemType: item.itemType,
      price: String(item.price),
      taxRate: String(item.taxRate),
      unit: item.unit ?? "",
      trackStock: item.trackStock,
      stock: item.stock !== undefined ? String(item.stock) : "",
      hsnSac: item.hsnSac ?? "",
      active: item.active,
      attributes: { ...item.attributes },
    });
    setOpen(true);
  }

  function save() {
    if (!draft || !draft.name.trim()) return;
    const payload = {
      itemType: draft.itemType,
      name: draft.name.trim(),
      price: Number(draft.price) || 0,
      taxRate: Number(draft.taxRate) || 0,
      unit: draft.unit || undefined,
      trackStock: draft.trackStock,
      stock: draft.trackStock ? Number(draft.stock) || 0 : undefined,
      hsnSac: draft.hsnSac || undefined,
      attributes: draft.attributes,
      active: draft.active,
    };
    if (editingId) updateItem(editingId, payload);
    else addItem(payload);
    setOpen(false);
    setDraft(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{cfg.labels.itemPlural}</h1>
          <p className="text-sm text-slate-500">{items.length} {cfg.labels.itemPlural.toLowerCase()} in your catalogue</p>
        </div>
        <Button onClick={startAdd}>
          <Plus className="h-4 w-4" /> Add {cfg.labels.item.toLowerCase()}
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Search ${cfg.labels.itemPlural.toLowerCase()}…`} className="pl-9" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Package}
          title={items.length === 0 ? `No ${cfg.labels.itemPlural.toLowerCase()} yet` : "No matches"}
          hint={items.length === 0 ? `Add your ${cfg.labels.itemPlural.toLowerCase()} to start billing.` : "Try a different search."}
          action={items.length === 0 ? <Button onClick={startAdd}><Plus className="h-4 w-4" /> Add {cfg.labels.item.toLowerCase()}</Button> : undefined}
        />
      ) : (
        <div className="card-elevated overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-3 font-medium">{cfg.labels.item}</th>
                  <th className="px-5 py-3 font-medium">Price</th>
                  <th className="px-5 py-3 font-medium">GST</th>
                  <th className="px-5 py-3 font-medium">Stock</th>
                  <th className="px-5 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((i) => (
                  <tr key={i.id} className="transition hover:bg-slate-50/60">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-800">{i.name}</span>
                        {!i.active ? <Badge tone="slate">Inactive</Badge> : null}
                      </div>
                      <span className="text-xs capitalize text-slate-400">{i.itemType}{i.unit ? ` · per ${i.unit}` : ""}</span>
                    </td>
                    <td className="px-5 py-3 font-medium text-slate-800">{money(i.price, tenant.currency)}</td>
                    <td className="px-5 py-3 text-slate-500">{i.taxRate ? `${i.taxRate}%` : "—"}</td>
                    <td className="px-5 py-3">
                      {i.trackStock && typeof i.stock === "number" ? (
                        <Badge tone={i.stock === 0 ? "red" : i.stock <= 5 ? "amber" : "green"}>{i.stock}</Badge>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => startEdit(i)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => deleteItem(i.id)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-500">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        open={open && !!draft}
        onClose={() => setOpen(false)}
        title={editingId ? `Edit ${cfg.labels.item.toLowerCase()}` : `Add ${cfg.labels.item.toLowerCase()}`}
        wide
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>{editingId ? "Save changes" : `Add ${cfg.labels.item.toLowerCase()}`}</Button>
          </>
        }
      >
        {draft ? (
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label={`${cfg.labels.item} name`} required>
                <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. Full Cream Milk" />
              </Field>
            </div>
            {cfg.itemTypes.length > 1 ? (
              <Field label="Type">
                <Select value={draft.itemType} onChange={(e) => setDraft({ ...draft, itemType: e.target.value as ItemType })}>
                  {cfg.itemTypes.map((t) => (
                    <option key={t} value={t} className="capitalize">{t}</option>
                  ))}
                </Select>
              </Field>
            ) : null}
            <Field label="Price (₹)" required>
              <Input type="number" value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} placeholder="0" />
            </Field>
            <Field label="GST %">
              <Input type="number" value={draft.taxRate} onChange={(e) => setDraft({ ...draft, taxRate: e.target.value })} placeholder="0" />
            </Field>
            <Field label="Unit">
              <Select value={draft.unit} onChange={(e) => setDraft({ ...draft, unit: e.target.value })}>
                <option value="">None</option>
                {cfg.units.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </Select>
            </Field>
            {cfg.receipt.showGst ? (
              <Field label="HSN / SAC">
                <Input value={draft.hsnSac} onChange={(e) => setDraft({ ...draft, hsnSac: e.target.value })} placeholder="Optional" />
              </Field>
            ) : null}
            <div className="sm:col-span-2">
              <label className="flex items-center gap-2.5 text-sm text-slate-700">
                <input type="checkbox" checked={draft.trackStock} onChange={(e) => setDraft({ ...draft, trackStock: e.target.checked })} className="h-4 w-4 rounded border-slate-300 text-indigo-600" />
                Track stock for this {cfg.labels.item.toLowerCase()}
              </label>
            </div>
            {draft.trackStock ? (
              <Field label="Current stock">
                <Input type="number" value={draft.stock} onChange={(e) => setDraft({ ...draft, stock: e.target.value })} placeholder="0" />
              </Field>
            ) : null}
            <DynamicFields
              fields={cfg.itemFields}
              values={draft.attributes}
              onChange={(key, value) => setDraft({ ...draft, attributes: { ...draft.attributes, [key]: value } })}
            />
            <div className="sm:col-span-2">
              <label className="flex items-center gap-2.5 text-sm text-slate-700">
                <input type="checkbox" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} className="h-4 w-4 rounded border-slate-300 text-indigo-600" />
                Active (available for billing)
              </label>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
