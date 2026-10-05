import { readFile } from "node:fs/promises";
import ts from "typescript";
import type { ScanResult } from "../analyzer/types.js";

export async function scanSourceFiles(files: readonly string[]): Promise<ScanResult> {
  const used = new Set<string>();
  let dynamic = false;
  for (const file of files) {
    const contents = await readFile(file, "utf8");
    const source = ts.createSourceFile(file, contents, ts.ScriptTarget.Latest, true, scriptKind(file));
    const result = scanSource(source);
    for (const name of result.used) used.add(name);
    dynamic ||= result.dynamic;
  }
  return { used, dynamic, files: files.length };
}

export function scanSource(source: ts.SourceFile): Pick<ScanResult, "used" | "dynamic"> {
  const used = new Set<string>();
  let dynamic = false;
  const visit = (node: ts.Node): void => {
    if (ts.isPropertyAccessExpression(node) && isEnvironmentRoot(node.expression)) {
      used.add(node.name.text);
    }
    if (ts.isElementAccessExpression(node) && isEnvironmentRoot(node.expression)) {
      const argument = node.argumentExpression;
      if (argument && (ts.isStringLiteral(argument) || ts.isNoSubstitutionTemplateLiteral(argument))) {
        used.add(argument.text);
      } else {
        dynamic = true;
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return { used, dynamic };
}

function isEnvironmentRoot(node: ts.Expression): boolean {
  return ts.isPropertyAccessExpression(node)
    && node.name.text === "env"
    && (isProcess(node.expression) || isImportMeta(node.expression));
}

function isProcess(node: ts.Expression): boolean {
  return ts.isIdentifier(node) && node.text === "process";
}

function isImportMeta(node: ts.Expression): boolean {
  return ts.isMetaProperty(node) && node.keywordToken === ts.SyntaxKind.ImportKeyword && node.name.text === "meta";
}

function scriptKind(file: string): ts.ScriptKind {
  if (file.endsWith(".tsx")) return ts.ScriptKind.TSX;
  if (file.endsWith(".jsx")) return ts.ScriptKind.JSX;
  if (file.endsWith(".js") || file.endsWith(".mjs") || file.endsWith(".cjs")) return ts.ScriptKind.JS;
  return ts.ScriptKind.TS;
}
