import { describe, expect, it } from "vitest";
import { generationLabel, ordinal } from "./labels";

describe("generationLabel", () => {
  it.each([
    [0, "Gen 0 (Self/Peer)"],
    [-1, "Gen -1 (Parents)"],
    [-3, "Gen -3 (Great-GP)"],
    [-5, "Gen -5 (3x Great-GP)"],
    [1, "Gen +1 (Children)"],
    [4, "Gen +4 (2x Great-GC)"],
  ])("gen %i -> %s", (gen, label) => {
    expect(generationLabel(gen)).toBe(label);
  });
});

describe("ordinal", () => {
  it.each([[1, "1st"], [2, "2nd"], [3, "3rd"], [4, "4th"]])("%i -> %s", (n, s) => {
    expect(ordinal(n)).toBe(s);
  });
});
