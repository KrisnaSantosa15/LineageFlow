import { describe, expect, it } from "vitest";
import { person, tree, union } from "./fixtures";
import { exportTreeToGedcom, importTreeFromGedcom } from "./gedcom";

describe("exportTreeToGedcom & importTreeFromGedcom", () => {
  const sample = tree(
    [
      { ...person("p1"), name: "Richard Sterling", gender: "male", birth: "1954", death: "Living" },
      { ...person("p2"), name: "Helen Vance", gender: "female", birth: "1956", death: "2020" },
      { ...person("p3", "u1"), name: "Alex Sterling", gender: "male", birth: "1982", death: "Living" },
    ],
    [{ ...union("u1", ["p1", "p2"], ["p3"]), status: "divorced", label: "1978" }],
    "p3",
  );

  const ged = exportTreeToGedcom(sample);

  it("includes GEDCOM 5.5.1 header and trailer", () => {
    expect(ged).toMatch(/^0 HEAD/);
    expect(ged).toContain("2 VERS 5.5.1");
    expect(ged.trim().endsWith("0 TRLR")).toBe(true);
  });

  it("writes INDI records with given/surname, sex, birth, death, FAMS, and FAMC", () => {
    expect(ged).toContain("0 @p1@ INDI");
    expect(ged).toContain("1 NAME Richard /Sterling/");
    expect(ged).toContain("1 SEX M");
    expect(ged).toContain("1 FAMS @u1@");
    expect(ged).toContain("0 @p2@ INDI");
    expect(ged).toContain("1 DEAT\n2 DATE 2020");
    expect(ged).toContain("0 @p3@ INDI");
    expect(ged).toContain("1 FAMC @u1@");
  });

  it("writes FAM records with partners, children, and DIV tag when divorced", () => {
    expect(ged).toContain("0 @u1@ FAM");
    expect(ged).toContain("1 HUSB @p1@");
    expect(ged).toContain("1 WIFE @p2@");
    expect(ged).toContain("1 CHIL @p3@");
    expect(ged).toContain("1 DIV Y");
  });

  it("round-trips GEDCOM back into a valid Tree", () => {
    const imported = importTreeFromGedcom(ged);
    expect(Object.keys(imported.people)).toHaveLength(3);
    expect(imported.people.p1?.name).toBe("Richard Sterling");
    expect(imported.people.p2?.death).toBe("2020");
    expect(imported.people.p3?.parentUnionId).toBe("u1");
    expect(imported.unions.u1?.partners).toEqual(["p1", "p2"]);
    expect(imported.unions.u1?.children).toEqual(["p3"]);
    expect(imported.unions.u1?.status).toBe("divorced");
  });
});
