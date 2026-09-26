"use client";

import { useMemo, useState } from "react";
import { Phone, Plus, Search, Trash2, Users } from "lucide-react";
import { useBiz, money } from "@/lib/biz/store";
import type { Contact } from "@/lib/biz/types";
import { Badge, Button, DynamicFields, EmptyState, Field, Input, Modal } from "@/components/biz/ui";

interface Draft {
  name: string;
  phone: string;
  attributes: Record<string, string | number>;
}

export default function ContactsPage() {
  const { tenant, contacts, addContact, updateContact, deleteContact } = useBiz();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>({ name: "", phone: "", attributes: {} });

  const cfg = tenant?.config;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter((c) => c.name.toLowerCase().includes(q) || (c.phone ?? "").includes(q));
  }, [contacts, query]);

  if (!tenant || !cfg) return null;

  function startAdd() {
    setEditingId(null);
    setDraft({ name: "", phone: "", attributes: {} });
    setOpen(true);
  }

  function startEdit(c: Contact) {
    setEditingId(c.id);
    setDraft({ name: c.name, phone: c.phone ?? "", attributes: { ...c.attributes } });
    setOpen(true);
  }

  function save() {
    if (!draft.name.trim()) return;
    const payload = { name: draft.name.trim(), phone: draft.phone.trim() || undefined, attributes: draft.attributes };
    if (editingId) updateContact(editingId, payload);
    else addContact({ ...payload });
    setOpen(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{cfg.labels.contactPlural}</h1>
          <p className="text-sm text-slate-500">{contacts.length} {cfg.labels.contactPlural.toLowerCase()}</p>
        </div>
        <Button onClick={startAdd}>
          <Plus className="h-4 w-4" /> Add {cfg.labels.contact.toLowerCase()}
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Search ${cfg.labels.contactPlural.toLowerCase()}…`} className="pl-9" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title={contacts.length === 0 ? `No ${cfg.labels.contactPlural.toLowerCase()} yet` : "No matches"}
          hint={contacts.length === 0 ? `Add ${cfg.labels.contactPlural.toLowerCase()} to track dues and history.` : "Try a different search."}
          action={contacts.length === 0 ? <Button onClick={startAdd}><Plus className="h-4 w-4" /> Add {cfg.labels.contact.toLowerCase()}</Button> : undefined}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <div key={c.id} className="card-elevated lift p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-sm font-semibold text-white">
                    {c.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{c.name}</p>
                    {c.phone ? (
                      <p className="flex items-center gap-1 text-xs text-slate-500"><Phone className="h-3 w-3" /> {c.phone}</p>
                    ) : null}
                  </div>
                </div>
                <button onClick={() => deleteContact(c.id)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-300 hover:bg-rose-50 hover:text-rose-500">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-4 flex items-center justify-between">
                {c.dues > 0 ? <Badge tone="amber">Due {money(c.dues, tenant.currency)}</Badge> : <Badge tone="green">No dues</Badge>}
                <button onClick={() => startEdit(c)} className="text-sm font-medium text-indigo-600 hover:underline">Edit</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editingId ? `Edit ${cfg.labels.contact.toLowerCase()}` : `Add ${cfg.labels.contact.toLowerCase()}`}
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>{editingId ? "Save changes" : "Add"}</Button>
          </>
        }
      >
        <div className="grid gap-5">
          <Field label="Name" required>
            <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Full name" />
          </Field>
          <Field label="Phone">
            <Input type="tel" value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} placeholder="98765 43210" />
          </Field>
          <DynamicFields
            fields={cfg.contactFields}
            values={draft.attributes}
            onChange={(key, value) => setDraft({ ...draft, attributes: { ...draft.attributes, [key]: value } })}
          />
        </div>
      </Modal>
    </div>
  );
}
