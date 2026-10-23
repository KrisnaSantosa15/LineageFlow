"use client";

import { ArrowUp, Baby, HeartHandshake, Users, X } from "lucide-react";
import { useState } from "react";
import type { RelativeActionType } from "@/components/canvas/TreeCanvas";
import { generationLabel, ordinal } from "@/lib/labels";
import {
  addChild,
  addParents,
  addSibling,
  addSpouse,
  type OpResult,
} from "@/lib/tree-ops";
import type { Gender, Tree, UnionStatus } from "@/lib/types";

interface AddRelativeModalProps {
  tree: Tree;
  gens: Record<string, number>;
  actionType: RelativeActionType;
  targetPersonId: string;
  preselectedUnionId?: string;
  onApply: (result: OpResult, toastMessage: string) => void;
  onClose: () => void;
}

export function AddRelativeModal({
  tree,
  gens,
  actionType,
  targetPersonId,
  preselectedUnionId,
  onApply,
  onClose,
}: AddRelativeModalProps) {
  const person = tree.people[targetPersonId];
  const myUnions = person
    ? Object.values(tree.unions).filter((u) => u.partners.includes(person.id))
    : [];
  const parentUnion = person?.parentUnionId
    ? tree.unions[person.parentUnionId]
    : undefined;

  const marriageNum = myUnions.length + 1;
  const ord = ordinal(marriageNum);

  const defaultGender: Gender =
    actionType === "spouse"
      ? person?.gender === "male"
        ? "female"
        : "male"
      : actionType === "parents" && parentUnion?.partners.length === 1
        ? tree.people[parentUnion.partners[0]]?.gender === "male"
          ? "female"
          : "male"
        : "male";

  const defaultNote =
    actionType === "parents"
      ? parentUnion
        ? "Parent"
        : "Father"
      : actionType === "spouse"
        ? `${ord} Spouse`
        : actionType === "child"
          ? "Child"
          : "Sibling";

  const defaultUnionChoice =
    actionType === "parents"
      ? "pair"
      : actionType === "child"
        ? preselectedUnionId ??
          myUnions[myUnions.length - 1]?.id ??
          "new_single_union"
        : parentUnion?.id ?? "auto_create_parents";

  const otherPeople = Object.values(tree.people).filter(
    (p) => p.id !== targetPersonId,
  );

  const [name, setName] = useState("");
  const [gender, setGender] = useState<Gender>(defaultGender);
  const [birth, setBirth] = useState("");
  const [death, setDeath] = useState("Living");
  const [note, setNote] = useState(defaultNote);
  const [unionChoice, setUnionChoice] = useState(defaultUnionChoice);
  const [unionStatus, setUnionStatus] = useState<UnionStatus>("married");
  const [unionLabel, setUnionLabel] = useState(`${ord} Marriage`);
  const [useExistingSpouse, setUseExistingSpouse] = useState(false);
  const [existingSpouseId, setExistingSpouseId] = useState(
    otherPeople[0]?.id ?? "",
  );

  if (!person) return null;

  const siblingUnionOptions: { id: string; label: string }[] = [];
  if (parentUnion) {
    const pNames = parentUnion.partners
      .map((id) => tree.people[id]?.name)
      .filter(Boolean)
      .join(" & ");
    siblingUnionOptions.push({
      id: parentUnion.id,
      label: `Full Sibling — Parents: ${pNames || "Current Parents"}`,
    });
    parentUnion.partners.forEach((pid) => {
      Object.values(tree.unions)
        .filter((u) => u.partners.includes(pid) && u.id !== parentUnion.id)
        .forEach((otherU) => {
          const otherNames = otherU.partners
            .map((id) => tree.people[id]?.name)
            .filter(Boolean)
            .join(" & ");
          siblingUnionOptions.push({
            id: otherU.id,
            label: `Half-Sibling — Union: ${otherNames} (${otherU.label})`,
          });
        });
    });
  } else {
    siblingUnionOptions.push({
      id: "auto_create_parents",
      label: "Create Shared Parent Union Automatically",
    });
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim() || "Unnamed Relative";
    const personData = {
      name: trimmedName,
      gender,
      birth: birth.trim(),
      death: death.trim() || "Living",
      note: note.trim(),
    };

    if (actionType === "parents") {
      const mode = unionChoice === "single" ? "single" : "pair";
      const res = addParents(tree, person.id, mode, personData);
      onApply(res, `Added parent for ${person.name}`);
      return;
    }

    if (actionType === "spouse") {
      if (useExistingSpouse && existingSpouseId) {
        const res = addSpouse(
          tree,
          person.id,
          { existingId: existingSpouseId },
          unionStatus,
          unionLabel.trim() || "Married",
        );
        onApply(res, `Added marriage union for ${person.name}`);
      } else {
        const res = addSpouse(
          tree,
          person.id,
          { data: personData },
          unionStatus,
          unionLabel.trim() || "Married",
        );
        onApply(res, `Added spouse ${trimmedName}`);
      }
      return;
    }

    if (actionType === "child") {
      const target =
        unionChoice === "new_single_union" || !tree.unions[unionChoice]
          ? { newUnionFor: person.id }
          : unionChoice;
      const res = addChild(tree, target, personData);
      onApply(res, `Added child ${trimmedName}`);
      return;
    }

    const chosenUnion =
      unionChoice === "auto_create_parents" ? null : unionChoice;
    const res = addSibling(tree, person.id, chosenUnion, personData);
    onApply(res, `Added sibling ${trimmedName}`);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-relative-title"
      className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4"
    >
      <div className="animate-pop-in bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="px-5 py-4 bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3
            id="add-relative-title"
            className="font-bold text-slate-800 dark:text-slate-100 text-base flex items-center gap-2"
          >
            {actionType === "parents" && (
              <>
                <ArrowUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                Add Parent / Ancestor Upward
              </>
            )}
            {actionType === "spouse" && (
              <>
                <HeartHandshake className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                Add {ord} Spouse / Partner
              </>
            )}
            {actionType === "child" && (
              <>
                <Baby className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Add Child Downward
              </>
            )}
            {actionType === "sibling" && (
              <>
                <Users className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                Add Sibling (Full or Half)
              </>
            )}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="w-8 h-8 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900 text-xs text-indigo-900 dark:text-indigo-200">
            {actionType === "parents" &&
              (parentUnion ? (
                parentUnion.partners.length === 1 ? (
                  <>
                    Adding the <strong>2nd Parent</strong> for{" "}
                    <strong>{person.name}</strong>.
                  </>
                ) : (
                  <>
                    <strong>{person.name}</strong> already has two parents in
                    this union. Adding another creates a step-parent union.
                  </>
                )
              ) : (
                <>
                  Adding an upward parent for <strong>{person.name}</strong>{" "}
                  (Generation {(gens[person.id] ?? 0) - 1}).
                </>
              ))}
            {actionType === "spouse" && (
              <>
                Adding <strong>{ord} Marriage / Union</strong> for{" "}
                <strong>{person.name}</strong>. You can add children
                specifically to this marriage afterward.
              </>
            )}
            {actionType === "child" && (
              <>
                Adding a child to <strong>{person.name}</strong> (Generation{" "}
                {(gens[person.id] ?? 0) + 1}). Choose which marriage/union this
                child belongs to.
              </>
            )}
            {actionType === "sibling" && (
              <>
                Adding a sibling on the same generation level as{" "}
                <strong>{person.name}</strong>.
              </>
            )}
          </div>

          {actionType === "parents" && !parentUnion && (
            <div className="space-y-1.5">
              <label
                htmlFor="union-select"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-200"
              >
                How would you like to add upward parents?
              </label>
              <select
                id="union-select"
                value={unionChoice}
                onChange={(e) => setUnionChoice(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-100"
              >
                <option value="pair">
                  Add Father & Mother Pair Together (Recommended)
                </option>
                <option value="single">Add Single Parent Only</option>
              </select>
            </div>
          )}

          {actionType === "child" && (
            <div className="space-y-1.5">
              <label
                htmlFor="union-select"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-200"
              >
                Select Parents / Marriage Union
              </label>
              <select
                id="union-select"
                value={unionChoice}
                onChange={(e) => setUnionChoice(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-100"
              >
                {myUnions.map((u, idx) => {
                  const spouseId = u.partners.find((id) => id !== person.id);
                  const spouseName = spouseId
                    ? tree.people[spouseId]?.name ?? "Partner"
                    : "Single Parent";
                  return (
                    <option key={u.id} value={u.id}>
                      Union #{idx + 1}: with {spouseName} ({u.label || u.status}
                      )
                    </option>
                  );
                })}
                <option value="new_single_union">
                  + Create Single-Parent Union (No Spouse Yet)
                </option>
              </select>
            </div>
          )}

          {actionType === "sibling" && (
            <div className="space-y-1.5">
              <label
                htmlFor="union-select"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-200"
              >
                Select Shared Parents Union (Full vs. Half-Sibling)
              </label>
              <select
                id="union-select"
                value={unionChoice}
                onChange={(e) => setUnionChoice(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-100"
              >
                {siblingUnionOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {actionType === "spouse" && otherPeople.length > 0 && (
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useExistingSpouse}
                  onChange={(e) => setUseExistingSpouse(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span>Marry an existing person already in the tree</span>
              </label>
              {useExistingSpouse && (
                <select
                  value={existingSpouseId}
                  onChange={(e) => setExistingSpouseId(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100"
                >
                  {otherPeople.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({generationLabel(gens[p.id] ?? 0)})
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {actionType === "spouse" && (
            <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800">
              <div>
                <label
                  htmlFor="union-status"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1"
                >
                  Union Status
                </label>
                <select
                  id="union-status"
                  value={unionStatus}
                  onChange={(e) =>
                    setUnionStatus(e.target.value as UnionStatus)
                  }
                  className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100"
                >
                  <option value="married">Married (Current)</option>
                  <option value="divorced">Divorced / Ex-Spouse</option>
                  <option value="partner">Partner / Unmarried</option>
                  <option value="widowed">Late Spouse / Widowed</option>
                </select>
              </div>
              <div>
                <label
                  htmlFor="union-label"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1"
                >
                  Marriage Label / Year
                </label>
                <input
                  id="union-label"
                  type="text"
                  value={unionLabel}
                  onChange={(e) => setUnionLabel(e.target.value)}
                  placeholder="e.g. 1st Marriage (1998)"
                  className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100"
                />
              </div>
            </div>
          )}

          {!(actionType === "spouse" && useExistingSpouse) && (
            <div className="space-y-3">
              <div>
                <label
                  htmlFor="relative-name"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1"
                >
                  Full Name *
                </label>
                <input
                  id="relative-name"
                  type="text"
                  required
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Eleanor Vance"
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label
                    htmlFor="relative-gender"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1"
                  >
                    Gender
                  </label>
                  <select
                    id="relative-gender"
                    value={gender}
                    onChange={(e) => setGender(e.target.value as Gender)}
                    className="w-full px-2.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="relative-birth"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1"
                  >
                    Birth Year
                  </label>
                  <input
                    id="relative-birth"
                    type="text"
                    value={birth}
                    onChange={(e) => setBirth(e.target.value)}
                    placeholder="e.g. 1965"
                    className="w-full px-2.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label
                    htmlFor="relative-death"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1"
                  >
                    Death / Living
                  </label>
                  <input
                    id="relative-death"
                    type="text"
                    value={death}
                    onChange={(e) => setDeath(e.target.value)}
                    placeholder="Living or 2020"
                    className="w-full px-2.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="relative-note"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1"
                >
                  Short Note / Role (Optional)
                </label>
                <input
                  id="relative-note"
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. 2nd Wife, Eldest Son, Maternal Grandfather"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 text-slate-800 dark:text-slate-100"
                />
              </div>
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition cursor-pointer"
            >
              Save & Connect
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
