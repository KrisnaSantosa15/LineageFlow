import {
  CARD_HEIGHT,
  CARD_WIDTH,
  CLUSTER_GAP,
  LEVEL_HEIGHT,
  SPOUSE_GAP,
  UNION_COLOR_COUNT,
} from "./constants";
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

/**
 * Groups a generation into marriage clusters: [spouse1, person, spouse2, ...],
 * ordering sibling groups around bridge couples so two married partners'
 * respective sibling families never interleave or cross.
 */
function buildClusters(
  tree: Tree,
  ids: string[],
  gens: Record<string, number>,
  gen: number,
): string[][] {
  const unionKeys = Object.keys(tree.unions);
  const personKeys = Object.keys(tree.people);
  const sorted = [...ids].sort((a, b) => {
    const pa = tree.people[a].parentUnionId ?? "";
    const pb = tree.people[b].parentUnionId ?? "";
    if (pa !== pb) {
      if (!pa) return 1;
      if (!pb) return -1;
      return unionKeys.indexOf(pa) - unionKeys.indexOf(pb);
    }
    return personKeys.indexOf(a) - personKeys.indexOf(b);
  });

  const placed = new Set<string>();
  const rawClusters: string[][] = [];

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

    if (spouses.length === 0) {
      rawClusters.push([id]);
    } else if (spouses.length === 1) {
      const s = spouses[0];
      const pId = tree.people[id].parentUnionId;
      const pSpouse = tree.people[s].parentUnionId;
      // If one partner has parents and the other is an in-law without parents,
      // place the in-law on the outer left so siblings stay contiguous on the right.
      const idSibCount = pId
        ? ids.filter((x) => x !== id && tree.people[x].parentUnionId === pId).length
        : 0;
      const spouseSibCount = pSpouse
        ? ids.filter((x) => x !== s && tree.people[x].parentUnionId === pSpouse).length
        : 0;
      if (idSibCount > 0 && spouseSibCount === 0 && !pSpouse) {
        rawClusters.push([s, id]);
      } else {
        rawClusters.push([id, s]);
      }
    } else {
      rawClusters.push([spouses[0], id, ...spouses.slice(1)]);
    }
  });

  // Order clusters so that when a bridge cluster connects two parentUnionIds [uLeft, uRight],
  // all sibling clusters of uLeft appear immediately before the bridge cluster and
  // all sibling clusters of uRight appear immediately after it.
  const used = new Set<number>();
  const ordered: string[][] = [];

  const clusterParentUnions = rawClusters.map((c) =>
    Array.from(
      new Set(
        c
          .map((id) => tree.people[id].parentUnionId)
          .filter((uId): uId is string => Boolean(uId)),
      ),
    ),
  );

  rawClusters.forEach((cluster, idx) => {
    if (used.has(idx)) return;
    const pUnions = clusterParentUnions[idx];

    if (pUnions.length >= 2) {
      const [uLeft, uRight] = pUnions;
      // Ensure the partner belonging to uLeft is on the left side of the bridge cluster
      if (
        cluster.length === 2 &&
        tree.people[cluster[0]].parentUnionId === uRight &&
        tree.people[cluster[1]].parentUnionId === uLeft
      ) {
        cluster = [cluster[1], cluster[0]];
      }

      // 1. Place all unused sibling clusters belonging exclusively to uLeft
      rawClusters.forEach((other, oIdx) => {
        if (used.has(oIdx) || oIdx === idx) return;
        const oUnions = clusterParentUnions[oIdx];
        if (oUnions.length === 1 && oUnions[0] === uLeft) {
          used.add(oIdx);
          ordered.push(other);
        }
      });

      // 2. Place the bridge cluster itself
      used.add(idx);
      ordered.push(cluster);

      // 3. Place all unused sibling clusters belonging exclusively to uRight
      rawClusters.forEach((other, oIdx) => {
        if (used.has(oIdx) || oIdx === idx) return;
        const oUnions = clusterParentUnions[oIdx];
        if (oUnions.length === 1 && oUnions[0] === uRight) {
          used.add(oIdx);
          ordered.push(other);
        }
      });
      return;
    }

    // If this cluster belongs to a parentUnion that has a bridge cluster later, defer it
    if (pUnions.length === 1) {
      const targetUnion = pUnions[0];
      const bridgeIdx = rawClusters.findIndex(
        (_, bIdx) =>
          !used.has(bIdx) &&
          bIdx !== idx &&
          clusterParentUnions[bIdx].length >= 2 &&
          clusterParentUnions[bIdx].includes(targetUnion),
      );
      if (bridgeIdx !== -1) {
        return;
      }
    }

    used.add(idx);
    ordered.push(cluster);
  });

  // Flush any remaining clusters
  rawClusters.forEach((cluster, idx) => {
    if (!used.has(idx)) {
      used.add(idx);
      ordered.push(cluster);
    }
  });

  return ordered;
}

