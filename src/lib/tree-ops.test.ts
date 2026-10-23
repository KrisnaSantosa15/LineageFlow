import { describe, expect, it } from "vitest";
import { person, tree, union } from "./fixtures";
import { addChild, addParents, addSpouse } from "./tree-ops";

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

describe("addSpouse", () => {
  const base = tree([person("me"), person("old")], [], "me");

  it("creates a new person and a union with the given status", () => {
    const { tree: t, selectedId } = addSpouse(base, "me", { data: { name: "New" } }, "divorced", "1st Marriage");
    const u = Object.values(t.unions)[0];
    expect(u.partners).toEqual(["me", selectedId]);
    expect(u).toMatchObject({ status: "divorced", label: "1st Marriage" });
  });

  it("reuses an existing person without creating a new one", () => {
    const { tree: t } = addSpouse(base, "me", { existingId: "old" }, "married", "Married");
    expect(Object.keys(t.people)).toHaveLength(2);
    expect(Object.values(t.unions)[0].partners).toEqual(["me", "old"]);
  });
});

describe("addParents", () => {
  it("creates a father-and-mother union above a person with no parents", () => {
    const base = tree([person("me")], [], "me");
    const { tree: t } = addParents(base, "me", "pair", { name: "Rob Lee", gender: "male" });
    const u = t.unions[t.people.me.parentUnionId!];
    expect(u.partners).toHaveLength(2);
    expect(u.children).toEqual(["me"]);
    expect(t.people[u.partners[1]].gender).toBe("female");
  });

  it("adds the second parent to a single-parent union", () => {
    const base = tree([person("me", "u"), person("mum")], [union("u", ["mum"], ["me"])], "me");
    const { tree: t, selectedId } = addParents(base, "me", "pair", { name: "Dad", gender: "male" });
    expect(t.unions.u.partners).toEqual(["mum", selectedId]);
  });

  it("adds a step-parent union when both parents already exist", () => {
    const base = tree(
      [person("me", "u"), person("mum"), person("dad")],
      [union("u", ["mum", "dad"], ["me"])],
      "me",
    );
    const { tree: t, selectedId } = addParents(base, "me", "pair", { name: "Step" });
    const stepUnion = Object.values(t.unions).find((u) => u.partners.includes(selectedId))!;
    expect(stepUnion.partners).toEqual(["mum", selectedId]);
    expect(t.unions.u.partners).toEqual(["mum", "dad"]);
  });
});
