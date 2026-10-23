import type { Gender, Person, Tree, Union, UnionStatus } from "./types";

function formatGedcomName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length <= 1) return parts[0] || "Unknown";
  const surname = parts[parts.length - 1];
  const given = parts.slice(0, -1).join(" ");
  return `${given} /${surname}/`;
}

function parseGedcomName(raw: string): string {
  return raw.replace(/\//g, "").replace(/\s+/g, " ").trim() || "Unknown";
}

function genderToSex(gender: Gender): string {
  if (gender === "male") return "M";
  if (gender === "female") return "F";
  return "U";
}

function sexToGender(sex: string): Gender {
  const s = sex.trim().toUpperCase();
  if (s === "M") return "male";
  if (s === "F") return "female";
  return "other";
}

export function exportTreeToGedcom(tree: Tree): string {
  const lines: string[] = [
    "0 HEAD",
    "1 SOUR LineageFlow",
    "1 GEDC",
    "2 VERS 5.5.1",
    "2 FORM LINEAGE-LINKED",
    "1 CHAR UTF-8",
  ];

  for (const person of Object.values(tree.people)) {
    lines.push(`0 @${person.id}@ INDI`);
    lines.push(`1 NAME ${formatGedcomName(person.name)}`);
    lines.push(`1 SEX ${genderToSex(person.gender)}`);
    if (person.birth.trim()) {
      lines.push("1 BIRT");
      lines.push(`2 DATE ${person.birth.trim()}`);
    }
    const death = person.death.trim();
    if (death && death.toLowerCase() !== "living") {
      lines.push("1 DEAT");
      lines.push(`2 DATE ${death}`);
    }
    if (person.note.trim()) {
      lines.push(`1 NOTE ${person.note.replace(/\r?\n/g, " ").trim()}`);
    }
    for (const union of Object.values(tree.unions)) {
      if (union.partners.includes(person.id)) {
        lines.push(`1 FAMS @${union.id}@`);
      }
    }
    if (person.parentUnionId) {
      lines.push(`1 FAMC @${person.parentUnionId}@`);
    }
  }

  for (const union of Object.values(tree.unions)) {
    lines.push(`0 @${union.id}@ FAM`);
    const [p1, p2] = union.partners;
    if (p1) {
      const role1 = tree.people[p1]?.gender === "female" ? "WIFE" : "HUSB";
      lines.push(`1 ${role1} @${p1}@`);
    }
    if (p2) {
      const p1Role = p1 && tree.people[p1]?.gender === "female" ? "WIFE" : "HUSB";
      const role2 = p1Role === "HUSB" ? "WIFE" : "HUSB";
      lines.push(`1 ${role2} @${p2}@`);
    }
    for (const childId of union.children) {
      lines.push(`1 CHIL @${childId}@`);
    }
    if (union.label.trim()) {
      lines.push("1 MARR");
      lines.push(`2 DATE ${union.label.trim()}`);
    }
    if (union.status === "divorced") {
      lines.push("1 DIV Y");
    }
  }

  lines.push("0 TRLR");
  return lines.join("\n");
}

export function importTreeFromGedcom(gedcomText: string): Tree {
  const people: Record<string, Person> = {};
  const unions: Record<string, Union> = {};
  let currentType: "INDI" | "FAM" | null = null;
  let currentId = "";
  let currentSubTag = "";

  const rawLines = gedcomText.split(/\r?\n/);
  for (const rawLine of rawLines) {
    const line = rawLine.trim();
    if (!line) continue;

    const recordMatch = /^0\s+@([^@]+)@\s+(INDI|FAM)\b/i.exec(line);
    if (recordMatch) {
      currentId = recordMatch[1];
      currentType = recordMatch[2].toUpperCase() as "INDI" | "FAM";
      currentSubTag = "";
      if (currentType === "INDI") {
        people[currentId] = {
          id: currentId,
          name: "Unknown",
          gender: "other",
          birth: "",
          death: "Living",
          note: "",
          parentUnionId: null,
        };
      } else {
        unions[currentId] = {
          id: currentId,
          partners: [],
          children: [],
          status: "married",
          label: "",
        };
      }
      continue;
    }

    if (line.startsWith("0 ")) {
      currentType = null;
      currentId = "";
      currentSubTag = "";
      continue;
    }

    const tagMatch = /^([12])\s+([A-Z0-9_]+)(?:\s+(.*))?$/i.exec(line);
    if (!tagMatch || !currentType || !currentId) continue;

    const level = tagMatch[1];
    const tag = tagMatch[2].toUpperCase();
    const rest = (tagMatch[3] ?? "").trim();

    if (currentType === "INDI") {
      const person = people[currentId];
      if (!person) continue;
      if (level === "1") {
        currentSubTag = tag;
        if (tag === "NAME") person.name = parseGedcomName(rest);
        else if (tag === "SEX") person.gender = sexToGender(rest);
        else if (tag === "NOTE") person.note = rest;
        else if (tag === "FAMC") {
          const famId = rest.replace(/@/g, "").trim();
          if (famId) person.parentUnionId = famId;
        } else if (tag === "DEAT" && rest.toUpperCase() === "Y") {
          person.death = "Deceased";
        }
      } else if (level === "2" && tag === "DATE") {
        if (currentSubTag === "BIRT") person.birth = rest;
        else if (currentSubTag === "DEAT") person.death = rest || "Deceased";
      }
    } else if (currentType === "FAM") {
      const union = unions[currentId];
      if (!union) continue;
      if (level === "1") {
        currentSubTag = tag;
        if (tag === "HUSB" || tag === "WIFE") {
          const partnerId = rest.replace(/@/g, "").trim();
          if (partnerId && !union.partners.includes(partnerId)) {
            union.partners.push(partnerId);
          }
        } else if (tag === "CHIL") {
          const childId = rest.replace(/@/g, "").trim();
          if (childId && !union.children.includes(childId)) {
            union.children.push(childId);
          }
        } else if (tag === "DIV") {
          union.status = "divorced" satisfies UnionStatus;
        }
      } else if (level === "2" && tag === "DATE" && currentSubTag === "MARR") {
        union.label = rest;
      }
    }
  }

  for (const union of Object.values(unions)) {
    for (const childId of union.children) {
      if (people[childId] && !people[childId].parentUnionId) {
        people[childId].parentUnionId = union.id;
      }
    }
  }

  const ids = Object.keys(people);
  if (ids.length === 0) {
    throw new Error("No INDI records found in GEDCOM file.");
  }

  return {
    people,
    unions,
    rootPersonId: ids[0] ?? null,
  };
}