export function computeLayout(tree: Tree): Layout {
  const gens = assignGenerations(tree);
  const buckets: Record<number, string[]> = {};
  const clustersByGen: Record<number, string[][]> = {};

  Object.keys(tree.people).forEach((id) => {
    (buckets[gens[id]] ??= []).push(id);
  });

  const positions: Record<string, Point> = {};

  Object.entries(buckets).forEach(([genKey, ids]) => {
    const gen = Number(genKey);
    const clusters = buildClusters(tree, ids, gens, gen);
    clustersByGen[gen] = clusters;

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

  const genKeys = Object.keys(buckets)
    .map(Number)
    .sort((a, b) => a - b);

  // Refinement 1: top-down alignment of child clusters under their specific parent union hub
  for (let pass = 0; pass < 3; pass++) {
    genKeys.forEach((gen) => {
      const clusters = clustersByGen[gen] ?? [];
      if (clusters.length === 0) return;

      // Group clusters by their primary parentUnionId so siblings move together
      clusters.forEach((cluster) => {
        const parentUnions = Array.from(
          new Set(
            cluster
              .map((id) => tree.people[id].parentUnionId)
              .filter((uId): uId is string => Boolean(uId)),
          ),
        );
        if (parentUnions.length === 0) return;

        const targetCenters: number[] = [];
        parentUnions.forEach((uId) => {
          const u = tree.unions[uId];
          if (!u) return;
          const pXs = u.partners
            .filter((p) => positions[p])
            .map((p) => positions[p].x + CARD_WIDTH / 2);
          if (pXs.length > 0) {
            targetCenters.push(pXs.reduce((a, b) => a + b, 0) / pXs.length);
          }
        });
        if (targetCenters.length === 0) return;

        const targetX =
          targetCenters.reduce((a, b) => a + b, 0) / targetCenters.length;
        const childMembers = cluster.filter((id) =>
          Boolean(tree.people[id].parentUnionId),
        );
        const refIds = childMembers.length > 0 ? childMembers : cluster;
        const currentX =
          refIds
            .map((id) => positions[id].x + CARD_WIDTH / 2)
            .reduce((a, b) => a + b, 0) / refIds.length;

        const delta = (targetX - currentX) * 0.75;
        cluster.forEach((id) => {
          positions[id].x += delta;
        });
      });

      // Enforce minimum CLUSTER_GAP between consecutive clusters in this generation
      for (let i = 1; i < clusters.length; i++) {
        const prev = clusters[i - 1];
        const curr = clusters[i];
        const prevRight =
          Math.max(...prev.map((id) => positions[id].x)) + CARD_WIDTH;
        const currLeft = Math.min(...curr.map((id) => positions[id].x));
        if (currLeft < prevRight + CLUSTER_GAP) {
          const push = prevRight + CLUSTER_GAP - currLeft;
          curr.forEach((id) => {
            positions[id].x += push;
          });
        }
      }
    });
  }

  // Refinement 2: align top-level ancestor clusters (clusters without parents) above the
  // horizontal midpoint of their children when there are multiple clusters in that generation,
  // while keeping clusters separated by at least CLUSTER_GAP.
  genKeys.forEach((gen) => {
    const clusters = clustersByGen[gen] ?? [];
    if (clusters.length < 2) return;

    clusters.forEach((cluster) => {
      const hasParents = cluster.some((id) => Boolean(tree.people[id].parentUnionId));
      if (hasParents) return;

      const childIds = Object.values(tree.unions)
        .filter((u) => u.partners.some((p) => cluster.includes(p)))
        .flatMap((u) => u.children)
        .filter((cid) => positions[cid]);

      if (childIds.length === 0) return;

      const childCenters = childIds.map((cid) => positions[cid].x + CARD_WIDTH / 2);
      const targetMid =
        (Math.min(...childCenters) + Math.max(...childCenters)) / 2;

      const clusterMin = Math.min(...cluster.map((id) => positions[id].x));
      const clusterMax =
        Math.max(...cluster.map((id) => positions[id].x)) + CARD_WIDTH;
      const currentMid = (clusterMin + clusterMax) / 2;
      const delta = targetMid - currentMid;

      cluster.forEach((id) => {
        positions[id].x += delta;
      });
    });

    // Enforce left-to-right non-overlap between clusters in this generation
    for (let i = 1; i < clusters.length; i++) {
      const prevCluster = clusters[i - 1];
      const currCluster = clusters[i];
      const prevRight =
        Math.max(...prevCluster.map((id) => positions[id].x)) + CARD_WIDTH;
      const currLeft = Math.min(...currCluster.map((id) => positions[id].x));
      if (currLeft < prevRight + CLUSTER_GAP) {
        const push = prevRight + CLUSTER_GAP - currLeft;
        currCluster.forEach((id) => {
          positions[id].x += push;
        });
      }
    }
  });

  // Apply custom user node position overrides if present
  if (tree.overrides?.nodePositions) {
    for (const [id, customPt] of Object.entries(tree.overrides.nodePositions)) {
      if (positions[id] && customPt) {
        positions[id] = { x: customPt.x, y: customPt.y };
      }
    }
  }

  const unionPositions: Record<string, UnionPoint> = {};
  Object.values(tree.unions).forEach((u) => {
    const partners = u.partners.filter((id) => positions[id]);
    if (partners.length === 0) return;

    if (partners.length === 1) {
      const p = positions[partners[0]];
      unionPositions[u.id] = {
        x: p.x + CARD_WIDTH + 18,
        y: p.y + CARD_HEIGHT / 2,
        colorIdx: 0,
      };
      return;
    }

    const p1 = positions[partners[0]];
    const p2 = positions[partners[1]];
    const marriageIdx = Math.max(
      0,
      unionsOf(tree, partners[0]).findIndex((x) => x.id === u.id),
    );

    const leftX = Math.min(p1.x, p2.x);
    const rightX = Math.max(p1.x, p2.x);
    const sameGenIds = Object.keys(tree.people).filter(
      (id) =>
        id !== partners[0] &&
        id !== partners[1] &&
        positions[id] &&
        Math.abs(positions[id].y - p1.y) < CARD_HEIGHT,
    );
    const interveningCards = sameGenIds.filter(
      (id) => positions[id].x > leftX && positions[id].x < rightX,
    );

    let hubX = (leftX + CARD_WIDTH + rightX) / 2;
    if (interveningCards.length > 0) {
      // A 3rd+ spouse has intermediate spouse card(s) between p1 and p2.
      // Place the union hub in the gap immediately adjacent to the outer spouse
      // so it never overlaps an intermediate spouse card.
      const p1Unions = unionsOf(tree, partners[0]).length;
      const p2Unions = unionsOf(tree, partners[1]).length;
      const outerPos = p1Unions >= p2Unions ? p2 : p1;

      if (outerPos.x === rightX) {
        const leftNeighborX = Math.max(
          leftX,
          ...interveningCards.map((id) => positions[id].x),
        );
        hubX = (leftNeighborX + CARD_WIDTH + rightX) / 2;
      } else {
        const rightNeighborX = Math.min(
          rightX,
          ...interveningCards.map((id) => positions[id].x),
        );
        hubX = (leftX + CARD_WIDTH + rightNeighborX) / 2;
      }
    }

    unionPositions[u.id] = {
      x: hubX,
      y: (p1.y + p2.y) / 2 + CARD_HEIGHT / 2 + (marriageIdx * 10 - 4),
      colorIdx: marriageIdx % UNION_COLOR_COUNT,
    };
  });

  // Apply custom user union position overrides if present
  if (tree.overrides?.unionPositions) {
    for (const [uId, customPt] of Object.entries(tree.overrides.unionPositions)) {
      if (unionPositions[uId] && customPt) {
        unionPositions[uId] = {
          ...unionPositions[uId],
          x: customPt.x,
          y: customPt.y,
        };
      }
    }
  }

  return { positions, unionPositions, gens };
}
