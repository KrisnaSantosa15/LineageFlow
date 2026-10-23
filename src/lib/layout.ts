import { CARD_HEIGHT, CARD_WIDTH, CLUSTER_GAP, LEVEL_HEIGHT, SPOUSE_GAP, UNION_COLOR_COUNT } from "./constants";
import { assignGenerations } from "./generations";
import type { Tree } from "./types";

export interface Point {
  x: number;
  y: number;
}

export interface UnionPoint extends Point {
  colorIdx: number;
}

export interface Layout {
  positions: Record<string, Point>;
  unionPositions: Record<string, UnionPoint>;
  gens: Record<string, number>;
}

const unionsOf = (tree: Tree, personId: string) =>
  Object.values(tree.unions).filter((u) => u.partners.includes(personId));

/** Groups a generation into marriage clusters: [spouse1, person, spouse2, ...]. */
function buildClusters(tree: Tree, ids: string[], gens: Record<string, number>, gen: number) {
  const sorted = [...ids].sort((a, b) => {
    const pa = tree.people[a].parentUnionId ?? "";
    const pb = tree.people[b].parentUnionId ?? "";
    return pa !== pb ? pa.localeCompare(pb) : a.localeCompare(b);
  });

  const placed = new Set<string>();
  const clusters: string[][] = [];

  sorted.forEach((id) => {
    if (placed.has(id)) return;
    const spouses: string[] = [];
    unionsOf(tree, id).forEach((u) =>
      u.partners.forEach((s) => {
        if (s !== id && gens[s] === gen && !placed.has(s)) spouses.push(s);
      }),
    );
    placed.add(id);
    spouses.forEach((s) => placed.add(s));

    if (spouses.length <= 1) clusters.push([id, ...spouses]);
    else clusters.push([spouses[0], id, ...spouses.slice(1)]);
  });

  return clusters;
}

export function computeLayout(tree: Tree): Layout {
  const gens = assignGenerations(tree);
  const buckets: Record<number, string[]> = {};
  Object.keys(tree.people).forEach((id) => {
    (buckets[gens[id]] ??= []).push(id);
  });

  const positions: Record<string, Point> = {};

  Object.entries(buckets).forEach(([genKey, ids]) => {
    const gen = Number(genKey);
    const clusters = buildClusters(tree, ids, gens, gen);

    let cursorX = 0;
    clusters.forEach((cluster, c) => {
      cluster.forEach((id, i) => {
        positions[id] = { x: cursorX, y: gen * LEVEL_HEIGHT };
        cursorX += CARD_WIDTH + (i < cluster.length - 1 ? SPOUSE_GAP : 0);
      });
      if (c < clusters.length - 1) cursorX += CLUSTER_GAP;
    });

    const shift = -cursorX / 2;
    ids.forEach((id) => (positions[id].x += shift));
  });

  const genKeys = Object.keys(buckets).map(Number).sort((a, b) => a - b);

  // Refinement: shift each generation toward the midpoint of its members' parents.
  for (let pass = 0; pass < 3; pass++) {
    genKeys.forEach((gen) => {
      const ids = buckets[gen];
      let sum = 0;
      let count = 0;
      ids.forEach((id) => {
        const parentUnion = tree.unions[tree.people[id].parentUnionId ?? ""];
        if (!parentUnion) return;
        const xs = parentUnion.partners
          .filter((p) => positions[p])
          .map((p) => positions[p].x + CARD_WIDTH / 2);
        if (xs.length === 0) return;
        sum += xs.reduce((a, b) => a + b, 0) / xs.length - (positions[id].x + CARD_WIDTH / 2);
        count++;
      });
      if (count > 0) {
        const shift = (sum / count) * 0.6;
        ids.forEach((id) => (positions[id].x += shift));
      }
    });
  }

  const unionPositions: Record<string, UnionPoint> = {};
  Object.values(tree.unions).forEach((u) => {
    const partners = u.partners.filter((id) => positions[id]);
    if (partners.length === 0) return;

    if (partners.length === 1) {
      const p = positions[partners[0]];
      unionPositions[u.id] = { x: p.x + CARD_WIDTH + 18, y: p.y + CARD_HEIGHT / 2, colorIdx: 0 };
      return;
    }

    const p1 = positions[partners[0]];
    const p2 = positions[partners[1]];
    const marriageIdx = Math.max(0, unionsOf(tree, partners[0]).findIndex((x) => x.id === u.id));
    unionPositions[u.id] = {
      x: (Math.min(p1.x, p2.x) + CARD_WIDTH + Math.max(p1.x, p2.x)) / 2,
      y: (p1.y + p2.y) / 2 + CARD_HEIGHT / 2 + (marriageIdx * 10 - 4),
      colorIdx: marriageIdx % UNION_COLOR_COUNT,
    };
  });

  return { positions, unionPositions, gens };
}
