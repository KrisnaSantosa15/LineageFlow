import { CARD_HEIGHT, CARD_WIDTH, LEVEL_HEIGHT } from "./constants";
import type { Layout } from "./layout";
import type { Tree } from "./types";
import { UNION_COLORS, type UnionPalette } from "./union-colors";

export interface ChildConnector {
  id: string;
  path: string;
  dot: { cx: number; cy: number };
}

export interface UnionConnectorGroup {
  unionId: string;
  palette: UnionPalette;
  dashed: boolean;
  partnerPaths: string[];
  dropPath: string | null;
  busY: number | null;
  busSpan: { minX: number; maxX: number; handleX: number } | null;
  children: ChildConnector[];
}

export function buildConnectorGeometry(
  tree: Tree,
  layout: Layout,
): UnionConnectorGroup[] {
  const { positions, unionPositions } = layout;
  const groups: UnionConnectorGroup[] = [];

  // Group unions with children by generation row so each gets a distinct horizontal busY lane
  const unionsWithChildrenByBand: Record<number, string[]> = {};
  Object.values(tree.unions).forEach((u) => {
    const uPos = unionPositions[u.id];
    const hasValidChildren = u.children.some((cid) => Boolean(positions[cid]));
    if (!uPos || !hasValidChildren) return;
    const band = Math.round(uPos.y / LEVEL_HEIGHT);
    (unionsWithChildrenByBand[band] ??= []).push(u.id);
  });

  Object.values(unionsWithChildrenByBand).forEach((uIds) => {
    uIds.sort((a, b) => (unionPositions[a]?.x ?? 0) - (unionPositions[b]?.x ?? 0));
  });

  Object.values(tree.unions).forEach((u) => {
    const uPos = unionPositions[u.id];
    if (!uPos) return;

    const palette = UNION_COLORS[uPos.colorIdx ?? 0] ?? UNION_COLORS[0];
    const dashed = u.status === "divorced";

    const partnerPaths: string[] = [];
    u.partners.forEach((pid) => {
      const pPos = positions[pid];
      if (!pPos) return;
      const cx = pPos.x + CARD_WIDTH / 2;
      const cy = pPos.y + CARD_HEIGHT / 2;

      const minSpanX = Math.min(cx, uPos.x);
      const maxSpanX = Math.max(cx, uPos.x);
      const hasInterveningCard = Object.entries(positions).some(
        ([otherId, otherPos]) => {
          if (otherId === pid) return false;
          const sameRow = Math.abs(otherPos.y - pPos.y) < CARD_HEIGHT * 0.85;
          if (!sameRow) return false;
          const otherCenter = otherPos.x + CARD_WIDTH / 2;
          return otherCenter > minSpanX + 10 && otherCenter < maxSpanX - 10;
        },
      );

      if (hasInterveningCard) {
        // 3rd+ spouse bypass rail: route neatly below the intermediate card(s)
        const railY =
          pPos.y + CARD_HEIGHT + 16 + ((uPos.colorIdx ?? 0) % 4) * 8;
        partnerPaths.push(
          `M ${cx} ${pPos.y + CARD_HEIGHT} L ${cx} ${railY} L ${uPos.x} ${railY} L ${uPos.x} ${uPos.y}`,
        );
      } else {
        const midX = (cx + uPos.x) / 2;
        partnerPaths.push(
          `M ${cx} ${cy} C ${midX} ${uPos.y}, ${midX} ${uPos.y}, ${uPos.x} ${uPos.y}`,
        );
      }
    });

    const validChildren = u.children.filter((cid) => positions[cid]);
    let dropPath: string | null = null;
    let busY: number | null = null;
    let busSpan: { minX: number; maxX: number; handleX: number } | null = null;
    const children: ChildConnector[] = [];

    if (validChildren.length > 0) {
      const band = Math.round(uPos.y / LEVEL_HEIGHT);
      const siblingsInBand = unionsWithChildrenByBand[band] ?? [u.id];
      const laneIdx = Math.max(0, siblingsInBand.indexOf(u.id));
      const laneOffset =
        siblingsInBand.length > 1
          ? (laneIdx - (siblingsInBand.length - 1) / 2) * 16
          : 0;

      const defaultBusY = Math.round(
        uPos.y + (LEVEL_HEIGHT - CARD_HEIGHT) * 0.5 + laneOffset,
      );
      busY = tree.overrides?.busY?.[u.id] ?? defaultBusY;

      dropPath = `M ${uPos.x} ${uPos.y} L ${uPos.x} ${busY}`;
      const xs = [uPos.x];

      validChildren.forEach((cid) => {
        const cPos = positions[cid];
        const childTopX = cPos.x + CARD_WIDTH / 2;
        const childTopY = cPos.y;
        xs.push(childTopX);
        children.push({
          id: cid,
          path: `M ${uPos.x} ${busY} L ${childTopX} ${busY} L ${childTopX} ${childTopY}`,
          dot: { cx: childTopX, cy: childTopY },
        });
      });

      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      busSpan = {
        minX,
        maxX,
        handleX: uPos.x,
      };
    }

    groups.push({
      unionId: u.id,
      palette,
      dashed,
      partnerPaths,
      dropPath,
      busY,
      busSpan,
      children,
    });
  });

  return groups;
}
