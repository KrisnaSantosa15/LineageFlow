import { describe, expect, it } from "vitest";
import { PRESETS } from "./presets";
import { computeTreeStats } from "./tree-stats";

describe("computeTreeStats", () => {
  it("computes member, union, generation, and remarriage counts for the multi-union preset", () => {
    const stats = computeTreeStats(PRESETS.multi());
    expect(stats.memberCount).toBe(16);
    expect(stats.unionCount).toBe(6);
    expect(stats.generationCount).toBe(5);
    expect(stats.remarriageCount).toBe(2); // Richard Sterling & Alex Sterling each have 2 unions
  });

  it("handles a single-person blank preset", () => {
    const stats = computeTreeStats(PRESETS.blank());
    expect(stats.memberCount).toBe(1);
    expect(stats.unionCount).toBe(0);
    expect(stats.generationCount).toBe(1);
    expect(stats.remarriageCount).toBe(0);
  });
});
