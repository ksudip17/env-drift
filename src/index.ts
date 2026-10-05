import { access, readdir, readFile } from "node:fs/promises";
import { relative, resolve } from "node:path";
import { analyzeDrift, hasDrift } from "./analyzer/analyzer.js";
import type { DriftResult } from "./analyzer/types.js";
import { parseEnvNames } from "./parser/env-parser.js";
import { discoverSourceFiles } from "./scanner/file-discovery.js";
import { scanSourceFiles } from "./scanner/source-scanner.js";

export interface RunOptions {
  cwd?: string;
  path?: string;
  envFile?: string;
}

export async function run(options: RunOptions = {}): Promise<DriftResult> {
  const cwd = resolve(options.cwd ?? process.cwd());
  const scanPath = resolve(cwd, options.path ?? ".");
  const envPath = resolve(cwd, options.envFile ?? ".env.example");
  await ensureReadable(envPath, cwd, options.envFile);
  const [files, envContents] = await Promise.all([discoverSourceFiles(scanPath), readFile(envPath, "utf8")]);
  const scan = await scanSourceFiles(files);
  return analyzeDrift(scan, parseEnvNames(envContents), displayPath(cwd, envPath));
}

export { hasDrift };

async function ensureReadable(path: string, cwd: string, suppliedFile?: string): Promise<void> {
  try {
    await access(path);
  } catch {
    const expected = suppliedFile ?? ".env.example";
    const found = suppliedFile ? [] : await conventionalEnvFiles(cwd);
    const available = found.length ? `\n\nFound environment files:\n${found.map((name) => `  ${name}`).join("\n")}\n\n.env.example is recommended as a safe documentation reference.` : "";
    throw new ReferenceFileError(
      `Could not find reference environment file.\n\nExpected:\n  ${expected}${available}\n\nTry:\n  env-drift --env-file ./path/to/.env.example`
    );
  }
}

async function conventionalEnvFiles(cwd: string): Promise<string[]> {
  try {
    const entries = await readdir(cwd, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && /^\.env(?:\.(?:example|local|development|production|test)(?:\.local)?)?$/u.test(entry.name))
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b));
  } catch {
    return [];
  }
}

export class ReferenceFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReferenceFileError";
  }
}

function displayPath(cwd: string, file: string): string {
  const path = relative(cwd, file);
  return path === "" ? "." : path;
}
