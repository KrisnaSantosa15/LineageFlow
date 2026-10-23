import { describe, expect, it } from "vitest";
import { CARD_HEIGHT, CARD_WIDTH } from "./constants";
import { centerOn, fitView, zoomAt } from "./viewport";

describe("zoomAt", () => {
  it("keeps the point under the cursor fixed", () => {
    const next = zoomAt({ x: 10, y: 20, scale: 1 }, 0.5, { x: 300, y: 200 });
    const before = { x: (300 - 10) / 1, y: (200 - 20) / 1 };
    expect((300 - next.x) / next.scale).toBeCloseTo(before.x);
    expect((200 - next.y) / next.scale).toBeCloseTo(before.y);
  });

  it("clamps scale between 0.3 and 1.8", () => {
    expect(zoomAt({ x: 0, y: 0, scale: 1.75 }, 1, { x: 0, y: 0 }).scale).toBe(1.8);
    expect(zoomAt({ x: 0, y: 0, scale: 0.35 }, -1, { x: 0, y: 0 }).scale).toBe(0.3);
  });
});

describe("fitView", () => {
  it("centers the tree in the viewport", () => {
    const v = fitView({ a: { x: -100, y: 0 }, b: { x: 400, y: 210 } }, { width: 1000, height: 800 });
    const treeCenterX = (-100 + 400 + CARD_WIDTH) / 2;
    const treeCenterY = (0 + 210 + CARD_HEIGHT) / 2;
    expect(v.x + treeCenterX * v.scale).toBeCloseTo(500);
    expect(v.y + treeCenterY * v.scale).toBeCloseTo(400);
  });

  it("never zooms in past 110% on a tiny tree", () => {
    expect(fitView({ a: { x: 0, y: 0 } }, { width: 3000, height: 3000 }).scale).toBe(1.1);
  });
});

describe("centerOn", () => {
  it("puts the card center at the viewport center", () => {
    const v = centerOn({ x: 0, y: 0, scale: 2 }, { x: 50, y: 70 }, { width: 800, height: 600 });
    expect(v.x + (50 + CARD_WIDTH / 2) * 2).toBeCloseTo(400);
    expect(v.y + (70 + CARD_HEIGHT / 2) * 2).toBeCloseTo(300);
  });
});
