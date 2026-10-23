import type { Person, Tree, Union, UnionStatus } from "./types";

type P = [id: string, name: string, gender: Person["gender"], birth: string, death: string, note: string, parent?: string];
type U = [id: string, partners: string[], status: UnionStatus, label: string];

function build(people: P[], unions: U[], rootPersonId: string): Tree {
  const t: Tree = { people: {}, unions: {}, rootPersonId };
  unions.forEach(([id, partners, status, label]) => {
    t.unions[id] = { id, partners, children: [], status, label } satisfies Union;
  });
  people.forEach(([id, name, gender, birth, death, note, parent]) => {
    t.people[id] = { id, name, gender, birth, death, note, parentUnionId: parent ?? null };
    if (parent) t.unions[parent].children.push(id);
  });
  return t;
}

const multi = () =>
  build(
    [
      ["p_ggp1", "Edmund Sterling", "male", "1902", "1981", "Great-Grandfather"],
      ["p_ggp2", "Clara Montgomery", "female", "1905", "1988", "Great-Grandmother"],
      ["p_gp1", "Arthur Sterling", "male", "1928", "2008", "Grandfather", "u_ggp"],
      ["p_gp2", "Margaret Hayes", "female", "1931", "2015", "Grandmother"],
      ["p_dad", "Richard Sterling", "male", "1954", "Living", "Father (Married Twice)", "u_gp"],
      ["p_uncle", "Thomas Sterling", "male", "1958", "Living", "Uncle", "u_gp"],
      ["p_mom1", "Helen Vance", "female", "1956", "Living", "1st Wife (Mother)"],
      ["p_mom2", "Diana Brooks", "female", "1963", "Living", "2nd Wife (Stepmother)"],
      ["p_self", "Alex Sterling (You)", "male", "1982", "Living", "2 Marriages, 3 Kids", "u_dad1"],
      ["p_sis", "Claire Sterling", "female", "1985", "Living", "Full Sister", "u_dad1"],
      ["p_hbro", "Lucas Sterling", "male", "1997", "Living", "Half-Brother (2nd Marriage)", "u_dad2"],
      ["p_sp1", "Sarah Jenkins", "female", "1983", "Living", "1st Spouse (Ex-Wife)"],
      ["p_sp2", "Maya Lin", "female", "1986", "Living", "2nd Spouse (Current)"],
      ["p_c1", "Ethan Sterling", "male", "2007", "Living", "Child from 1st Marriage", "u_self1"],
      ["p_c2", "Chloe Sterling", "female", "2016", "Living", "Child from 2nd Marriage", "u_self2"],
      ["p_c3", "Leo Sterling", "male", "2019", "Living", "Child from 2nd Marriage", "u_self2"],
    ],
    [
      ["u_ggp", ["p_ggp1", "p_ggp2"], "married", "Married 1924"],
      ["u_gp", ["p_gp1", "p_gp2"], "married", "Married 1951"],
      ["u_dad1", ["p_dad", "p_mom1"], "divorced", "1st Marriage (1978-1992)"],
      ["u_dad2", ["p_dad", "p_mom2"], "married", "2nd Marriage (1995)"],
      ["u_self1", ["p_self", "p_sp1"], "divorced", "1st Marriage (2005)"],
      ["u_self2", ["p_self", "p_sp2"], "married", "2nd Marriage (2014)"],
    ],
    "p_self",
  );

const ancestry = () =>
  build(
    [
      ["p_gggf", "William Pendelton", "male", "1875", "1949", "Great-Great-Grandfather"],
      ["p_gggm", "Beatrice Laurent", "female", "1879", "1955", "Great-Great-Grandmother"],
      ["p_ggf", "Henry Pendelton", "male", "1903", "1978", "Great-Grandfather", "u_1"],
      ["p_ggm", "Florence Nightingale", "female", "1906", "1984", "Great-Grandmother"],
      ["p_gf", "Edward Pendelton", "male", "1930", "2012", "Grandfather", "u_2"],
      ["p_gm", "Sylvia Rose", "female", "1933", "2018", "Grandmother"],
      ["p_f", "David Pendelton", "male", "1958", "Living", "Father", "u_3"],
      ["p_m", "Catherine Wu", "female", "1960", "Living", "Mother"],
      ["p_me", "Olivia Pendelton", "female", "1988", "Living", "Root Person (You)", "u_4"],
    ],
    [
      ["u_1", ["p_gggf", "p_gggm"], "married", "1899"],
      ["u_2", ["p_ggf", "p_ggm"], "married", "1926"],
      ["u_3", ["p_gf", "p_gm"], "married", "1954"],
      ["u_4", ["p_f", "p_m"], "married", "1983"],
    ],
    "p_me",
  );

const blank = () =>
  build(
    [["p_root", "Me (Root Member)", "male", "1995", "Living", "Click actions on the right to add parents, spouses & children"]],
    [],
    "p_root",
  );

export const PRESETS = { multi, ancestry, blank };
export type PresetName = keyof typeof PRESETS;

export function detectPreset(tree: Tree): PresetName | null {
  if ("p_self" in tree.people || "p_ggp1" in tree.people) return "multi";
  if ("p_me" in tree.people || "p_gggf" in tree.people) return "ancestry";
  if ("p_root" in tree.people) return "blank";
  return null;
}
