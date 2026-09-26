"use client";

import { use, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Plus, Printer, Receipt as ReceiptIcon, Share2 } from "lucide-react";
import { useBiz, money } from "@/lib/biz/store";
import { getPack } from "@/lib/biz/packs";
import { Button, EmptyState } from "@/components/biz/ui";

const PRINT_CSS = `
@media print {
  body * { visibility: hidden !important; }
  #receipt-print, #receipt-print * { visibility: visible !important; }
  #receipt-print { position: absolute; left: 0; top: 0; width: 100%; margin: 0; box-shadow: none !important; }
  @page { margin: 8mm; }
}
`;

export default function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { tenant, getBill } = useBiz();
  const bill = getBill(id);

  const gstGroups = useMemo(() => {
    if (!bill) return [];
    const map = new Map<number, { taxable: number; tax: number }>();
    for (const l of bill.lines) {
      if (!l.taxRate) continue;
      const taxable = l.price * l.qty;
      const g = map.get(l.taxRate) ?? { taxable: 0, tax: 0 };
      g.taxable += taxable;
      g.tax += (taxable * l.taxRate) / 100;
      map.set(l.taxRate, g);
    }
    return Array.from(map.entries()).map(([rate, g]) => ({ rate, ...g }));
  }, [bill]);

  if (!tenant) return null;

  if (!bill) {
    return (
      <EmptyState
        icon={ReceiptIcon}
        title="Receipt not found"
        hint="This bill may have been removed."
        action={<Link href="/biz/app/billing"><Button>New bill</Button></Link>}
      />
    );
  }

  const cfg = tenant.config;
  const pack = getPack(tenant.category);
  const thermal = cfg.receipt.size !== "a4";
  const widthClass = cfg.receipt.size === "58mm" ? "max-w-[280px]" : cfg.receipt.size === "80mm" ? "max-w-[360px]" : "max-w-2xl";
  const paidMode = bill.payments[0]?.mode ?? "cash";

  function shareWhatsApp() {
    if (!bill || !tenant) return;
    const lines = bill.lines.map((l) => `${l.name} x${l.qty} — ${money(l.price * l.qty, tenant.currency)}`).join("\n");
    const text = `*${tenant.name}*\n${bill.number}\n\n${lines}\n\nTotal: ${money(bill.total, tenant.currency)}\n\nThank you!`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener");
  }

  return (
    <div className="space-y-5">
      <style>{PRINT_CSS}</style>

      {/* Toolbar (hidden on print) */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/biz/app/billing" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" /> New {cfg.labels.bill.toLowerCase()}
        </Link>
        <div className="flex gap-2">
          <Button variant="outline" onClick={shareWhatsApp}>
            <Share2 className="h-4 w-4" /> WhatsApp
          </Button>
          <Button onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Print
          </Button>
        </div>
      </div>

      {/* Success banner */}
      <div className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-3 text-emerald-800">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-emerald-500 text-white">
          <Check className="h-4 w-4" />
        </span>
        <div>
          <p className="text-sm font-semibold">{cfg.labels.bill} {bill.number} created</p>
          <p className="text-xs text-emerald-700">Paid {money(bill.total, tenant.currency)} · {paidMode.toUpperCase()}</p>
        </div>
      </div>

      {/* Receipt */}
      <div className="flex justify-center">
        <div
          id="receipt-print"
          className={`card-elevated w-full ${widthClass} ${thermal ? "font-mono" : ""} p-6`}
        >
          {/* Head */}
          <div className="text-center">
            <h2 className={`font-semibold ${thermal ? "text-base" : "text-xl"} text-slate-900`}>{tenant.name}</h2>
            {tenant.address ? <p className="text-xs text-slate-500">{tenant.address}</p> : null}
            {tenant.phone ? <p className="text-xs text-slate-500">Ph: {tenant.phone}</p> : null}
            {cfg.receipt.showGst && tenant.gstin ? <p className="text-xs text-slate-500">GSTIN: {tenant.gstin}</p> : null}
            <p className="mt-1 text-[11px] uppercase tracking-wide text-slate-400">{pack?.name}</p>
          </div>

          <div className="my-3 border-t border-dashed border-slate-200" />

          {/* Meta */}
          <div className="flex justify-between text-xs text-slate-500">
            <span>{bill.number}</span>
            <span>{new Date(bill.createdAt).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">{cfg.labels.contact}: {bill.contactName || "Walk-in"}</p>

          <div className="my-3 border-t border-dashed border-slate-200" />

          {/* Lines */}
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase text-slate-400">
                <th className="pb-1 font-medium">Item</th>
                <th className="pb-1 text-center font-medium">Qty</th>
                <th className="pb-1 text-right font-medium">Rate</th>
                <th className="pb-1 text-right font-medium">Amt</th>
              </tr>
            </thead>
            <tbody>
              {bill.lines.map((l, idx) => (
                <tr key={idx} className="align-top">
                  <td className="py-1 pr-2 text-slate-700">{l.name}</td>
                  <td className="py-1 text-center text-slate-600">{l.qty}</td>
                  <td className="py-1 text-right text-slate-600">{money(l.price, tenant.currency)}</td>
                  <td className="py-1 text-right font-medium text-slate-800">{money(l.price * l.qty, tenant.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="my-3 border-t border-dashed border-slate-200" />

          {/* Totals */}
          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-slate-500">
              <span>Subtotal</span><span>{money(bill.subtotal, tenant.currency)}</span>
            </div>
            {cfg.receipt.showGst && bill.tax > 0 ? (
              <>
                {gstGroups.map((g) => (
                  <div key={g.rate} className="flex justify-between text-xs text-slate-400">
                    <span>CGST {g.rate / 2}% + SGST {g.rate / 2}%</span>
                    <span>{money(g.tax, tenant.currency)}</span>
                  </div>
                ))}
              </>
            ) : null}
            <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-semibold text-slate-900">
              <span>Total</span><span>{money(bill.total, tenant.currency)}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-500">
              <span>Paid via {paidMode.toUpperCase()}</span><span>{money(bill.total, tenant.currency)}</span>
            </div>
          </div>

          {cfg.receipt.footer ? (
            <>
              <div className="my-3 border-t border-dashed border-slate-200" />
              <p className="text-center text-xs text-slate-500">{cfg.receipt.footer}</p>
            </>
          ) : null}
          <p className="mt-2 text-center text-[10px] text-slate-300">Billed with BizNest</p>
        </div>
      </div>

      <div className="flex justify-center">
        <Link href="/biz/app/billing">
          <Button variant="outline">
            <Plus className="h-4 w-4" /> Start another {cfg.labels.bill.toLowerCase()}
          </Button>
        </Link>
      </div>
    </div>
  );
}
