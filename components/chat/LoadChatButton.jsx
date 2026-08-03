"use client";

import { useState } from "react";
import { ChatIcon } from "@/components/Icons";
import ChatModal from "./ChatModal";

/**
 * Drop this into any load/shipment/trip card. Opens a chat scoped to that
 * one load — visible to the load's merchant, its assigned driver, and admin.
 */
export default function LoadChatButton({ loadId, currentUserId, label = "Chat", counterpartLabel = "Load Chat", className = "" }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          className ||
          "inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50"
        }
      >
        <ChatIcon className="w-4 h-4" /> {label}
      </button>
      {open && (
        <ChatModal
          title={counterpartLabel}
          subtitle="Messages about this shipment"
          loadId={loadId}
          currentUserId={currentUserId}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
