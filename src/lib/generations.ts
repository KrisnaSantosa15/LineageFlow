import type { Tree, Union } from "./types";

/**
 * Assigns each person an integer generation using BFS from the root (gen 0):
 * parents are gen - 1, spouses and siblings share gen, children are gen + 1.
 * People not connected to the root default to gen 0.
 */
export function assignGenerations(tree: Tree): Record<string, number> {
  const { people, unions } = tree;
  const gens: Record<string, number> = {};
  const startId =
    tree.rootPersonId && people[tree.rootPersonId]
      ? tree.rootPersonId
      : Object.keys(people)[0];

  if (startId) {
    const queue = [startId];
    gens[startId] = 0;

    const visit = (id: string, gen: number) => {
      if (people[id] && !(id in gens)) {
        gens[id] = gen;
        queue.push(id);
      }
    };

    while (queue.length > 0) {
      const id = queue.shift()!;
      const gen = gens[id];
      const parentUnion: Union | undefined = people[id].parentUnionId
        ? unions[people[id].parentUnionId!]
        : undefined;

      if (parentUnion) {
        parentUnion.partners.forEach((p) => visit(p, gen - 1));
        parentUnion.children.forEach((c) => visit(c, gen));
      }

      Object.values(unions)
        .filter((u) => u.partners.includes(id))
        .forEach((u) => {
          u.partners.forEach((p) => visit(p, gen));
          u.children.forEach((c) => visit(c, gen + 1));
        });
    }
  }

  Object.keys(people).forEach((id) => {
    if (!(id in gens)) gens[id] = 0;
  });
  return gens;
}
