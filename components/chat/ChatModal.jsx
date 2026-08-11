"use client";

import { CloseIcon, ChatIcon } from "@/components/Icons";
import CallButton from "@/components/CallButton";
import ChatThread from "./ChatThread";
import { useLockBodyScroll } from "@/lib/useLockBodyScroll";

export default function ChatModal({ title, subtitle, phone, onClose, ...threadProps }) {
  useLockBodyScroll(true);
  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-xl h-[85vh] sm:h-[600px] flex flex-col overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 shrink-0">
          <span className="icon-badge bg-brand-orange/10 text-brand-orange w-10 h-10 rounded-xl shrink-0">
            <ChatIcon className="w-5 h-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-brand-navy truncate">{title}</p>
            {subtitle && <p className="text-xs text-slate-400 truncate">{subtitle}</p>}
          </div>
          {phone && (
            <CallButton
              phone={phone}
              label=""
              className="w-9 h-9 flex items-center justify-center rounded-full text-green-600 bg-green-500/10 shrink-0"
            />
          )}
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-slate-400 shrink-0" aria-label="Close chat">
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>
        <ChatThread {...threadProps} />
      </div>
    </div>
  );
}
