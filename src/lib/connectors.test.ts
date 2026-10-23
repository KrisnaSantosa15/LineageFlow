import { describe, expect, it } from "vitest";
import { CARD_HEIGHT, CARD_WIDTH, LEVEL_HEIGHT } from "./constants";
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
    const busY = uPos.y + (LEVEL_HEIGHT - CARD_HEIGHT) * 0.52;
    expect(group.dropPath).toBe(`M ${uPos.x} ${uPos.y} L ${uPos.x} ${busY}`);
    expect(group.children).toHaveLength(1);
    expect(group.children[0].dot).toEqual({
      cx: layout.positions.kid.x + CARD_WIDTH / 2,
      cy: layout.positions.kid.y,
    });
  });
});
