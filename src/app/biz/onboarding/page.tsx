"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Receipt } from "lucide-react";
import { PACKS } from "@/lib/biz/packs";
import { useBiz } from "@/lib/biz/store";
import { Button, Field, Input, PackIcon, Textarea } from "@/components/biz/ui";

export default function Onboarding() {
  const router = useRouter();
  const { provisionTenant } = useBiz();
  const [packId, setPackId] = useState<string>("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [gstin, setGstin] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState("");

  const selected = PACKS.find((p) => p.id === packId);

  function submit() {
    if (!packId) {
      setError("Choose a business type to continue.");
      return;
    }
    if (!name.trim()) {
      setError("Enter your business name.");
      return;
    }
    const t = provisionTenant({ category: packId, name, phone, gstin, address });
    if (!t) {
      setError("Something went wrong. Please try again.");
      return;
    }
    router.push("/biz/app");
  }

  return (
    <div className="dashboard-surface min-h-screen text-slate-900">
      <header className="frosted sticky top-0 z-30 border-b border-white/40">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-4">
          <Link href="/biz" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-indigo-600 to-fuchsia-600 text-white">
              <Receipt className="h-4 w-4" />
            </div>
            Set up your business
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-5 py-10">
        {/* Step 1 — category */}
        <section>
          <div className="flex items-baseline gap-2">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-indigo-600 text-xs font-semibold text-white">1</span>
            <h2 className="text-lg font-semibold">What kind of business do you run?</h2>
          </div>
          <p className="ml-8 text-sm text-slate-500">We&apos;ll tailor the screens, fields and receipt to match.</p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PACKS.map((p) => {
              const active = p.id === packId;
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    setPackId(p.id);
                    setError("");
                  }}
                  className={`card-elevated relative flex items-start gap-3 p-5 text-left transition ${
                    active ? "ring-2 ring-indigo-400" : "lift"
                  }`}
                >
                  <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-white shadow-sm ${p.accent}`}>
                    <PackIcon name={p.icon} className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">{p.name}</p>
                    <p className="mt-0.5 text-sm text-slate-500">{p.tagline}</p>
                  </div>
                  {active ? (
                    <span className="absolute right-3 top-3 grid h-5 w-5 place-items-center rounded-full bg-indigo-600 text-white">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </section>

        {/* Step 2 — details */}
        <section className="mt-10">
          <div className="flex items-baseline gap-2">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-indigo-600 text-xs font-semibold text-white">2</span>
            <h2 className="text-lg font-semibold">Business details</h2>
          </div>
          <p className="ml-8 text-sm text-slate-500">Only the name is required — the rest you can add later.</p>

          <div className="card-elevated mt-5 grid gap-5 p-6 sm:grid-cols-2">
            <Field label="Business name" required>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={selected ? `e.g. Sharma ${selected.labels.item} House` : "e.g. Sharma Store"}
              />
            </Field>
            <Field label="Phone">
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="98765 43210" type="tel" />
            </Field>
            <Field label="GSTIN" hint="Optional — shown on GST invoices">
              <Input value={gstin} onChange={(e) => setGstin(e.target.value.toUpperCase())} placeholder="22AAAAA0000A1Z5" />
            </Field>
            <Field label="Address">
              <Textarea value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Shop no, street, city" />
            </Field>
          </div>

          {error ? <p className="mt-3 text-sm font-medium text-rose-600">{error}</p> : null}

          <div className="mt-6 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              {selected ? (
                <>You&apos;re creating a <span className="font-medium text-slate-700">{selected.name}</span>.</>
              ) : (
                "Select a business type above."
              )}
            </p>
            <Button size="lg" onClick={submit}>
              Create &amp; open portal <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}
