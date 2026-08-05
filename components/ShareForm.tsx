"use client";

import { useMemo, useState } from "react";
import { CodeEditor } from "@/components/CodeEditor";
import { TicketStub } from "@/components/TicketStub";
import { LANGUAGES, DEFAULT_LANGUAGE } from "@/lib/languages";
import { resizeImageFile } from "@/lib/resize-image";
import { scanForSecrets } from "@/lib/secret-scan";
import { MAX_IMAGES_PER_SNIPPET } from "@/lib/image-limits";
import { MAX_CODE_LENGTH, MAX_NOTES_LENGTH } from "@/lib/api/schemas";

type Expiration = "1d" | "7d" | "30d";

interface PendingImage {
  dataUrl: string;
  width: number;
  height: number;
}

interface ShareResult {
  shareCode: string;
  ownerToken: string;
  expiresAt: string;
}

export function ShareForm() {
  const [language, setLanguage] = useState(DEFAULT_LANGUAGE);
  const [code, setCode] = useState("");
  const [notes, setNotes] = useState("");
  const [expiration, setExpiration] = useState<Expiration>("7d");
  const [images, setImages] = useState<PendingImage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ShareResult | null>(null);
  const [acknowledgedSecretWarning, setAcknowledgedSecretWarning] = useState(false);

  const secretMatches = useMemo(() => scanForSecrets(`${code}\n${notes}`), [code, notes]);

  async function handleFiles(files: FileList | null) {
    if (!files || !files.length) return;
    setImageError(null);

    const remainingSlots = MAX_IMAGES_PER_SNIPPET - images.length;
    if (remainingSlots <= 0) {
      setImageError(`You can attach up to ${MAX_IMAGES_PER_SNIPPET} images`);
      return;
    }

    const toProcess = Array.from(files).slice(0, remainingSlots);
    try {
      const resized = await Promise.all(toProcess.map(resizeImageFile));
      setImages((prev) => [...prev, ...resized]);
    } catch {
      setImageError("Couldn't read one of those images — try a different file");
    }
  }

  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!code.trim()) {
      setError("Paste some code before sharing");
      return;
    }
    if (secretMatches.length > 0 && !acknowledgedSecretWarning) {
      setError("Review the possible secret warning below before sharing");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/snippets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language,
          code,
          notes: notes.trim() ? notes : null,
          expiration,
          images: images.map((img) => ({
            dataUrl: img.dataUrl,
            width: img.width,
            height: img.height,
          })),
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setError(body.error ?? "Something went wrong, try again");
        return;
      }

      const body = (await response.json()) as ShareResult;
      setResult(body);
    } catch {
      setError("Couldn't reach the server, try again");
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setResult(null);
    setCode("");
    setNotes("");
    setImages([]);
    setAcknowledgedSecretWarning(false);
    setError(null);
  }

  if (result) {
    return (
      <div className="flex flex-col items-center gap-4">
        <TicketStub shareCode={result.shareCode} expiresAt={result.expiresAt} />
        <p className="max-w-xs text-center text-xs text-black/60 dark:text-white/60">
          Keep this owner token to revoke the snippet early:{" "}
          <code className="rounded bg-black/5 px-1 py-0.5 dark:bg-white/10">
            {result.ownerToken}
          </code>
        </p>
        <button
          onClick={reset}
          className="rounded-md border border-black/15 px-4 py-2 text-sm hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
        >
          Share another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className="mb-1 block text-sm font-medium">Language</label>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="w-full rounded-md border border-black/15 bg-white p-2 text-sm dark:border-white/20 dark:bg-neutral-900"
        >
          {LANGUAGES.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Code</label>
        <CodeEditor value={code} onChange={setCode} language={language} placeholder="Paste your snippet..." />
        <p className="mt-1 text-right text-xs text-black/40 dark:text-white/40">
          {code.length.toLocaleString()} / {MAX_CODE_LENGTH.toLocaleString()}
        </p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={MAX_NOTES_LENGTH}
          rows={3}
          placeholder="Context for whoever receives this..."
          className="w-full rounded-md border border-black/15 bg-white p-2 text-sm dark:border-white/20 dark:bg-neutral-900"
        />
        <p className="mt-1 text-right text-xs text-black/40 dark:text-white/40">
          {notes.length} / {MAX_NOTES_LENGTH}
        </p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">
          Screenshots ({images.length}/{MAX_IMAGES_PER_SNIPPET})
        </label>
        <div className="flex flex-wrap gap-2">
          {images.map((img, i) => (
            <div key={i} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element -- local data: URL preview, not a Next-optimizable asset */}
              <img src={img.dataUrl} alt="" className="h-20 w-20 rounded-md object-cover" />
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black text-xs text-white"
                aria-label="Remove image"
              >
                x
              </button>
            </div>
          ))}
          {images.length < MAX_IMAGES_PER_SNIPPET && (
            <label className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-md border border-dashed border-black/20 text-xs text-black/50 dark:border-white/20 dark:text-white/50">
              + Add
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                multiple
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
            </label>
          )}
        </div>
        {imageError && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{imageError}</p>}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Expires after</label>
        <div className="flex gap-2">
          {(["1d", "7d", "30d"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setExpiration(option)}
              className={`rounded-md border px-3 py-1.5 text-sm ${
                expiration === option
                  ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                  : "border-black/15 dark:border-white/20"
              }`}
            >
              {option === "1d" ? "1 day" : option === "7d" ? "7 days" : "30 days"}
            </button>
          ))}
        </div>
      </div>

      {secretMatches.length > 0 && (
        <div className="rounded-md border border-amber-400 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-600 dark:bg-amber-950 dark:text-amber-200">
          <p className="font-medium">
            This looks like it might contain a {secretMatches[0].label}.
          </p>
          <label className="mt-2 flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={acknowledgedSecretWarning}
              onChange={(e) => setAcknowledgedSecretWarning(e.target.checked)}
            />
            I&rsquo;ve reviewed this and it&rsquo;s safe to share
          </label>
        </div>
      )}

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {submitting ? "Sharing..." : "Share snippet"}
      </button>
    </form>
  );
}
