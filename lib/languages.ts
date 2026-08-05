export interface LanguageOption {
  value: string;
  label: string;
  shikiLang: string;
}

export const LANGUAGES: LanguageOption[] = [
  { value: "javascript", label: "JavaScript", shikiLang: "javascript" },
  { value: "typescript", label: "TypeScript", shikiLang: "typescript" },
  { value: "python", label: "Python", shikiLang: "python" },
  { value: "sql", label: "SQL", shikiLang: "sql" },
  { value: "go", label: "Go", shikiLang: "go" },
  { value: "rust", label: "Rust", shikiLang: "rust" },
  { value: "html", label: "HTML/CSS", shikiLang: "html" },
  { value: "bash", label: "Bash", shikiLang: "bash" },
  { value: "json", label: "JSON", shikiLang: "json" },
  { value: "plaintext", label: "Plain text", shikiLang: "plaintext" },
];

export const DEFAULT_LANGUAGE = LANGUAGES[0].value;

export function isSupportedLanguage(value: string): boolean {
  return LANGUAGES.some((l) => l.value === value);
}

export function shikiLangFor(value: string): string {
  return LANGUAGES.find((l) => l.value === value)?.shikiLang ?? "plaintext";
}
