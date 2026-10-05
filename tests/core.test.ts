import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import ts from "typescript";
import { analyzeDrift, hasDrift } from "../src/analyzer/analyzer.js";
import { ReferenceFileError, run } from "../src/index.js";
import { parseEnvNames } from "../src/parser/env-parser.js";
import { discoverSourceFiles } from "../src/scanner/file-discovery.js";
import { scanSource, scanSourceFiles } from "../src/scanner/source-scanner.js";

function source(text: string): ts.SourceFile {
  return ts.createSourceFile("example.ts", text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
}

test("detects supported static environment syntax", () => {
  const result = scanSource(source(`
    process.env.FOO; process.env["BAR"]; process.env['BAZ'];
    import.meta.env.API_URL; import.meta.env["VITE_KEY"];
  `));
  assert.deepEqual([...result.used].sort(), ["API_URL", "BAR", "BAZ", "FOO", "VITE_KEY"]);
  assert.equal(result.dynamic, false);
});

test("does not detect strings or comments", () => {
  const result = scanSource(source(`
    const first = "process.env.FOO"; // process.env.BAR
    /* import.meta.env.BAZ */ const second = 'process.env.QUX';
  `));
  assert.deepEqual([...result.used], []);
});

test("reports dynamic access without guessing names", () => {
  const result = scanSource(source("process.env[key]; import.meta.env[`VITE_${kind}`];"));
  assert.equal(result.dynamic, true);
  assert.deepEqual([...result.used], []);
});

test("parses environment names without retaining values", () => {
  assert.deepEqual([...parseEnvNames("FOO=\nBAR=value\nBAZ=\"value\"\nQUX='value'\n# NOPE=\n")], ["FOO", "BAR", "BAZ", "QUX"]);
});

test("analyzes matching, missing, unused, and dynamic variables", () => {
  const result = analyzeDrift({ used: new Set(["FOO", "MISSING"]), dynamic: true, files: 1 }, new Set(["FOO", "UNUSED"]), ".env.example");
  assert.deepEqual(result.missing, ["MISSING"]);
  assert.deepEqual(result.unused, ["UNUSED"]);
  assert.equal(hasDrift(result), true);
});

test("file discovery ignores dependency and build directories", async () => {
  const root = await mkdtemp(join(tmpdir(), "env-drift-"));
  await mkdir(join(root, "src"), { recursive: true });
  await mkdir(join(root, "node_modules", "pkg"), { recursive: true });
  await mkdir(join(root, "dist"), { recursive: true });
  await Promise.all([
    writeFile(join(root, "src", "index.ts"), "process.env.FOO"),
    writeFile(join(root, "node_modules", "pkg", "index.js"), "process.env.BAD"),
    writeFile(join(root, "dist", "index.js"), "process.env.ALSO_BAD")
  ]);
  const files = await discoverSourceFiles(root);
  assert.equal(files.length, 1);
  const scan = await scanSourceFiles(files);
  assert.deepEqual([...scan.used], ["FOO"]);
});

test("runs an end-to-end analysis without exposing environment values", async () => {
  const root = await mkdtemp(join(tmpdir(), "env-drift-"));
  await mkdir(join(root, "src"));
  await Promise.all([
    writeFile(join(root, ".env.example"), "FOO=super-secret\nUNUSED=also-secret\n"),
    writeFile(join(root, "src", "index.ts"), "process.env.FOO; process.env.MISSING;")
  ]);
  const result = await run({ cwd: root });
  assert.deepEqual(result.used, ["FOO", "MISSING"]);
  assert.deepEqual(result.missing, ["MISSING"]);
  assert.deepEqual(result.unused, ["UNUSED"]);
});

test("explains missing default reference files and names available env files only", async () => {
  const root = await mkdtemp(join(tmpdir(), "env-drift-"));
  await writeFile(join(root, ".env"), "SECRET=do-not-print");
  await assert.rejects(run({ cwd: root }), (error: unknown) => {
    assert.ok(error instanceof ReferenceFileError);
    assert.match(error.message, /Found environment files:\n  .env/u);
    assert.doesNotMatch(error.message, /do-not-print/u);
    return true;
  });
});
