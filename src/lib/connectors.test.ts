import { describe, expect, it } from "vitest";
import { CARD_HEIGHT, CARD_WIDTH } from "./constants";
import { buildConnectorGeometry } from "./connectors";
import { person, tree, union } from "./fixtures";
import { computeLayout } from "./layout";

describe("buildConnectorGeometry", () => {
  const t = tree(
    [person("dad"), person("mom"), person("kid", "u1")],
    [{ ...union("u1", ["dad", "mom"], ["kid"]), status: "divorced" }],
    "kid",
  );
  const layout = computeLayout(t);
  const [group] = buildConnectorGeometry(t, layout);

  it("produces partner curves from card centers to the union hub", () => {
    expect(group.partnerPaths).toHaveLength(2);
    const dadCenter = {
      x: layout.positions.dad.x + CARD_WIDTH / 2,
      y: layout.positions.dad.y + CARD_HEIGHT / 2,
    };
    expect(group.partnerPaths[0]).toContain(`M ${dadCenter.x} ${dadCenter.y}`);
    expect(group.partnerPaths[0]).toContain(`${layout.unionPositions.u1.x} ${layout.unionPositions.u1.y}`);
  });

  it("marks divorced unions as dashed", () => {
    expect(group.dashed).toBe(true);
  });

  it("produces a vertical drop and child fork with a top-of-card dot", () => {
    const uPos = layout.unionPositions.u1;
    expect(group.busY).toBeDefined();
    expect(group.dropPath).toBe(`M ${uPos.x} ${uPos.y} L ${uPos.x} ${group.busY}`);
    expect(group.children).toHaveLength(1);
    expect(group.children[0].dot).toEqual({
      cx: layout.positions.kid.x + CARD_WIDTH / 2,
      cy: layout.positions.kid.y,
    });
  });

  it("separates busY lanes for multiple parent unions in the same generation and honors busY overrides", () => {
    const twoFams = tree(
      [
        person("p1"),
        person("p2"),
        person("p3"),
        person("p4"),
        person("c1", "u1"),
        person("c2", "u2"),
      ],
      [
        union("u1", ["p1", "p2"], ["c1"]),
        union("u2", ["p3", "p4"], ["c2"]),
      ],
      "c1",
    );
    const l = computeLayout(twoFams);
    const groups = buildConnectorGeometry(twoFams, l);
    const g1 = groups.find((g) => g.unionId === "u1")!;
    const g2 = groups.find((g) => g.unionId === "u2")!;
    expect(g1.busY).not.toBe(g2.busY);

    const withOverride = {
      ...twoFams,
      overrides: { busY: { u1: 111 } },
    };
    const [gOver] = buildConnectorGeometry(withOverride, l);
    expect(gOver.busY).toBe(111);
  });
});
