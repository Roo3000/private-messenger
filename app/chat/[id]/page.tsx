"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";

type User = {
  id: string;
  username: string;
  displayName: string;
};

type Message = {
  id: string;
  body: string;
  senderId: string;
  createdAt: string;
  sender?: User;
};

function ConversationInner() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = localStorage.getItem("token");
    const u = localStorage.getItem("user");
    if (!t || !u) {
      router.replace("/");
      return;
    }
    setToken(t);
    setUser(JSON.parse(u));
  }, [router]);

  async function loadMessages(t: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/conversations/${id}/messages`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to load messages");
        return;
      }
      setMessages(data.messages || []);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!token || !id) return;

    let cancelled = false;

    async function tick() {
        try {
        const res = await fetch(`/api/conversations/${id}/messages`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!cancelled && res.ok) {
            setMessages(data.messages || []);
            setLoading(false);
        }
        } catch {
        // ignore transient network errors while polling
        }
    }

    tick();
    const interval = setInterval(tick, 2000);

    return () => {
        cancelled = true;
        clearInterval(interval);
    };
  }, [token, id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !text.trim()) return;
    const body = text.trim();
    setText("");
    try {
      const res = await fetch(`/api/conversations/${id}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ body }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Send failed");
        setText(body);
        return;
      }
      setMessages((prev) => [...prev, data.message]);
    } catch {
      setError("Network error");
      setText(body);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="border-b border-slate-800 px-4 py-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.push("/chat")}
          className="text-sm text-slate-400 hover:text-white"
        >
          ← Back
        </button>
        <h1 className="font-semibold text-sm">Conversation</h1>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 max-w-lg w-full mx-auto">
        {loading && (
          <p className="text-sm text-slate-500 text-center">Loading…</p>
        )}
        {error && (
          <p className="text-sm text-rose-400 text-center">{error}</p>
        )}
        {messages.map((m) => {
          const mine = m.senderId === user?.id;
          return (
            <div
              key={m.id}
              className={`flex ${mine ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                  mine
                    ? "bg-blue-600 text-white"
                    : "bg-slate-800 text-slate-100"
                }`}
              >
                {!mine && (
                  <div className="text-[10px] text-slate-400 mb-0.5">
                    {m.sender?.displayName || m.sender?.username}
                  </div>
                )}
                <div>{m.body}</div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={sendMessage}
        className="border-t border-slate-800 p-3 max-w-lg w-full mx-auto flex gap-2"
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message…"
          className="flex-1 rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-xl"
        >
          Send
        </button>
      </form>
    </div>
  );
}

export default function ConversationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
          Loading…
        </div>
      }
    >
      <ConversationInner />
    </Suspense>
  );
}