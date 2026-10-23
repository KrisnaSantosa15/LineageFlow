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
