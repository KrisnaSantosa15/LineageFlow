import { describe, expect, it } from "vitest";
import { renderTreeToSvgString } from "./export-svg";
import { person, tree, union } from "./fixtures";
import { computeLayout } from "./layout";

describe("renderTreeToSvgString", () => {
  it("renders a standalone SVG containing people names and union connectors", () => {
    const t = tree(
      [{ ...person("p1"), name: "Alice & Bob" }, { ...person("p2"), name: "Charlie" }],
      [union("u1", ["p1", "p2"])],
      "p1",
    );
    const svg = renderTreeToSvgString(t, computeLayout(t));
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain("Alice &amp; Bob");
    expect(svg).toContain("Charlie");
    expect(svg).toContain("<path");
  });
});
