"use client";

import { CloseIcon, PrintIcon, DownloadIcon, DocumentCheckIcon } from "@/components/Icons";

/**
 * Read-only, printable view of a submitted Bilty. "Print / Save as PDF"
 * uses the browser's native print dialog (which offers "Save as PDF" on
 * every platform) scoped to just this document via the #bilty-print-area
 * rule in globals.css — no extra PDF library needed.
 */
export default function BiltyModal({ bilty, load, onClose }) {
  function handlePrint() {
    window.print();
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2">
            <span className="icon-badge bg-brand-orange/10 text-brand-orange w-9 h-9 rounded-lg">
              <DocumentCheckIcon className="w-4 h-4" />
            </span>
            <h3 className="font-bold text-brand-navy">Digital Bilty</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-slate-400" aria-label="Close">
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        <div id="bilty-print-area" className="p-6 space-y-5">
          <div className="text-center border-b border-dashed border-slate-300 pb-4">
            <p className="font-display font-bold text-lg text-brand-navy">Smart Goods Transport Company</p>
            <p className="text-xs text-slate-400">Digital Bilty — {bilty.status === "submitted" ? "Confirmed" : "Draft"}</p>
            <p className="text-sm font-bold text-brand-orange mt-1">{bilty.bilty_no}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <Field label="Commodity" value={bilty.commodity || load?.commodity} />
            <Field label="Quantity" value={bilty.quantity_text || `${load?.quantity_value ?? load?.quantity_munds ?? ""} ${load?.quantity_unit ?? "Munds"}`} />
            <Field label="From" value={bilty.from_location || load?.pickup_location} />
            <Field label="To" value={bilty.to_location || load?.dropoff_location} />
            <Field label="Vehicle No" value={bilty.vehicle_no} />
            <Field label="Driver" value={bilty.driver_name} />
            <Field label="Freight Rate" value={bilty.freight_rate} />
            <Field label="Generated" value={new Date(bilty.generated_at).toLocaleDateString()} />
          </div>

          {bilty.status !== "submitted" && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Waiting for the merchant to fill in and submit the final Bilty details.
            </p>
          )}
        </div>

        <div className="flex gap-2 px-5 pb-5 pt-1 print:hidden">
          <button onClick={handlePrint} className="btn-orange flex-1 justify-center text-sm py-2.5">
            <PrintIcon className="w-4 h-4" /> Print
          </button>
          <button onClick={handlePrint} className="flex-1 justify-center flex items-center gap-2 text-sm py-2.5 border border-slate-300 rounded-lg font-semibold text-slate-600">
            <DownloadIcon className="w-4 h-4" /> Save as PDF
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <p className="text-[11px] text-slate-400 uppercase tracking-wide">{label}</p>
      <p className="font-semibold text-brand-navy">{value || "—"}</p>
    </div>
  );
}
