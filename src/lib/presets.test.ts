import { describe, expect, it } from "vitest";
import { person, tree } from "./fixtures";
import { detectPreset, PRESETS } from "./presets";

describe.each(Object.entries(PRESETS))("preset %s", (_name, preset) => {
  const tree = preset();

  it("has a valid root and consistent references", () => {
    expect(tree.people[tree.rootPersonId!]).toBeDefined();
    Object.values(tree.unions).forEach((u) => {
      u.partners.forEach((id) => expect(tree.people[id], id).toBeDefined());
      u.children.forEach((id) => expect(tree.people[id].parentUnionId).toBe(u.id));
    });
    Object.values(tree.people).forEach((p) => {
      if (p.parentUnionId) expect(tree.unions[p.parentUnionId].children).toContain(p.id);
    });
  });
});

describe("multi preset", () => {
  it("includes a person with two marriages", () => {
    const t = PRESETS.multi();
    const counts = Object.values(t.unions).flatMap((u) => u.partners);
    expect(Math.max(...Object.keys(t.people).map((id) => counts.filter((c) => c === id).length))).toBe(2);
  });
});

describe("detectPreset", () => {
  it("identifies multi, ancestry, and blank presets and returns null for custom imported trees", () => {
    expect(detectPreset(PRESETS.multi())).toBe("multi");
    expect(detectPreset(PRESETS.ancestry())).toBe("ancestry");
    expect(detectPreset(PRESETS.blank())).toBe("blank");
    expect(detectPreset(tree([person("custom_1")], [], "custom_1"))).toBeNull();
  });
});
