import { describe, expect, it } from "vitest";
import { describeRelationship } from "./kinship";
import { PRESETS } from "./presets";

describe("describeRelationship on multi preset", () => {
  const tree = PRESETS.multi();
  const root = "p_self"; // Alex Sterling

  it.each([
    ["p_self", "Self (Root)"],
    ["p_dad", "Father"],
    ["p_mom1", "Mother"],
    ["p_mom2", "Stepmother"],
    ["p_sis", "Full Sister"],
    ["p_hbro", "Half-Brother"],
    ["p_sp1", "Ex-Spouse"],
    ["p_sp2", "Spouse"],
    ["p_c1", "Son"],
    ["p_c2", "Daughter"],
    ["p_uncle", "Uncle"],
    ["p_gp1", "Grandfather"],
    ["p_ggp2", "Great-Grandmother"],
  ])("relates %s to root as %s", (targetId, expected) => {
    expect(describeRelationship(tree, root, targetId)).toBe(expected);
  });
});
