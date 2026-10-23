import type { Gender, Tree } from "./types";

const byGender = (g: Gender, male: string, female: string, other: string) =>
  g === "male" ? male : g === "female" ? female : other;

const parentsOf = (tree: Tree, personId: string): string[] => {
  const pu = tree.people[personId]?.parentUnionId;
  return pu && tree.unions[pu] ? tree.unions[pu].partners.filter((id) => tree.people[id]) : [];
};

const childrenOf = (tree: Tree, personId: string): string[] =>
  Object.values(tree.unions)
    .filter((u) => u.partners.includes(personId))
    .flatMap((u) => u.children)
    .filter((id) => tree.people[id]);

export function describeRelationship(
  tree: Tree,
  rootId: string | null,
  targetId: string,
): string {
  if (!rootId || !tree.people[rootId] || !tree.people[targetId]) return "Relative";
  if (rootId === targetId) return "Self (Root)";

  const root = tree.people[rootId];
  const target = tree.people[targetId];
  const g = target.gender;

  // 1. Direct union partner (Spouse / Ex-Spouse / Partner)
  const sharedUnion = Object.values(tree.unions).find(
    (u) => u.partners.includes(rootId) && u.partners.includes(targetId),
  );
  if (sharedUnion) {
    if (sharedUnion.status === "divorced") return "Ex-Spouse";
    if (sharedUnion.status === "partner") return "Partner";
    return "Spouse";
  }

  // 2. Direct Parents & Step-Parents
  const myParents = parentsOf(tree, rootId);
  if (myParents.includes(targetId)) {
    return byGender(g, "Father", "Mother", "Parent");
  }
  const isStepParent = myParents.some((pid) =>
    Object.values(tree.unions).some(
      (u) =>
        u.id !== root.parentUnionId &&
        u.partners.includes(pid) &&
        u.partners.includes(targetId),
    ),
  );
  if (isStepParent) {
    return byGender(g, "Stepfather", "Stepmother", "Step-Parent");
  }

  // 3. Direct Children & Stepchildren
  const myChildren = childrenOf(tree, rootId);
  if (myChildren.includes(targetId)) {
    return byGender(g, "Son", "Daughter", "Child");
  }
  const mySpouses = Object.values(tree.unions)
    .filter((u) => u.partners.includes(rootId))
    .flatMap((u) => u.partners.filter((id) => id !== rootId));
  if (mySpouses.some((spId) => childrenOf(tree, spId).includes(targetId))) {
    return byGender(g, "Stepson", "Stepdaughter", "Stepchild");
  }

  // 4. Full Siblings & Half-Siblings
  if (root.parentUnionId && root.parentUnionId === target.parentUnionId) {
    return byGender(g, "Full Brother", "Full Sister", "Full Sibling");
  }
  const targetParents = parentsOf(tree, targetId);
  if (myParents.some((p) => targetParents.includes(p))) {
    return byGender(g, "Half-Brother", "Half-Sister", "Half-Sibling");
  }

  // 5. Upward Ancestors (Grandparents, Great-Grandparents, ...)
  let frontier = myParents;
  for (let depth = 2; depth <= 6 && frontier.length > 0; depth++) {
    const nextLevel = frontier.flatMap((pid) => parentsOf(tree, pid));
    if (nextLevel.includes(targetId)) {
      const prefix =
        depth === 2
          ? "Grand"
          : depth === 3
            ? "Great-Grand"
            : `${depth - 2}x Great-Grand`;
      return byGender(g, `${prefix}father`, `${prefix}mother`, `${prefix}parent`);
    }
    frontier = nextLevel;
  }

  // 6. Downward Descendants (Grandchildren, Great-Grandchildren, ...)
  let downFrontier = myChildren;
  for (let depth = 2; depth <= 6 && downFrontier.length > 0; depth++) {
    const nextDown = downFrontier.flatMap((cid) => childrenOf(tree, cid));
    if (nextDown.includes(targetId)) {
      const prefix =
        depth === 2
          ? "Grand"
          : depth === 3
            ? "Great-Grand"
            : `${depth - 2}x Great-Grand`;
      return byGender(g, `${prefix}son`, `${prefix}daughter`, `${prefix}child`);
    }
    downFrontier = nextDown;
  }

  // 7. Aunts / Uncles (siblings of a parent)
  const grandParents = myParents.flatMap((pid) => parentsOf(tree, pid));
  if (
    !myParents.includes(targetId) &&
    targetParents.some((tp) => grandParents.includes(tp))
  ) {
    return byGender(g, "Uncle", "Aunt", "Parent's Sibling");
  }

  // 8. Niblings (children of a full/half sibling)
  const mySiblings = Object.keys(tree.people).filter(
    (id) =>
      id !== rootId &&
      parentsOf(tree, id).some((p) => myParents.includes(p)),
  );
  if (mySiblings.some((sibId) => childrenOf(tree, sibId).includes(targetId))) {
    return byGender(g, "Nephew", "Niece", "Nibling");
  }

  return "Extended Relative";
}
