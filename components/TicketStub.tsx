"use client";

import { useState } from "react";

interface TicketStubProps {
  shareCode: string;
  expiresAt: string;
}

function formatCode(code: string): string {
  return `${code.slice(0, 3)}-${code.slice(3)}`;
}

export function TicketStub({ shareCode, expiresAt }: TicketStubProps) {
  const [copied, setCopied] = useState(false);

  async function copyCode() {
    await navigator.clipboard.writeText(shareCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const expiresLabel = new Date(expiresAt).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div className="relative mx-auto w-full max-w-xs overflow-hidden rounded-lg border-2 border-dashed border-black/20 bg-amber-50 p-6 text-center shadow-sm dark:border-white/20 dark:bg-neutral-800">
      <p className="text-xs uppercase tracking-widest text-black/50 dark:text-white/50">
        Snippet Stub
      </p>
      <button
        onClick={copyCode}
        className="mt-2 w-full cursor-pointer font-mono text-3xl font-bold tracking-[0.2em] text-black transition hover:opacity-70 dark:text-white"
        title="Click to copy"
      >
        {formatCode(shareCode)}
      </button>
      <p className="mt-2 text-xs text-black/60 dark:text-white/60">
        {copied ? "Copied!" : "Click the code to copy"}
      </p>
      <p className="mt-4 text-xs text-black/50 dark:text-white/50">Expires {expiresLabel}</p>
    </div>
  );
}
