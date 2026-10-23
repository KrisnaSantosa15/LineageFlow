import { describe, expect, it } from "vitest";
import { CARD_WIDTH, LEVEL_HEIGHT, SPOUSE_GAP } from "./constants";
import { computeLayout } from "./layout";
import { person, tree, union } from "./fixtures";

describe("computeLayout people positions", () => {
  it("places a couple side by side, centered on x = 0", () => {
    const t = tree([person("a"), person("b")], [union("u", ["a", "b"])], "a");
    const { positions } = computeLayout(t);
    const gap = positions.b.x - positions.a.x;
    expect(gap).toBe(CARD_WIDTH + SPOUSE_GAP);
    expect(positions.a.x + positions.b.x + CARD_WIDTH).toBe(0);
  });

  it("puts a twice-married person between their two spouses", () => {
    const t = tree(
      [person("me"), person("ex"), person("now")],
      [union("u1", ["me", "ex"]), union("u2", ["me", "now"])],
      "me",
    );
    const { positions: p } = computeLayout(t);
    expect(p.ex.x).toBeLessThan(p.me.x);
    expect(p.me.x).toBeLessThan(p.now.x);
  });

  it("sets y from the generation", () => {
    const t = tree(
      [person("dad"), person("me", "u")],
      [union("u", ["dad", "mom"], ["me"])],
      "me",
    );
    t.people.mom = person("mom");
    const { positions } = computeLayout(t);
    expect(positions.dad.y).toBe(-LEVEL_HEIGHT);
    expect(positions.me.y).toBe(0);
  });
});

describe("computeLayout refinement", () => {
  it("pulls children toward the midpoint of their parents", () => {
    const t = tree(
      [person("ex"), person("dad"), person("mom"), person("me", "u2")],
      [union("u1", ["dad", "ex"]), union("u2", ["dad", "mom"], ["me"])],
      "me",
    );
    const { positions: p } = computeLayout(t);
    const parentMid = (p.dad.x + p.mom.x + CARD_WIDTH) / 2;
    const childCenter = p.me.x + CARD_WIDTH / 2;
    // a lone child is first centered at 0; refinement must move it toward its parents
    expect(Math.abs(childCenter - parentMid)).toBeLessThan(Math.abs(parentMid));
  });
});
