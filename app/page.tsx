"use client";

import { useState } from "react";
import { ShareForm } from "@/components/ShareForm";
import { RetrieveForm } from "@/components/RetrieveForm";

type Tab = "share" | "retrieve";

export default function Home() {
  const [tab, setTab] = useState<Tab>("share");

  return (
    <div className="flex min-h-screen flex-col items-center bg-zinc-50 font-sans dark:bg-black">
      <main className="w-full max-w-xl flex-1 px-6 py-12">
        <h1 className="mb-1 text-2xl font-semibold tracking-tight">Snippet Stub</h1>
        <p className="mb-6 text-sm text-black/60 dark:text-white/60">
          Hand off a snippet, a note, and a screenshot without opening a ticket.
        </p>

        <div role="tablist" className="mb-6 flex gap-1 rounded-lg bg-black/5 p-1 dark:bg-white/10">
          <button
            role="tab"
            aria-selected={tab === "share"}
            onClick={() => setTab("share")}
            className={`flex-1 rounded-md py-2 text-sm font-medium transition ${
              tab === "share"
                ? "bg-white shadow-sm dark:bg-neutral-800"
                : "text-black/60 dark:text-white/60"
            }`}
          >
            Share
          </button>
          <button
            role="tab"
            aria-selected={tab === "retrieve"}
            onClick={() => setTab("retrieve")}
            className={`flex-1 rounded-md py-2 text-sm font-medium transition ${
              tab === "retrieve"
                ? "bg-white shadow-sm dark:bg-neutral-800"
                : "text-black/60 dark:text-white/60"
            }`}
          >
            Retrieve
          </button>
        </div>

        {tab === "share" ? <ShareForm /> : <RetrieveForm />}
      </main>
    </div>
  );
}
