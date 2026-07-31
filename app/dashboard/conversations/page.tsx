"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";
import type { CustomerWithBranch, Message } from "@/lib/db-types";

/** How many recent messages to scan when building the list previews. */
const PREVIEW_WINDOW = 1000;

type Preview = { body: string; created_at: string };
type ThreadState = { phoneNumber: string; messages: Message[] };

export default function ConversationsPage() {
  const [customers, setCustomers] = useState<CustomerWithBranch[]>([]);
  const [previews, setPreviews] = useState<Record<string, Preview>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [thread, setThread] = useState<ThreadState | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Bumping these re-runs the fetch effects; the fetching itself has to live
  // inside the effect so no state is set before the first await.
  const [listVersion, setListVersion] = useState(0);
  const [threadVersion, setThreadVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadCustomers() {
      const supabase = supabaseBrowser();

      const [customersResult, messagesResult] = await Promise.all([
        supabase
          .from("customers")
          .select("*, branches ( name )")
          .order("last_seen", { ascending: false }),
        // PostgREST can't do "latest row per group", so scan the most recent
        // messages and keep the first hit per number. The list is sorted by
        // last_seen, so the customers on top are always covered.
        supabase
          .from("messages")
          .select("phone_number, body, created_at")
          .order("created_at", { ascending: false })
          .limit(PREVIEW_WINDOW),
      ]);

      if (cancelled) return;
      setLoadingList(false);

      const failure = customersResult.error ?? messagesResult.error;
      setError(failure ? failure.message : null);
      if (customersResult.error) return;

      setCustomers((customersResult.data ?? []) as CustomerWithBranch[]);

      const nextPreviews: Record<string, Preview> = {};
      for (const row of messagesResult.data ?? []) {
        if (!nextPreviews[row.phone_number]) {
          nextPreviews[row.phone_number] = { body: row.body, created_at: row.created_at };
        }
      }
      setPreviews(nextPreviews);
    }

    loadCustomers();
    return () => {
      cancelled = true;
    };
  }, [listVersion]);

  useEffect(() => {
    if (!selected) return;
    let cancelled = false;

    async function loadThread(phoneNumber: string) {
      const { data, error: threadError } = await supabaseBrowser()
        .from("messages")
        .select("*")
        .eq("phone_number", phoneNumber)
        .order("created_at", { ascending: true });

      // Clicking through customers quickly would otherwise let a slow response
      // overwrite the thread that's now on screen.
      if (cancelled) return;
      if (threadError) {
        setError(threadError.message);
        return;
      }
      setThread({ phoneNumber, messages: (data ?? []) as Message[] });
    }

    loadThread(selected);
    return () => {
      cancelled = true;
    };
  }, [selected, threadVersion]);

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.phone_number === selected) ?? null,
    [customers, selected]
  );

  // Tying the loaded thread to its phone number — rather than tracking a
  // separate loading flag — stops the previous customer's messages from showing
  // for a frame after switching.
  const threadMessages =
    thread && thread.phoneNumber === selected ? thread.messages : null;

  function applyPaused(phoneNumber: string, paused: boolean) {
    setCustomers((current) =>
      current.map((c) => (c.phone_number === phoneNumber ? { ...c, paused } : c))
    );
  }

  return (
    <div className="flex h-full">
      <CustomerList
        customers={customers}
        previews={previews}
        selected={selected}
        loading={loadingList}
        error={error}
        onSelect={setSelected}
        onRefresh={() => setListVersion((v) => v + 1)}
      />
      {selectedCustomer ? (
        <Thread
          customer={selectedCustomer}
          messages={threadMessages ?? []}
          loading={threadMessages === null}
          onPausedChange={applyPaused}
          onSent={() => setThreadVersion((v) => v + 1)}
        />
      ) : (
        <div className="flex flex-1 items-center justify-center text-sm text-zinc-500 dark:text-zinc-400">
          Select a customer to see their conversation.
        </div>
      )}
    </div>
  );
}

