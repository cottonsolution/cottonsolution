"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseBrowserClient";
import { CloseIcon, PrintIcon, DownloadIcon, DocumentCheckIcon } from "@/components/Icons";

/**
 * Read-only, printable view of a submitted Bilty, laid out like a standard
 * Pakistani goods-transport Bilty / Consignment Note (Bilty No, From/To,
 * Consignor + Vehicle/Driver boxes, goods table, terms, signature lines).
 *
 * "Print" opens the browser's print dialog (works everywhere, but on mobile
 * "save as PDF" via that dialog is clunky and inconsistent between phones).
 * "Download PDF" instead generates a real .pdf file client-side with jsPDF
 * and triggers a direct file download — reliable on both mobile and desktop,
 * so a driver can keep an actual saved/printable copy.
 */
export default function BiltyModal({ bilty, load, onClose }) {
  const [merchant, setMerchant] = useState(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (load?.merchant_id) {
      supabase
        .from("profiles")
        .select("full_name, company_name, phone")
        .eq("id", load.merchant_id)
        .maybeSingle()
        .then(({ data }) => {
          if (!cancelled) setMerchant(data ?? null);
        });
    }
    return () => {
      cancelled = true;
    };
  }, [load?.merchant_id]);

  function handlePrint() {
    window.print();
  }

  async function handleDownload() {
    setDownloading(true);
    try {
      const { default: jsPDF } = await import("jspdf");
      buildBiltyPdf(jsPDF, { bilty, load, merchant }).save(`${bilty.bilty_no || "Bilty"}.pdf`);
    } catch (err) {
      alert("Could not generate the PDF. Please try Print instead, or check your connection.");
    }
    setDownloading(false);
  }

  const quantity = bilty.quantity_text || `${load?.quantity_value ?? load?.quantity_munds ?? ""} ${load?.quantity_unit ?? "Munds"}`;
  const consignor = merchant?.company_name || merchant?.full_name || "—";

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
            <Field label="Consignor" value={consignor} />
            <Field label="Consignor Phone" value={merchant?.phone} />
            <Field label="Commodity" value={bilty.commodity || load?.commodity} />
            <Field label="Quantity" value={quantity} />
            <Field label="From" value={bilty.from_location || load?.pickup_location} />
            <Field label="To" value={bilty.to_location || load?.dropoff_location} />
            <Field label="Vehicle No" value={bilty.vehicle_no} />
            <Field label="Driver" value={bilty.driver_name} />
            <Field label="Freight Rate (PKR)" value={bilty.freight_rate} />
            <Field label="Date" value={new Date(bilty.generated_at).toLocaleDateString()} />
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
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex-1 justify-center flex items-center gap-2 text-sm py-2.5 border border-slate-300 rounded-lg font-semibold text-slate-600 disabled:opacity-60"
          >
            <DownloadIcon className="w-4 h-4" /> {downloading ? "Preparing..." : "Download PDF"}
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

/**
 * Builds a one-page A4 PDF laid out like a standard Pakistani goods-transport
 * Bilty / Consignment Note (boxed header, From/To strip, Consignor + Vehicle
 * details, goods table, terms, and Consignor / Driver signature lines).
 */
