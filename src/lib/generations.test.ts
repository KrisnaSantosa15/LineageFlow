import { describe, expect, it } from "vitest";
import { assignGenerations } from "./generations";
import type { Person, Tree, Union } from "./types";

const person = (id: string, parentUnionId: string | null = null): Person => ({
  id,
  name: id,
  gender: "other",
  birth: "",
  death: "",
  note: "",
  parentUnionId,
});

const union = (id: string, partners: string[], children: string[] = []): Union => ({
  id,
  partners,
  children,
  status: "married",
  label: "",
});

const tree = (people: Person[], unions: Union[], rootPersonId: string): Tree => ({
  people: Object.fromEntries(people.map((p) => [p.id, p])),
  unions: Object.fromEntries(unions.map((u) => [u.id, u])),
  rootPersonId,
});

describe("assignGenerations", () => {
  const t = tree(
    [person("gp1"), person("gp2"), person("dad", "u_gp"), person("mom"), person("me", "u_dad")],
    [union("u_gp", ["gp1", "gp2"], ["dad"]), union("u_dad", ["dad", "mom"], ["me"])],
    "me",
  );

  it("puts the root at 0, parents above, children below", () => {
    const gens = assignGenerations(t);
    expect(gens).toMatchObject({ me: 0, dad: -1, gp1: -2, gp2: -2 });
  });

  it("keeps spouses on the same generation", () => {
    expect(assignGenerations(t).mom).toBe(-1);
  });

  it("places children of the root one generation down", () => {
    const withKid = tree(
      [...Object.values(t.people), person("kid", "u_me")],
      [...Object.values(t.unions), union("u_me", ["me", "ex"], ["kid"])],
      "me",
    );
    withKid.people.ex = person("ex");
    expect(assignGenerations(withKid)).toMatchObject({ ex: 0, kid: 1 });
  });

  it("defaults disconnected people to generation 0", () => {
    const lone = { ...t, people: { ...t.people, stranger: person("stranger") } };
    expect(assignGenerations(lone).stranger).toBe(0);
  });
});
