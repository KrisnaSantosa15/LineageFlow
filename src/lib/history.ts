import {
  editorReducer,
  initialState,
  type EditorAction,
  type EditorState,
} from "./editor-state";
import type { Tree } from "./types";

export interface HistoryState {
  past: EditorState[];
  present: EditorState;
  future: EditorState[];
  hydrated?: boolean;
}

export type HistoryAction =
  | EditorAction
  | { type: "undo" }
  | { type: "redo" }
  | { type: "hydrate"; tree: Tree };

const MAX_HISTORY = 50;

export const createHistory = (
  present: EditorState,
  hydrated = false,
): HistoryState => ({
  past: [],
  present,
  future: [],
  hydrated,
});

export function historyReducer(state: HistoryState, action: HistoryAction): HistoryState {
  if (action.type === "hydrate") {
    return createHistory(initialState(action.tree), true);
  }

  if (action.type === "undo") {
    if (state.past.length === 0) return state;
    const previous = state.past[state.past.length - 1];
    const past = state.past.slice(0, -1);
    return {
      ...state,
      past,
      present: previous,
      future: [state.present, ...state.future],
    };
  }

  if (action.type === "redo") {
    if (state.future.length === 0) return state;
    const [next, ...future] = state.future;
    return { ...state, past: [...state.past, state.present], present: next, future };
  }

  const next = editorReducer(state.present, action);
  if (next === state.present) return state;

  if (action.type === "select" || action.type === "search") {
    return { ...state, present: next };
  }

  return {
    ...state,
    past: [...state.past.slice(-(MAX_HISTORY - 1)), state.present],
    present: next,
    future: [],
  };
}
