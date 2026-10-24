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

describe("computeLayout union hubs", () => {
  const t = tree(
    [person("me"), person("ex"), person("now")],
    [union("u1", ["me", "ex"]), union("u2", ["me", "now"])],
    "me",
  );
  const { positions: p, unionPositions: h } = computeLayout(t);

  it("centers a hub in the gap between its partners", () => {
    expect(h.u1.x).toBe((p.ex.x + CARD_WIDTH + p.me.x) / 2);
  });

  it("gives each marriage of a person its own color and a lower hub", () => {
    expect(h.u1.colorIdx).toBe(0);
    expect(h.u2.colorIdx).toBe(1);
    expect(h.u2.y).toBeGreaterThan(h.u1.y);
  });

  it("places 3+ marriage union hubs in gaps without overlapping any person card", () => {
    const t3 = tree(
      [person("central"), person("spouse_1"), person("spouse_2"), person("spouse_3")],
      [
        union("u1", ["central", "spouse_1"]),
        union("u2", ["central", "spouse_2"]),
        union("u3", ["central", "spouse_3"]),
      ],
      "central",
    );
    const { positions, unionPositions } = computeLayout(t3);
    Object.values(unionPositions).forEach((uPos) => {
      Object.values(positions).forEach((pPos) => {
        const insideCard = uPos.x > pPos.x && uPos.x < pPos.x + CARD_WIDTH;
        expect(insideCard).toBe(false);
      });
    });
  });

  it("keeps two married partners' sibling families horizontally separated without interleaving", () => {
    const fam = tree(
      [
        person("left_dad"),
        person("left_mom"),
        person("right_dad"),
        person("right_mom"),
        person("left_partner", "u_left_parents"),
        person("left_sib_1", "u_left_parents"),
        person("left_sib_2", "u_left_parents"),
        person("left_sib_spouse"),
        person("right_partner", "u_right_parents"),
        person("right_sib_1", "u_right_parents"),
        person("right_sib_2", "u_right_parents"),
        person("right_sib_3", "u_right_parents"),
        person("root_child", "u_main"),
      ],
      [
        union("u_left_parents", ["left_dad", "left_mom"], ["left_partner", "left_sib_1", "left_sib_2"]),
        union("u_left_sib", ["left_sib_1", "left_sib_spouse"]),
        union("u_right_parents", ["right_dad", "right_mom"], ["right_partner", "right_sib_1", "right_sib_2", "right_sib_3"]),
        union("u_main", ["left_partner", "right_partner"], ["root_child"]),
      ],
      "root_child",
    );
    const { positions } = computeLayout(fam);
    const leftFamilyXs = ["left_partner", "left_sib_1", "left_sib_2"].map((id) => positions[id].x);
    const rightFamilyXs = ["right_partner", "right_sib_1", "right_sib_2", "right_sib_3"].map((id) => positions[id].x);
    const leftMax = Math.max(...leftFamilyXs);
    const rightMin = Math.min(...rightFamilyXs);
    expect(leftMax).toBeLessThan(rightMin);
  });

  it("applies custom nodePositions and unionPositions overrides when present", () => {
    const tCustom = {
      ...tree([person("a"), person("b")], [union("u", ["a", "b"])], "a"),
      overrides: {
        nodePositions: { a: { x: 120, y: -40 } },
        unionPositions: { u: { x: 260, y: 15 } },
      },
    };
    const { positions, unionPositions } = computeLayout(tCustom);
    expect(positions.a).toEqual({ x: 120, y: -40 });
    expect(unionPositions.u.x).toBe(260);
    expect(unionPositions.u.y).toBe(15);
  });
});
