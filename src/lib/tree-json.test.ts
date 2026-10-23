import { describe, expect, it } from "vitest";
import { person, tree, union } from "./fixtures";
import { parseTreeJson, serializeTree } from "./tree-json";

const t = tree([person("a"), person("b")], [union("u", ["a", "b"])], "b");

describe("tree JSON", () => {
  it("round-trips a tree", () => {
    expect(parseTreeJson(serializeTree(t))).toEqual({ ok: true, tree: t });
  });

  it("falls back to the first person when rootPersonId is missing", () => {
    const raw = JSON.stringify({ people: t.people, unions: t.unions });
    const result = parseTreeJson(raw);
    expect(result.ok && result.tree.rootPersonId).toBe("a");
  });

  it.each([
    ["not json", "{nope"],
    ["missing unions", JSON.stringify({ people: {} })],
    ["no people", JSON.stringify({ people: {}, unions: {} })],
  ])("rejects %s with a readable error", (_label, raw) => {
    const result = parseTreeJson(raw);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.length).toBeGreaterThan(0);
  });
});
