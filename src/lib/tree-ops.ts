import type { Person, Tree, Union } from "./types";

export type NewPerson = Partial<Omit<Person, "id" | "parentUnionId">> & { name: string };
export interface OpResult {
  tree: Tree;
  selectedId: string;
}

let counter = 0;
export const uid = (prefix: string) =>
  `${prefix}_${Date.now().toString(36)}${(counter++).toString(36)}`;

const makePerson = (data: NewPerson, parentUnionId: string | null = null): Person => ({
  id: uid("p"),
  name: data.name || "Unnamed Relative",
  gender: data.gender ?? "other",
  birth: data.birth ?? "",
  death: data.death || "Living",
  note: data.note ?? "",
  parentUnionId,
});

const makeUnion = (partners: string[], status: Union["status"], label: string): Union => ({
  id: uid("u"),
  partners,
  children: [],
  status,
  label,
});

/** Adds a child to an existing union, or to a new single-parent union of `newUnionFor`. */
export function addChild(
  tree: Tree,
  target: string | { newUnionFor: string },
  data: NewPerson,
): OpResult {
  const next = structuredClone(tree);
  let union: Union;
  if (typeof target === "string") {
    union = next.unions[target];
  } else {
    union = makeUnion([target.newUnionFor], "partner", "Single Parent Union");
    next.unions[union.id] = union;
  }
  const child = makePerson(data, union.id);
  next.people[child.id] = child;
  union.children.push(child.id);
  return { tree: next, selectedId: child.id };
}

/** Marries `personId` to a new or existing person, creating a new union. */
export function addSpouse(
  tree: Tree,
  personId: string,
  spouse: { existingId: string } | { data: NewPerson },
  status: Union["status"],
  label: string,
): OpResult {
  const next = structuredClone(tree);
  let spouseId: string;
  if ("existingId" in spouse) {
    spouseId = spouse.existingId;
  } else {
    const p = makePerson(spouse.data);
    next.people[p.id] = p;
    spouseId = p.id;
  }
  const union = makeUnion([personId, spouseId], status, label || "Married");
  next.unions[union.id] = union;
  return { tree: next, selectedId: spouseId };
}

/**
 * Adds a parent above `childId`. With no parents yet, "pair" also creates a spouse of the
 * opposite gender; a single-parent union gets its second partner; a full union gets a
 * step-parent married to the first parent.
 */
export function addParents(
  tree: Tree,
  childId: string,
  mode: "pair" | "single",
  data: NewPerson,
): OpResult {
  const next = structuredClone(tree);
  const child = next.people[childId];
  const existing = child.parentUnionId ? next.unions[child.parentUnionId] : undefined;

  if (existing && existing.partners.length < 2) {
    const p = makePerson({ ...data, note: data.note || "Parent" });
    next.people[p.id] = p;
    existing.partners.push(p.id);
    return { tree: next, selectedId: p.id };
  }

  if (existing) {
    const step = makePerson({ ...data, note: data.note || "Step-Parent" });
    next.people[step.id] = step;
    const union = makeUnion([existing.partners[0], step.id], "married", "2nd Marriage");
    next.unions[union.id] = union;
    return { tree: next, selectedId: step.id };
  }

  const first = makePerson({ ...data, note: data.note || (mode === "pair" ? "Father" : "Parent") });
  next.people[first.id] = first;
  const partners = [first.id];
  if (mode === "pair") {
    const lastName = data.name.includes(" ") ? data.name.split(" ").slice(-1)[0] : "";
    const second = makePerson({
      name: `Mother (${lastName || "Spouse"})`,
      gender: data.gender === "male" ? "female" : "male",
      birth: data.birth,
      death: data.death,
      note: "Mother (Click to rename)",
    });
    next.people[second.id] = second;
    partners.push(second.id);
  }
  const union = makeUnion(partners, "married", mode === "pair" ? "Parents Marriage" : "Parent");
  union.children.push(childId);
  next.unions[union.id] = union;
  child.parentUnionId = union.id;
  return { tree: next, selectedId: first.id };
}

/** Adds a sibling under `unionId`; with `null`, shared parents are created for `personId`. */
export function addSibling(
  tree: Tree,
  personId: string,
  unionId: string | null,
  data: NewPerson,
): OpResult {
  const next = structuredClone(tree);
  let union = unionId ? next.unions[unionId] : undefined;
  if (!union) {
    const target = next.people[personId];
    const father = makePerson({ name: `Parent of ${target.name}`, gender: "male", note: "Parent" });
    const mother = makePerson({ name: `Mother of ${target.name}`, gender: "female", note: "Parent" });
    next.people[father.id] = father;
    next.people[mother.id] = mother;
    union = makeUnion([father.id, mother.id], "married", "Parents Marriage");
    union.children.push(personId);
    next.unions[union.id] = union;
    target.parentUnionId = union.id;
  }
  const sibling = makePerson(data, union.id);
  next.people[sibling.id] = sibling;
  union.children.push(sibling.id);
  return { tree: next, selectedId: sibling.id };
}

/** Removes a person and cleans up unions. Returns the same tree if it is the last person. */
export function deletePerson(tree: Tree, personId: string): Tree {
  if (Object.keys(tree.people).length <= 1) return tree;
  const next = structuredClone(tree);
  delete next.people[personId];
  Object.values(next.unions).forEach((u) => {
    u.partners = u.partners.filter((id) => id !== personId);
    u.children = u.children.filter((id) => id !== personId);
    if (u.partners.length === 0 && u.children.length === 0) delete next.unions[u.id];
  });
  if (next.rootPersonId === personId) next.rootPersonId = Object.keys(next.people)[0];
  return next;
}

/** Updates a union's status or label immutably. */
export function updateUnion(
  tree: Tree,
  unionId: string,
  patch: Partial<Pick<Union, "status" | "label">>,
): Tree {
  const existing = tree.unions[unionId];
  if (!existing) return tree;
  return {
    ...tree,
    unions: {
      ...tree.unions,
      [unionId]: { ...existing, ...patch },
    },
  };
}

/** Deletes a marriage union and detaches its children without deleting any person. */
export function deleteUnion(tree: Tree, unionId: string): Tree {
  if (!tree.unions[unionId]) return tree;
  const next = structuredClone(tree);
  const removed = next.unions[unionId];
  removed.children.forEach((cid) => {
    if (next.people[cid]?.parentUnionId === unionId) {
      next.people[cid].parentUnionId = null;
    }
  });
  delete next.unions[unionId];
  return next;
}
