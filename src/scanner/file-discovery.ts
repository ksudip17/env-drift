import { readdir } from "node:fs/promises";
import { resolve } from "node:path";

const SOURCE_EXTENSIONS = new Set([".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"]);
const IGNORED_DIRECTORIES = new Set([
  "node_modules", ".git", "dist", "build", "coverage", ".next", ".nuxt", ".output", ".cache", ".turbo", "vendor"
]);

export async function discoverSourceFiles(root: string): Promise<string[]> {
  const files: string[] = [];
  async function visit(directory: string): Promise<void> {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = resolve(directory, entry.name);
      if (entry.isDirectory()) {
        if (!IGNORED_DIRECTORIES.has(entry.name)) await visit(fullPath);
      } else if (entry.isFile() && SOURCE_EXTENSIONS.has(extension(entry.name))) {
        files.push(fullPath);
      }
    }
  }
  await visit(resolve(root));
  return files.sort((a, b) => a.localeCompare(b));
}

function extension(fileName: string): string {
  const index = fileName.lastIndexOf(".");
  return index === -1 ? "" : fileName.slice(index);
}
