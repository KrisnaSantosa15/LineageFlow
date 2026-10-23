import { assignGenerations } from "./generations";
import type { Tree } from "./types";

export interface TreeStats {
  memberCount: number;
  unionCount: number;
  generationCount: number;
  remarriageCount: number;
}

export function computeTreeStats(tree: Tree): TreeStats {
  const peopleIds = Object.keys(tree.people);
  const unions = Object.values(tree.unions);
  const gens = assignGenerations(tree);
  const uniqueGens = new Set(Object.values(gens));

  const partnerUnionCounts: Record<string, number> = {};
  for (const union of unions) {
    for (const partnerId of union.partners) {
      partnerUnionCounts[partnerId] = (partnerUnionCounts[partnerId] ?? 0) + 1;
    }
  }
  const remarriageCount = Object.values(partnerUnionCounts).filter((count) => count >= 2).length;

  return {
    memberCount: peopleIds.length,
    unionCount: unions.length,
    generationCount: uniqueGens.size,
    remarriageCount,
  };
}
