"use client";

import { useEffect, useRef, useState } from "react";
import { highlightToHtml } from "@/lib/highlight";

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: string;
  placeholder?: string;
}

export function CodeEditor({ value, onChange, language, placeholder }: CodeEditorProps) {
  const [html, setHtml] = useState("");
  const overlayRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let cancelled = false;
    highlightToHtml(value.length ? value : "\n", language).then((result) => {
      if (!cancelled) setHtml(result);
    });
    return () => {
      cancelled = true;
    };
  }, [value, language]);

  function syncScroll() {
    if (overlayRef.current && textareaRef.current) {
      overlayRef.current.scrollTop = textareaRef.current.scrollTop;
      overlayRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  }

  return (
    <div className="relative h-80 w-full overflow-hidden rounded-md border border-black/10 bg-white dark:border-white/15 dark:bg-neutral-900">
      <div
        ref={overlayRef}
        aria-hidden
        className="code-editor-layer absolute inset-0 p-3"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={syncScroll}
        placeholder={placeholder}
        spellCheck={false}
        aria-label="Code"
        className="code-editor-layer absolute inset-0 resize-none bg-transparent p-3 text-transparent caret-black outline-none dark:caret-white"
      />
    </div>
  );
}
