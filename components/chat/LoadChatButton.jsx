"use client";

import { useEffect, useState } from "react";
import { ChatIcon } from "@/components/Icons";
import ChatModal from "./ChatModal";

/**
 * Drop this into any load/shipment/trip card. Opens a chat scoped to that
 * one load — visible to the load's merchant, its assigned driver, and admin.
 *
 * `autoOpen` lets a parent force the chat open once (e.g. after the user
 * taps a chat notification) — call `onOpened` to clear the trigger so it
 * doesn't keep re-opening on every re-render.
 */
export default function LoadChatButton({ loadId, currentUserId, label = "Chat", counterpartLabel = "Load Chat", phone, className = "", autoOpen = false, onOpened }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (autoOpen) {
      setOpen(true);
      onOpened?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpen]);

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
          phone={phone}
          currentUserId={currentUserId}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
