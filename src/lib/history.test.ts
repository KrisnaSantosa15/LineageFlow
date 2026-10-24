import { describe, expect, it } from "vitest";
import { initialState } from "./editor-state";
import { person, tree, union } from "./fixtures";
import { createHistory, historyReducer } from "./history";
import { addChild } from "./tree-ops";

const base = tree([person("me"), person("ex")], [union("u", ["me", "ex"])], "me");

describe("historyReducer", () => {
  it("records tree-changing actions in past and supports undo/redo", () => {
    const h0 = createHistory(initialState(base));
    const result = addChild(base, "u", { name: "Kid" });
    const h1 = historyReducer(h0, { type: "apply", result });
    expect(h1.past).toHaveLength(1);
    expect(Object.keys(h1.present.tree.people)).toHaveLength(3);

    const hUndo = historyReducer(h1, { type: "undo" });
    expect(Object.keys(hUndo.present.tree.people)).toHaveLength(2);
    expect(hUndo.future).toHaveLength(1);

    const hRedo = historyReducer(hUndo, { type: "redo" });
    expect(Object.keys(hRedo.present.tree.people)).toHaveLength(3);
  });

  it("does not push selection or search changes onto the undo stack", () => {
    const h0 = createHistory(initialState(base));
    const h1 = historyReducer(h0, { type: "select", id: "ex" });
    const h2 = historyReducer(h1, { type: "search", query: "ex" });
    expect(h2.past).toHaveLength(0);
    expect(h2.present.selectedId).toBe("ex");
  });

  it("replaces present on hydrate without adding an undo entry and preserves hydrated flag", () => {
    const blank = tree([person("root")], [], "root");
    const h0 = createHistory(initialState(blank));
    expect(h0.hydrated).toBe(false);
    const hHydrated = historyReducer(h0, { type: "hydrate", tree: base });
    expect(hHydrated.hydrated).toBe(true);
    expect(hHydrated.past).toHaveLength(0);
    expect(hHydrated.future).toHaveLength(0);
    expect(Object.keys(hHydrated.present.tree.people)).toHaveLength(2);

    const result = addChild(base, "u", { name: "Kid" });
    const hApplied = historyReducer(hHydrated, { type: "apply", result });
    expect(hApplied.hydrated).toBe(true);
    const hUndone = historyReducer(hApplied, { type: "undo" });
    expect(hUndone.hydrated).toBe(true);
  });
});
