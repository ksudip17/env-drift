import type { DriftResult } from "../analyzer/types.js";

/** Stable machine-readable report. It intentionally contains names, never values. */
export function renderJson(result: DriftResult): string {
  return `${JSON.stringify({
    referenceFile: result.referenceFile,
    used: result.used,
    missing: result.missing,
    unused: result.unused,
    dynamic: result.dynamic,
    summary: result.summary
  }, null, 2)}\n`;
}
