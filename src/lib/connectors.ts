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
  children: ChildConnector[];
}

export function buildConnectorGeometry(tree: Tree, layout: Layout): UnionConnectorGroup[] {
  const { positions, unionPositions } = layout;
  const groups: UnionConnectorGroup[] = [];

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
      const midX = (cx + uPos.x) / 2;
      partnerPaths.push(`M ${cx} ${cy} C ${midX} ${uPos.y}, ${midX} ${uPos.y}, ${uPos.x} ${uPos.y}`);
    });

    const validChildren = u.children.filter((cid) => positions[cid]);
    let dropPath: string | null = null;
    const children: ChildConnector[] = [];

    if (validChildren.length > 0) {
      const busY = uPos.y + (LEVEL_HEIGHT - CARD_HEIGHT) * 0.52;
      dropPath = `M ${uPos.x} ${uPos.y} L ${uPos.x} ${busY}`;
      validChildren.forEach((cid) => {
        const cPos = positions[cid];
        const childTopX = cPos.x + CARD_WIDTH / 2;
        const childTopY = cPos.y;
        children.push({
          id: cid,
          path: `M ${uPos.x} ${busY} L ${childTopX} ${busY} L ${childTopX} ${childTopY}`,
          dot: { cx: childTopX, cy: childTopY },
        });
      });
    }

    groups.push({
      unionId: u.id,
      palette,
      dashed,
      partnerPaths,
      dropPath,
      children,
    });
  });

  return groups;
}