function buildBiltyPdf(jsPDF, { bilty, load, merchant }) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = 210;
  const marginX = 15;
  const contentW = pageW - marginX * 2;
  const navy = [15, 30, 60];
  const orange = [230, 110, 30];
  const grey = [110, 120, 130];

  const quantity = bilty.quantity_text || `${load?.quantity_value ?? load?.quantity_munds ?? ""} ${load?.quantity_unit ?? "Munds"}`;
  const consignor = merchant?.company_name || merchant?.full_name || "—";
  const dateStr = new Date(bilty.generated_at || Date.now()).toLocaleDateString("en-GB");

  let y = 18;

  // Outer border for the whole bilty
  doc.setDrawColor(180, 180, 180);
  doc.rect(marginX, y, contentW, 250);

  // ---- Header ----
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...navy);
  doc.text("SMART GOODS TRANSPORT COMPANY", pageW / 2, y + 10, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...grey);
  doc.text("Cotton, Grain & General Goods Transport — Bilty / Consignment Note", pageW / 2, y + 16, { align: "center" });

  doc.setDrawColor(200, 200, 200);
  doc.line(marginX, y + 21, marginX + contentW, y + 21);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...orange);
  doc.text(`Bilty No: ${bilty.bilty_no || "-"}`, marginX + 4, y + 28);
  doc.setTextColor(...navy);
  doc.text(`Date: ${dateStr}`, marginX + contentW - 4, y + 28, { align: "right" });

  doc.setDrawColor(200, 200, 200);
  doc.line(marginX, y + 33, marginX + contentW, y + 33);

  // ---- From / To strip ----
  let rowY = y + 33;
  const rowH = 16;
  doc.rect(marginX, rowY, contentW / 2, rowH);
  doc.rect(marginX + contentW / 2, rowY, contentW / 2, rowH);
  labelValue(doc, "FROM", bilty.from_location || load?.pickup_location, marginX + 4, rowY + 6, contentW / 2 - 8);
  labelValue(doc, "TO", bilty.to_location || load?.dropoff_location, marginX + contentW / 2 + 4, rowY + 6, contentW / 2 - 8);

  // ---- Consignor / Vehicle box ----
  rowY += rowH;
  const rowH2 = 26;
  doc.rect(marginX, rowY, contentW / 2, rowH2);
  doc.rect(marginX + contentW / 2, rowY, contentW / 2, rowH2);
  labelValue(doc, "CONSIGNOR (BOOKED BY)", consignor, marginX + 4, rowY + 6, contentW / 2 - 8);
  labelValue(doc, "PHONE", merchant?.phone, marginX + 4, rowY + 16, contentW / 2 - 8);
  labelValue(doc, "VEHICLE NO", bilty.vehicle_no, marginX + contentW / 2 + 4, rowY + 6, contentW / 2 - 8);
  labelValue(doc, "DRIVER NAME", bilty.driver_name, marginX + contentW / 2 + 4, rowY + 16, contentW / 2 - 8);

  // ---- Goods table ----
  rowY += rowH2;
  const rowH3 = 20;
  const colW = contentW / 3;
  doc.rect(marginX, rowY, colW, rowH3);
  doc.rect(marginX + colW, rowY, colW, rowH3);
  doc.rect(marginX + colW * 2, rowY, colW, rowH3);
  labelValue(doc, "COMMODITY", bilty.commodity || load?.commodity, marginX + 4, rowY + 7, colW - 8);
  labelValue(doc, "QUANTITY", quantity, marginX + colW + 4, rowY + 7, colW - 8);
  labelValue(doc, "FREIGHT RATE (PKR)", bilty.freight_rate, marginX + colW * 2 + 4, rowY + 7, colW - 8);

  // ---- Terms ----
  rowY += rowH3;
  const rowH4 = 26;
  doc.rect(marginX, rowY, contentW, rowH4);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...grey);
  doc.text("TERMS & CONDITIONS", marginX + 4, rowY + 6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  const terms = [
    "1. Goods are carried entirely at the owner's / consignor's risk.",
    "2. Freight payment is as agreed between the Consignor and the Transporter/Driver.",
    "3. The Transporter is not responsible for delays caused by weather, road, or force majeure conditions.",
    "4. This is a computer-generated Bilty issued via the Smart Goods Transport Company platform.",
  ];
  terms.forEach((line, i) => doc.text(line, marginX + 4, rowY + 11 + i * 4));

  // ---- Signatures ----
  rowY += rowH4;
  const sigH = 30;
  doc.rect(marginX, rowY, contentW / 2, sigH);
  doc.rect(marginX + contentW / 2, rowY, contentW / 2, sigH);
  doc.setDrawColor(150, 150, 150);
  doc.line(marginX + 6, rowY + sigH - 8, marginX + contentW / 2 - 6, rowY + sigH - 8);
  doc.line(marginX + contentW / 2 + 6, rowY + sigH - 8, marginX + contentW - 6, rowY + sigH - 8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...grey);
  doc.text("Consignor Signature", marginX + contentW / 4, rowY + sigH - 3, { align: "center" });
  doc.text("Driver / Transporter Signature", marginX + contentW / 2 + contentW / 4, rowY + sigH - 3, { align: "center" });

  // ---- Footer ----
  doc.setFontSize(7);
  doc.setTextColor(...grey);
  doc.text("Generated by Smart Goods Transport Company — smartgoodstransport.com", pageW / 2, y + 250 + 6, { align: "center" });

  return doc;
}

function labelValue(doc, label, value, x, y, maxWidth) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text(label, x, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(20, 30, 45);
  const text = value ? String(value) : "-";
  const lines = doc.splitTextToSize(text, maxWidth);
  doc.text(lines.slice(0, 2), x, y + 5);
}
