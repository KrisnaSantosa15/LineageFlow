import { parseTreeJson } from "./tree-json";
import type { Tree } from "./types";

export function encodeTreeToParam(tree: Tree): string {
  const bytes = new TextEncoder().encode(JSON.stringify(tree));
  let bin = "";
  bytes.forEach((b) => {
    bin += String.fromCharCode(b);
  });
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeTreeFromParam(param: string): Tree | null {
  if (!param) return null;
  try {
    const padded = param.replace(/-/g, "+").replace(/_/g, "/");
    const bin = atob(padded);
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    const json = new TextDecoder().decode(bytes);
    const parsed = parseTreeJson(json);
    return parsed.ok ? parsed.tree : null;
  } catch {
    return null;
  }
}
