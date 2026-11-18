"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ChatPage() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) router.replace("/");
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-xl font-semibold mb-2">Chat coming next</h1>
        <p className="text-slate-400 text-sm">You’re logged in.</p>
        <button
          type="button"
          onClick={() => {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            router.replace("/");
          }}
          className="mt-4 text-sm text-blue-400 hover:underline"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}