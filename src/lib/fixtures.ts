import type { Person, Tree, Union } from "./types";

export const person = (id: string, parentUnionId: string | null = null): Person => ({
  id,
  name: id,
  gender: "other",
  birth: "",
  death: "",
  note: "",
  parentUnionId,
});

export const union = (id: string, partners: string[], children: string[] = []): Union => ({
  id,
  partners,
  children,
  status: "married",
  label: "",
});

export const tree = (people: Person[], unions: Union[], rootPersonId: string): Tree => ({
  people: Object.fromEntries(people.map((p) => [p.id, p])),
  unions: Object.fromEntries(unions.map((u) => [u.id, u])),
  rootPersonId,
});
