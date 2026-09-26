"use client";

import { useMemo, useState } from "react";
import { CalendarClock, Check, Plus, X } from "lucide-react";
import { useBiz } from "@/lib/biz/store";
import { Badge, Button, EmptyState, Field, Input, Modal, Select, Textarea } from "@/components/biz/ui";

export default function AppointmentsPage() {
  const { tenant, contacts, items, appointments, addAppointment, updateAppointment } = useBiz();
  const [open, setOpen] = useState(false);
  const [contactId, setContactId] = useState("");
  const [name, setName] = useState("");
  const [service, setService] = useState("");
  const [start, setStart] = useState("");
  const [duration, setDuration] = useState("30");
  const [notes, setNotes] = useState("");

  const cfg = tenant?.config;

  const sorted = useMemo(
    () => [...appointments].sort((a, b) => (a.start < b.start ? -1 : 1)),
    [appointments],
  );

  if (!tenant || !cfg) return null;

  const services = items.filter((i) => i.itemType === "service");

  function save() {
    const contact = contacts.find((c) => c.id === contactId);
    const finalName = contact?.name || name.trim();
    if (!finalName || !start) return;
    addAppointment({
      contactId: contact?.id,
      contactName: finalName,
      service: service || "Appointment",
      start: new Date(start).toISOString(),
      durationMin: Number(duration) || 30,
      notes: notes.trim() || undefined,
      status: "booked",
    });
    setOpen(false);
    setContactId(""); setName(""); setService(""); setStart(""); setDuration("30"); setNotes("");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Appointments</h1>
          <p className="text-sm text-slate-500">{appointments.filter((a) => a.status === "booked").length} upcoming</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Book appointment
        </Button>
      </div>

      {sorted.length === 0 ? (
        <EmptyState icon={CalendarClock} title="No appointments yet" hint="Book your first appointment to see it here." action={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Book appointment</Button>} />
      ) : (
        <div className="space-y-3">
          {sorted.map((a) => {
            const d = new Date(a.start);
            return (
              <div key={a.id} className="card-elevated flex items-center gap-4 p-4">
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-indigo-50 text-center">
                  <span className="text-xs font-medium uppercase text-indigo-500">{d.toLocaleDateString("en-IN", { month: "short" })}</span>
                  <span className="text-lg font-semibold leading-none text-indigo-700">{d.getDate()}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900">{a.contactName}</p>
                  <p className="text-sm text-slate-500">
                    {a.service} · {d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })} · {a.durationMin} min
                  </p>
                  {a.notes ? <p className="mt-0.5 text-xs text-slate-400">{a.notes}</p> : null}
                </div>
                {a.status === "booked" ? (
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => updateAppointment(a.id, { status: "done" })} className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100">
                      <Check className="h-3.5 w-3.5" /> Done
                    </button>
                    <button onClick={() => updateAppointment(a.id, { status: "cancelled" })} className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-200">
                      <X className="h-3.5 w-3.5" /> Cancel
                    </button>
                  </div>
                ) : (
                  <Badge tone={a.status === "done" ? "green" : "slate"}>{a.status === "done" ? "Completed" : "Cancelled"}</Badge>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Book appointment"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>Book</Button>
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
          <Field label="Service">
            {services.length > 0 ? (
              <Select value={service} onChange={(e) => setService(e.target.value)}>
                <option value="">Select service…</option>
                {services.map((s) => (
                  <option key={s.id} value={s.name}>{s.name}</option>
                ))}
              </Select>
            ) : (
              <Input value={service} onChange={(e) => setService(e.target.value)} placeholder="e.g. Consultation" />
            )}
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Date &amp; time" required>
              <Input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
            </Field>
            <Field label="Duration (min)">
              <Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} />
            </Field>
          </div>
          <Field label="Notes">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
