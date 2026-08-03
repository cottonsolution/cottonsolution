"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseBrowserClient";
import { triggerPush } from "@/lib/pushClient";
import { SendIcon, ChatIcon } from "@/components/Icons";

// Quick-reply chips for per-shipment chat — common phrases a driver/merchant
// needs mid-trip, one tap instead of typing (functional requirement #4).
const QUICK_TEMPLATES = [
  "On my way to pickup",
  "Reached pickup point",
  "Loading in progress",
  "On the way to drop-off",
  "Reached destination",
  "Please share exact location",
  "Running a little late",
  "Thank you!",
];

/**
 * Live message thread. Two modes, driven by which props are passed:
 *  - Per-load chat:  pass `loadId` — visible to that load's merchant +
 *    assigned driver + admin (matches the `messages_select` RLS policy).
 *  - General 1:1 chat: pass `otherUserId` (and leave `loadId` unset) — a
 *    direct conversation between the current user and `otherUserId`.
 *
 * Realtime: subscribes to INSERT on `messages` with no server-side filter
 * (Supabase realtime filters only support single-column equality, and this
 * needs an OR across sender/receiver), then keeps only inserts that belong
 * to this exact thread — cheap at this app's message volume.
 */
export default function ChatThread({ loadId, otherUserId, otherUserName, currentUserId, onClose }) {
  const [messages, setMessages] = useState([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  function belongsToThread(m) {
    if (loadId) return m.load_id === loadId;
    return (
      m.load_id == null &&
      ((m.sender_id === currentUserId && m.receiver_id === otherUserId) ||
        (m.sender_id === otherUserId && m.receiver_id === currentUserId))
    );
  }

  async function loadMessages() {
    let query = supabase.from("messages").select("*").order("created_at", { ascending: true });
    query = loadId
      ? query.eq("load_id", loadId)
      : query.is("load_id", null).or(
          `and(sender_id.eq.${currentUserId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUserId})`
        );
    const { data } = await query;
    setMessages(data ?? []);
  }

  useEffect(() => {
    loadMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadId, otherUserId]);

  useEffect(() => {
    const channel = supabase
      .channel(`messages-thread-${loadId || `${currentUserId}-${otherUserId}`}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, ({ new: msg }) => {
        if (belongsToThread(msg)) setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadId, otherUserId, currentUserId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function sendMessage(text) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setBody("");

    const row = {
      load_id: loadId || null,
      sender_id: currentUserId,
      receiver_id: loadId ? null : otherUserId,
      body: trimmed,
    };
    const { error } = await supabase.from("messages").insert(row);
    setSending(false);
    if (error) {
      setBody(trimmed);
      return;
    }

    const recipientId = loadId ? null : otherUserId;
    if (recipientId) {
      triggerPush({
        userId: recipientId,
        title: `New message${otherUserName ? "" : ""}`,
        body: trimmed,
        url: "/",
        tag: "sgtc-chat",
      });
    }
  }

  async function handleSend(e) {
    e.preventDefault();
    await sendMessage(body);
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 bg-slate-50">
        {messages.length === 0 && (
          <p className="text-center text-slate-400 text-sm mt-8 flex flex-col items-center gap-2">
            <ChatIcon className="w-8 h-8 text-slate-300" />
            No messages yet — say hello.
          </p>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === currentUserId;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm shadow-sm ${
                  mine ? "bg-brand-orange text-white rounded-br-sm" : "bg-white text-brand-navy rounded-bl-sm"
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                <p className={`text-[10px] mt-1 ${mine ? "text-white/70" : "text-slate-400"}`}>
                  {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {loadId && (
        <div className="flex gap-2 overflow-x-auto px-3 pt-2 pb-1 border-t border-slate-100 bg-white shrink-0">
          {QUICK_TEMPLATES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => sendMessage(t)}
              disabled={sending}
              className="shrink-0 whitespace-nowrap text-xs font-medium px-3 py-1.5 rounded-full border border-slate-200 text-slate-600 hover:bg-brand-orangeSoft hover:border-brand-orange/30 disabled:opacity-50"
            >
              {t}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-slate-200 p-3 bg-white shrink-0">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 border border-slate-300 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/40"
        />
        <button
          type="submit"
          disabled={!body.trim() || sending}
          className="w-11 h-11 shrink-0 rounded-full bg-brand-orange text-white flex items-center justify-center disabled:opacity-40"
          aria-label="Send"
        >
          <SendIcon className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
