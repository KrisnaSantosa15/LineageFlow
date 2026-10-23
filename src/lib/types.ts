export type Gender = "male" | "female" | "other";
export type UnionStatus = "married" | "divorced" | "partner" | "widowed";

export interface Person {
  id: string;
  name: string;
  gender: Gender;
  birth: string;
  death: string;
  note: string;
  parentUnionId: string | null;
}

export interface Union {
  id: string;
  partners: string[];
  children: string[];
  status: UnionStatus;
  label: string;
}

export interface Tree {
  people: Record<string, Person>;
  unions: Record<string, Union>;
  rootPersonId: string | null;
}
