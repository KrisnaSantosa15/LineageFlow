import type { OpResult } from "./tree-ops";
import { deletePerson } from "./tree-ops";
import type { Person, Tree } from "./types";

export interface EditorState {
  tree: Tree;
  selectedId: string | null;
  search: string;
}

export type EditorAction =
  | { type: "load"; tree: Tree }
  | { type: "apply"; result: OpResult }
  | { type: "select"; id: string }
  | { type: "update"; id: string; patch: Partial<Omit<Person, "id">> }
  | { type: "delete"; id: string }
  | { type: "setRoot"; id: string }
  | { type: "search"; query: string };

export const initialState = (tree: Tree): EditorState => ({
  tree,
  selectedId: tree.rootPersonId ?? Object.keys(tree.people)[0] ?? null,
  search: "",
});

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case "load":
      return initialState(action.tree);
    case "apply":
      return { ...state, tree: action.result.tree, selectedId: action.result.selectedId };
    case "select":
      return state.tree.people[action.id] ? { ...state, selectedId: action.id } : state;
    case "update": {
      const p = state.tree.people[action.id];
      if (!p) return state;
      const tree = { ...state.tree, people: { ...state.tree.people, [p.id]: { ...p, ...action.patch } } };
      return { ...state, tree };
    }
    case "delete": {
      const tree = deletePerson(state.tree, action.id);
      if (tree === state.tree) return state;
      const selectedId =
        state.selectedId === action.id || !tree.people[state.selectedId ?? ""]
          ? Object.keys(tree.people)[0]
          : state.selectedId;
      return { ...state, tree, selectedId };
    }
    case "setRoot":
      return { ...state, tree: { ...state.tree, rootPersonId: action.id } };
    case "search":
      return { ...state, search: action.query };
  }
}
