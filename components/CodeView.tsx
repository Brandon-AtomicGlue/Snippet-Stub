"use client";

import { useEffect, useState } from "react";
import { highlightToHtml } from "@/lib/highlight";

interface CodeViewProps {
  code: string;
  language: string;
}

export function CodeView({ code, language }: CodeViewProps) {
  const [html, setHtml] = useState("");

  useEffect(() => {
    let cancelled = false;
    highlightToHtml(code, language).then((result) => {
      if (!cancelled) setHtml(result);
    });
    return () => {
      cancelled = true;
    };
  }, [code, language]);

  return (
    <div
      className="code-editor-layer w-full overflow-auto rounded-md border border-black/10 bg-white p-3 dark:border-white/15 dark:bg-neutral-900"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
