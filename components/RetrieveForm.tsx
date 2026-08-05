"use client";

import { useState } from "react";
import { CodeView } from "@/components/CodeView";
import { LANGUAGES } from "@/lib/languages";

interface RetrievedImage {
  url: string;
  width: number;
  height: number;
}

interface RetrievedSnippet {
  shareCode: string;
  language: string;
  code: string;
  notes: string | null;
  images: RetrievedImage[];
}

function languageLabel(value: string): string {
  return LANGUAGES.find((l) => l.value === value)?.label ?? value;
}

export function RetrieveForm() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [snippet, setSnippet] = useState<RetrievedSnippet | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const code = input.replace(/-/g, "").trim();
    if (!code) return;

    setLoading(true);
    setNotFound(false);
    setSnippet(null);

    try {
      const response = await fetch(`/api/snippets/${encodeURIComponent(code)}`);
      if (response.status === 404) {
        setNotFound(true);
        return;
      }
      if (!response.ok) {
        setNotFound(true);
        return;
      }
      setSnippet(await response.json());
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter share code (e.g. AB3-DEF)"
          className="flex-1 rounded-md border border-black/15 bg-white p-2 text-sm uppercase tracking-widest dark:border-white/20 dark:bg-neutral-900"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {loading ? "Looking..." : "Retrieve"}
        </button>
      </form>

      {notFound && (
        <p className="text-sm text-black/60 dark:text-white/60">
          Nothing found for that code. It may have expired, been revoked, or never existed.
        </p>
      )}

      {snippet && (
        <div className="flex flex-col gap-3">
          <p className="text-xs uppercase tracking-wide text-black/50 dark:text-white/50">
            {languageLabel(snippet.language)}
          </p>
          <CodeView code={snippet.code} language={snippet.language} />
          {snippet.notes && (
            <div className="rounded-md border border-black/10 bg-black/[0.03] p-3 text-sm dark:border-white/10 dark:bg-white/5">
              {snippet.notes}
            </div>
          )}
          {snippet.images.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {snippet.images.map((image, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  src={image.url}
                  alt=""
                  className="max-h-64 rounded-md border border-black/10 dark:border-white/10"
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
