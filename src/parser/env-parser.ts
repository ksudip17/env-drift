const assignment = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/;

/** Parses names only. Values are deliberately never retained or returned. */
export function parseEnvNames(contents: string): Set<string> {
  const names = new Set<string>();
  for (const line of contents.split(/\r?\n/u)) {
    const match = assignment.exec(line.trim());
    if (match?.[1]) names.add(match[1]);
  }
  return names;
}
