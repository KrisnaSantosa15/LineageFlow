import type { Tree } from "./types";

export type ParseResult = { ok: true; tree: Tree } | { ok: false; error: string };

export const serializeTree = (tree: Tree) => JSON.stringify(tree, null, 2);

export function parseTreeJson(raw: string): ParseResult {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { ok: false, error: "That isn't valid JSON. Check the syntax and try again." };
  }
  const d = data as Partial<Tree> | null;
  if (!d || typeof d.people !== "object" || typeof d.unions !== "object" || !d.people || !d.unions) {
    return { ok: false, error: "Missing \"people\" or \"unions\". Paste a tree exported from LineageFlow." };
  }
  const ids = Object.keys(d.people);
  if (ids.length === 0) {
    return { ok: false, error: "The tree has no people." };
  }
  const root = d.rootPersonId && d.people[d.rootPersonId] ? d.rootPersonId : ids[0];
  return { ok: true, tree: { people: d.people, unions: d.unions, rootPersonId: root } };
}
