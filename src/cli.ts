#!/usr/bin/env node
import { run, hasDrift } from "./index.js";
import { renderJson } from "./reporters/json-reporter.js";
import { renderTerminal } from "./reporters/terminal-reporter.js";

interface CliOptions { json: boolean; ci: boolean; path?: string; envFile?: string; }

const HELP = `env-drift — detect environment configuration drift\n\nUsage:\n  env-drift [options]\n\nOptions:\n  --json                 Print a stable JSON report\n  --ci                   Disable terminal styling; suitable for CI\n  --env-file <path>      Reference environment file (default: .env.example)\n  --path <path>          Source directory to scan (default: current directory)\n  --help, -h             Show this help\n  --version, -v          Show version\n`;

async function main(): Promise<void> {
  let options: CliOptions;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    writeError(error);
    process.exitCode = 2;
    return;
  }
  try {
    const result = await run({ path: options.path, envFile: options.envFile });
    process.stdout.write(options.json ? renderJson(result) : renderTerminal(result, Boolean(process.stdout.isTTY) && !options.ci));
    process.exitCode = hasDrift(result) ? 1 : 0;
  } catch (error) {
    if (options.json) process.stdout.write(`${JSON.stringify({ error: message(error) })}\n`);
    else writeError(error);
    process.exitCode = 2;
  }
}

function parseArgs(args: readonly string[]): CliOptions {
  const options: CliOptions = { json: false, ci: false };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--help" || arg === "-h") { process.stdout.write(HELP); process.exit(0); }
    if (arg === "--version" || arg === "-v") { process.stdout.write("0.1.0\n"); process.exit(0); }
    if (arg === "--json") { options.json = true; continue; }
    if (arg === "--ci") { options.ci = true; continue; }
    if (arg === "--path" || arg === "--env-file") {
      const value = args[index + 1];
      if (!value || value.startsWith("-")) throw new Error(`Option ${arg} requires a path.`);
      if (arg === "--path") options.path = value;
      else options.envFile = value;
      index += 1;
      continue;
    }
    throw new Error(`Unknown option: ${arg}\n\nRun env-drift --help for usage.`);
  }
  return options;
}

function writeError(error: unknown): void { process.stderr.write(`env-drift: ${message(error)}\n`); }
function message(error: unknown): string { return error instanceof Error ? error.message : "Unexpected error."; }

void main();