function CustomerList({
  customers,
  previews,
  selected,
  loading,
  error,
  onSelect,
  onRefresh,
}: {
  customers: CustomerWithBranch[];
  previews: Record<string, Preview>;
  selected: string | null;
  loading: boolean;
  error: string | null;
  onSelect: (phoneNumber: string) => void;
  onRefresh: () => void;
}) {
  return (
    <div className="flex w-80 shrink-0 flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-zinc-200 px-4 dark:border-zinc-800">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Customers</h2>
        <button
          type="button"
          onClick={onRefresh}
          className="text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          Refresh
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {error && <p className="p-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
        {loading && <p className="p-4 text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>}
        {!loading && !error && customers.length === 0 && (
          <p className="p-4 text-sm text-zinc-500 dark:text-zinc-400">No customers yet.</p>
        )}

        {customers.map((customer) => {
          const active = customer.phone_number === selected;
          const preview = previews[customer.phone_number];
          return (
            <button
              key={customer.phone_number}
              type="button"
              onClick={() => onSelect(customer.phone_number)}
              className={`block w-full border-b border-zinc-100 px-4 py-3 text-left dark:border-zinc-800/70 ${
                active
                  ? "bg-zinc-100 dark:bg-zinc-800"
                  : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              }`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {customer.name || customer.phone_number}
                </span>
                {customer.paused && (
                  <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                    Human
                  </span>
                )}
              </div>
              <div className="mt-0.5 flex items-baseline justify-between gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                <span className="truncate">{customer.phone_number}</span>
                <span className="shrink-0">{customer.branches?.name ?? "—"}</span>
              </div>
              <p className="mt-1 truncate text-xs text-zinc-500 dark:text-zinc-400">
                {preview?.body ?? "—"}
              </p>
              <p className="mt-1 text-[11px] text-zinc-400 dark:text-zinc-500">
                {formatDateTime(customer.last_seen)}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Thread({
  customer,
  messages,
  loading,
  onPausedChange,
  onSent,
}: {
  customer: CustomerWithBranch;
  messages: Message[];
  loading: boolean;
  onPausedChange: (phoneNumber: string, paused: boolean) => void;
  onSent: () => void;
}) {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [togglingPause, setTogglingPause] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  async function togglePaused() {
    setTogglingPause(true);
    setActionError(null);
    const next = !customer.paused;

    const response = await fetch("/api/dashboard/pause", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phoneNumber: customer.phone_number, paused: next }),
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok) setActionError(result.error ?? "Failed to update");
    else onPausedChange(customer.phone_number, result.paused);
    setTogglingPause(false);
  }

  async function handleSend(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = draft.trim();
    if (!body) return;

    setSending(true);
    setActionError(null);

    const response = await fetch("/api/dashboard/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phoneNumber: customer.phone_number, body }),
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      setActionError(result.error ?? "Failed to send");
    } else {
      setDraft("");
      onSent();
    }
    setSending(false);
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="flex h-12 shrink-0 items-center justify-between gap-4 border-b border-zinc-200 bg-white px-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            {customer.name || customer.phone_number}
          </p>
          <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
            {customer.phone_number}
            {customer.branches?.name ? ` · ${customer.branches.name}` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={togglePaused}
          disabled={togglingPause}
          className={`shrink-0 rounded-md px-3 py-1.5 text-sm font-medium disabled:opacity-50 ${
            customer.paused
              ? "bg-emerald-600 text-white hover:bg-emerald-700"
              : "bg-amber-600 text-white hover:bg-amber-700"
          }`}
        >
          {customer.paused ? "Hand back to AI" : "Take over"}
        </button>
      </div>

      {customer.paused && (
        <p className="shrink-0 border-b border-amber-200 bg-amber-50 px-6 py-2 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300">
          AI replies are paused for this customer — you are answering manually.
        </p>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
        {loading && <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading messages…</p>}
        {!loading && messages.length === 0 && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">No messages yet.</p>
        )}
        <div className="flex flex-col gap-3">
          {messages.map((message) => {
            const outbound = message.direction === "outbound";
            return (
              <div
                key={message.id}
                className={`flex flex-col ${outbound ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-[75%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap break-words ${
                    outbound
                      ? "bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900"
                      : "bg-white text-zinc-900 ring-1 ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:ring-zinc-700"
                  }`}
                >
                  {message.body}
                </div>
                <span className="mt-1 text-[11px] text-zinc-400 dark:text-zinc-500">
                  {formatDateTime(message.created_at)}
                </span>
              </div>
            );
          })}
        </div>
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={handleSend}
        className="shrink-0 border-t border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
      >
        {actionError && (
          <p role="alert" className="mb-2 text-sm text-red-600 dark:text-red-400">
            {actionError}
          </p>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Type a reply…"
            className="min-w-0 flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-zinc-400"
          />
          <button
            type="submit"
            disabled={sending || draft.trim().length === 0}
            className="shrink-0 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            {sending ? "Sending…" : "Send"}
          </button>
        </div>
        {!customer.paused && (
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
            Heads up: the AI is still replying to this customer. Use “Take over” to silence it.
          </p>
        )}
      </form>
    </div>
  );
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString();
}
