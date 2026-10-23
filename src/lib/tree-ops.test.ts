import { describe, expect, it } from "vitest";
import { person, tree, union } from "./fixtures";
import { addChild, addParents, addSibling, addSpouse, deletePerson } from "./tree-ops";

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

describe("addSibling", () => {
  it("joins the chosen parent union, so a half-sibling lands in the other marriage", () => {
    const base = tree(
      [person("me", "u1"), person("dad"), person("m1"), person("m2")],
      [union("u1", ["dad", "m1"], ["me"]), union("u2", ["dad", "m2"])],
      "me",
    );
    const { tree: t, selectedId } = addSibling(base, "me", "u2", { name: "Half" });
    expect(t.unions.u2.children).toEqual([selectedId]);
    expect(t.unions.u1.children).toEqual(["me"]);
  });

  it("creates shared parents when the person has none", () => {
    const base = tree([person("me")], [], "me");
    const { tree: t, selectedId } = addSibling(base, "me", null, { name: "Sib" });
    const u = t.unions[t.people.me.parentUnionId!];
    expect(u.children).toEqual(["me", selectedId]);
    expect(u.partners).toHaveLength(2);
  });
});

describe("deletePerson", () => {
  const base = tree(
    [person("me"), person("ex"), person("kid", "u")],
    [union("u", ["me", "ex"], ["kid"]), union("solo", ["ex"])],
    "me",
  );

  it("removes the person from every union and drops emptied unions", () => {
    const t = deletePerson(base, "ex");
    expect(t.people.ex).toBeUndefined();
    expect(t.unions.u.partners).toEqual(["me"]);
    expect(t.unions.solo).toBeUndefined();
  });

  it("moves the root to a remaining person when the root is deleted", () => {
    expect(deletePerson(base, "me").rootPersonId).not.toBe("me");
  });

  it("refuses to delete the last person", () => {
    const one = tree([person("me")], [], "me");
    expect(deletePerson(one, "me")).toBe(one);
  });
});
