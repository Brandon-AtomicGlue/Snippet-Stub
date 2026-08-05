import { createHighlighter, type Highlighter } from "shiki";
import { LANGUAGES, shikiLangFor } from "@/lib/languages";

const THEMES = { light: "github-light", dark: "github-dark" } as const;

let highlighterPromise: Promise<Highlighter> | null = null;

function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      langs: [...new Set(LANGUAGES.map((l) => l.shikiLang))],
      themes: Object.values(THEMES),
    });
  }
  return highlighterPromise;
}

export async function highlightToHtml(code: string, language: string): Promise<string> {
  const highlighter = await getHighlighter();
  return highlighter.codeToHtml(code, {
    lang: shikiLangFor(language),
    themes: THEMES,
    defaultColor: false,
  });
}
