import { describe, expect, it } from "vitest";
import { person, tree, union } from "./fixtures";
import { decodeTreeFromParam, encodeTreeToParam } from "./share-url";

describe("share URL codec", () => {
  const sample = tree(
    [{ ...person("p1"), name: "Alex Sterling (You)", birth: "1982" }, person("p2")],
    [union("u1", ["p1", "p2"])],
    "p1",
  );

  it("round-trips a tree through a URL-safe parameter", () => {
    const param = encodeTreeToParam(sample);
    expect(param).not.toMatch(/[+/=]/);
    expect(decodeTreeFromParam(param)).toEqual(sample);
  });

  it("returns null for corrupt or empty input", () => {
    expect(decodeTreeFromParam("")).toBeNull();
    expect(decodeTreeFromParam("not-valid-base64!!!")).toBeNull();
  });
});
