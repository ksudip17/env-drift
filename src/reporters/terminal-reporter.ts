import type { DriftResult } from "../analyzer/types.js";
import { hasDrift } from "../analyzer/analyzer.js";

export function renderTerminal(result: DriftResult, color = false): string {
  const lines = ["env-drift", "", `Reference: ${result.referenceFile}`, `Scanned: ${result.files} source ${result.files === 1 ? "file" : "files"}`, ""];
  if (result.used.length === 0) lines.push("No static environment variable usage found.");
  else lines.push(`${success("✓", color)} ${result.used.length - result.missing.length} variables documented`);
  if (result.missing.length) lines.push(`${failure("✗", color)} ${result.missing.length} variables missing`);
  if (result.unused.length) lines.push(`${warning("⚠", color)} ${result.unused.length} variables unused`);
  if (result.dynamic) lines.push(`${warning("⚠", color)} dynamic environment variable access detected`);

  if (result.missing.length) section(lines, "Missing from reference:", result.missing);
  if (result.unused.length) section(lines, "Unused in source:", result.unused);
  if (result.dynamic) {
    lines.push("", "Dynamic access cannot be statically resolved (for example, process.env[key]).");
  }
  lines.push("", hasDrift(result) ? "Drift detected." : "No drift detected.");
  return `${lines.join("\n")}\n`;
}

function section(lines: string[], title: string, names: readonly string[]): void {
  lines.push("", title, ...names.map((name) => `  ${name}`));
}

function success(value: string, color: boolean): string { return color ? `\u001B[32m${value}\u001B[0m` : value; }
function failure(value: string, color: boolean): string { return color ? `\u001B[31m${value}\u001B[0m` : value; }
function warning(value: string, color: boolean): string { return color ? `\u001B[33m${value}\u001B[0m` : value; }
