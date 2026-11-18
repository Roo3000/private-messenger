"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type User = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
};

type Conversation = {
  id: string;
  isGroup: boolean;
  title?: string | null;
  updatedAt: string;
  members: User[];
  lastMessage?: {
    id: string;
    body: string;
    createdAt: string;
    senderId: string;
  } | null;
};

export default function ChatPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [newUsername, setNewUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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

  async function loadConversations(t: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/conversations", {
        headers: { Authorization: `Bearer ${t}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to load");
        return;
      }
      setConversations(data.conversations || []);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (token) loadConversations(token);
  }, [token]);

  async function startChat(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !newUsername.trim()) return;
    setError(null);
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ username: newUsername.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not start chat");
        return;
      }
      setNewUsername("");
      await loadConversations(token);
      router.push(`/chat/${data.conversation.id}`);
    } catch {
      setError("Network error");
    }
  }

  function peerName(c: Conversation) {
    if (c.isGroup) return c.title || "Group";
    const other = c.members.find((m) => m.id !== user?.id);
    return other?.displayName || other?.username || "Chat";
  }

  function signOut() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.replace("/");
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="font-semibold">Private Messenger</h1>
          <p className="text-xs text-slate-400">
            Signed in as {user.displayName} (@{user.username})
          </p>
        </div>
        <button
          type="button"
          onClick={signOut}
          className="text-sm text-slate-400 hover:text-white"
        >
          Sign out
        </button>
      </header>

      <main className="max-w-lg mx-auto p-4 space-y-6">
        <form onSubmit={startChat} className="flex gap-2">
          <input
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            placeholder="Username to chat with"
            className="flex-1 rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg"
          >
            Chat
          </button>
        </form>

        {error && (
          <p className="text-sm text-rose-400 bg-rose-950/40 border border-rose-900 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <section>
          <h2 className="text-sm font-medium text-slate-400 mb-2">
            Conversations
          </h2>
          {loading ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : conversations.length === 0 ? (
            <p className="text-sm text-slate-500">
              No chats yet. Start one with a username above.
            </p>
          ) : (
            <ul className="space-y-1">
              {conversations.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => router.push(`/chat/${c.id}`)}
                    className="w-full text-left rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 px-4 py-3 transition-colors"
                  >
                    <div className="font-medium">{peerName(c)}</div>
                    <div className="text-xs text-slate-500 truncate mt-0.5">
                      {c.lastMessage?.body || "No messages yet"}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}