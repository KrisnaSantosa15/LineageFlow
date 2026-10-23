import { describe, expect, it } from "vitest";
import { editorReducer, initialState } from "./editor-state";
import { person, tree, union } from "./fixtures";
import { addChild } from "./tree-ops";

const base = tree([person("me"), person("ex")], [union("u", ["me", "ex"])], "me");
const start = initialState(base);

describe("editorReducer", () => {
  it("starts with the root person selected", () => {
    expect(start.selectedId).toBe("me");
  });

  it("selects the new person after an add operation", () => {
    const result = addChild(base, "u", { name: "Kid" });
    const s = editorReducer(start, { type: "apply", result });
    expect(s.selectedId).toBe(result.selectedId);
    expect(s.tree).toBe(result.tree);
  });

  it("falls back to a remaining person when the selected one is deleted", () => {
    const s = editorReducer(start, { type: "delete", id: "me" });
    expect(s.selectedId).toBe("ex");
    expect(s.tree.rootPersonId).toBe("ex");
  });

  it("edits only the chosen person", () => {
    const s = editorReducer(start, { type: "update", id: "ex", patch: { name: "Zed" } });
    expect(s.tree.people.ex.name).toBe("Zed");
    expect(s.tree.people.me.name).toBe("me");
  });
});
