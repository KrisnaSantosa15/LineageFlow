import { editorReducer, type EditorAction, type EditorState } from "./editor-state";

export interface HistoryState {
  past: EditorState[];
  present: EditorState;
  future: EditorState[];
}

export type HistoryAction = EditorAction | { type: "undo" } | { type: "redo" };

const MAX_HISTORY = 50;

export const createHistory = (present: EditorState): HistoryState => ({
  past: [],
  present,
  future: [],
});

export function historyReducer(state: HistoryState, action: HistoryAction): HistoryState {
  if (action.type === "undo") {
    if (state.past.length === 0) return state;
    const previous = state.past[state.past.length - 1];
    const past = state.past.slice(0, -1);
    return { past, present: previous, future: [state.present, ...state.future] };
  }

  if (action.type === "redo") {
    if (state.future.length === 0) return state;
    const [next, ...future] = state.future;
    return { past: [...state.past, state.present], present: next, future };
  }

  const next = editorReducer(state.present, action);
  if (next === state.present) return state;

  if (action.type === "select" || action.type === "search") {
    return { ...state, present: next };
  }

  if (action.type === "load") {
    return { past: [...state.past.slice(-(MAX_HISTORY - 1)), state.present], present: next, future: [] };
  }

  return {
    past: [...state.past.slice(-(MAX_HISTORY - 1)), state.present],
    present: next,
    future: [],
  };
}
