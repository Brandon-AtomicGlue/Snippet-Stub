export interface SecretMatch {
  label: string;
  index: number;
}

// Deliberately narrow: catches the common accidental paste, not a full
// credential scanner. False negatives are expected and fine here.
const PATTERNS: Array<{ label: string; regex: RegExp }> = [
  { label: "AWS access key", regex: /AKIA[0-9A-Z]{16}/g },
  { label: "private key block", regex: /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/g },
  { label: "GitHub token", regex: /gh[pousr]_[A-Za-z0-9]{20,}/g },
  { label: "Slack token", regex: /xox[baprs]-[A-Za-z0-9-]{10,}/g },
  { label: "generic bearer token", regex: /bearer\s+[A-Za-z0-9._-]{20,}/gi },
  { label: "possible password assignment", regex: /(password|passwd|secret)\s*[:=]\s*['"][^'"\s]{6,}['"]/gi },
];

export function scanForSecrets(text: string): SecretMatch[] {
  const matches: SecretMatch[] = [];
  for (const { label, regex } of PATTERNS) {
    regex.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text))) {
      matches.push({ label, index: match.index });
      if (!regex.global) break;
    }
  }
  return matches;
}
