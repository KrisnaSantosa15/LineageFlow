import { CARD_HEIGHT, CARD_WIDTH } from "./constants";
import type { Point } from "./layout";

export interface View {
  x: number;
  y: number;
  scale: number;
}

const MIN_SCALE = 0.3;
const MAX_SCALE = 1.8;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Changes the scale by `delta` while keeping the point `at` (viewport coords) fixed. */
export function zoomAt(view: View, delta: number, at: Point): View {
  const scale = clamp(view.scale + delta, MIN_SCALE, MAX_SCALE);
  const ratio = scale / view.scale;
  return { x: at.x - (at.x - view.x) * ratio, y: at.y - (at.y - view.y) * ratio, scale };
}

/** Scales and centers the view so every card is visible. */
export function fitView(
  positions: Record<string, Point>,
  size: { width: number; height: number },
): View {
  const pts = Object.values(positions);
  if (pts.length === 0) return { x: size.width / 2, y: size.height / 2, scale: 1 };

  const minX = Math.min(...pts.map((p) => p.x));
  const maxX = Math.max(...pts.map((p) => p.x + CARD_WIDTH));
  const minY = Math.min(...pts.map((p) => p.y));
  const maxY = Math.max(...pts.map((p) => p.y + CARD_HEIGHT));

  const scale = clamp(
    Math.min(size.width / (maxX - minX + 120), size.height / (maxY - minY + 140)),
    0.35,
    1.1,
  );
  return {
    scale,
    x: size.width / 2 - ((minX + maxX) / 2) * scale,
    y: size.height / 2 - ((minY + maxY) / 2) * scale,
  };
}

/** Centers a single card in the viewport at the current scale. */
export function centerOn(
  view: View,
  target: Point,
  size: { width: number; height: number },
): View {
  return {
    ...view,
    x: size.width / 2 - (target.x + CARD_WIDTH / 2) * view.scale,
    y: size.height / 2 - (target.y + CARD_HEIGHT / 2) * view.scale,
  };
}
