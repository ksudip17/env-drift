import type { DriftResult, ScanResult } from "./types.js";

const sorted = (values: Iterable<string>): string[] => [...values].sort((a, b) => a.localeCompare(b));

export function analyzeDrift(scan: ScanResult, documented: Set<string>, referenceFile: string): DriftResult {
  const used = sorted(scan.used);
  const documentedNames = sorted(documented);
  const missing = used.filter((name) => !documented.has(name));
  const unused = documentedNames.filter((name) => !scan.used.has(name));

  return {
    referenceFile,
    used,
    documented: documentedNames,
    missing,
    unused,
    dynamic: scan.dynamic,
    files: scan.files,
    summary: {
      used: used.length,
      documented: documentedNames.length,
      missing: missing.length,
      unused: unused.length
    }
  };
}

export function hasDrift(result: DriftResult): boolean {
  return result.missing.length > 0 || result.unused.length > 0 || result.dynamic;
}
