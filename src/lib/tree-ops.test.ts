import { describe, expect, it } from "vitest";
import { person, tree, union } from "./fixtures";
import { addChild } from "./tree-ops";

describe("addChild", () => {
  const base = tree(
    [person("me"), person("ex"), person("now")],
    [union("u1", ["me", "ex"]), union("u2", ["me", "now"])],
    "me",
  );

  it("attaches the child to the chosen marriage only", () => {
    const { tree: t, selectedId } = addChild(base, "u2", { name: "Kid" });
    expect(t.people[selectedId].parentUnionId).toBe("u2");
    expect(t.unions.u2.children).toEqual([selectedId]);
    expect(t.unions.u1.children).toEqual([]);
  });

  it("creates a single-parent union when none is chosen", () => {
    const { tree: t, selectedId } = addChild(base, { newUnionFor: "me" }, { name: "Kid" });
    const u = t.unions[t.people[selectedId].parentUnionId!];
    expect(u.partners).toEqual(["me"]);
    expect(u.children).toEqual([selectedId]);
  });

  it("does not mutate the input tree", () => {
    addChild(base, "u1", { name: "Kid" });
    expect(base.unions.u1.children).toEqual([]);
  });
});
