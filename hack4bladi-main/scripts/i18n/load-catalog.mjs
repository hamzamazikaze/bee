/**
 * Loads a message catalog without a TypeScript toolchain.
 *
 * The catalogs are plain object literals with three TS-only affordances (a type import,
 * a type annotation, `as const`). Stripping those three leaves valid JavaScript, which
 * is cheaper and far more predictable than pulling a transpiler into a check script.
 */
import { readFileSync } from "node:fs";

export function loadCatalog(path, name) {
  const src = readFileSync(path, "utf8")
    .split("\n")
    .filter((line) => !line.startsWith("import type") && !line.startsWith("export type"))
    .join("\n")
    .replace(/export const (\w+)(: [^=]+)? =/, "const $1 =")
    .replace(/\} as const;/, "};");
  return new Function(`${src}\nreturn ${name};`)();
}

/** Every dotted leaf path of a catalog, sorted. */
export function keyPaths(node, prefix = "") {
  const out = [];
  for (const [key, value] of Object.entries(node ?? {})) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object") out.push(...keyPaths(value, path));
    else out.push(path);
  }
  return out.sort();
}
