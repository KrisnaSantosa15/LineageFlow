"use client";

import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  HeartHandshake,
  MousePointerClick,
  Star,
  Trash2,
  Unlink,
  UserPen,
  Users,
} from "lucide-react";
import { useState } from "react";
import type { RelativeActionType } from "@/components/canvas/TreeCanvas";
import { describeRelationship } from "@/lib/kinship";
import { generationLabel } from "@/lib/labels";
import type { Person, Tree, Union, UnionStatus } from "@/lib/types";
import { UNION_COLORS } from "@/lib/union-colors";

interface InspectorPanelProps {
  tree: Tree;
  selectedId: string | null;
  gens: Record<string, number>;
  onSelectPerson: (id: string) => void;
  onUpdatePerson: (id: string, patch: Partial<Omit<Person, "id">>) => void;
  onUpdateUnion: (
    id: string,
    patch: Partial<Pick<Union, "status" | "label">>,
  ) => void;
  onDeleteUnion: (id: string) => void;
  onDeletePerson: (id: string) => void;
  onSetRoot: (id: string) => void;
  onOpenAddRelative: (
    action: RelativeActionType,
    personId: string,
    unionId?: string,
  ) => void;
}

export function InspectorPanel({
  tree,
  selectedId,
  gens,
  onSelectPerson,
  onUpdatePerson,
  onUpdateUnion,
  onDeleteUnion,
  onDeletePerson,
  onSetRoot,
  onOpenAddRelative,
}: InspectorPanelProps) {
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const person = selectedId ? tree.people[selectedId] : null;
  const gen = person ? (gens[person.id] ?? 0) : 0;
  const kinship = person
    ? describeRelationship(tree, tree.rootPersonId, person.id)
    : null;
  const myUnions = person
    ? Object.values(tree.unions).filter((u) => u.partners.includes(person.id))
    : [];
  const parentUnion = person?.parentUnionId
    ? tree.unions[person.parentUnionId]
    : undefined;

  return (
    <aside
      aria-label="Member Inspector"
      className={`bg-white dark:bg-slate-900 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 w-full md:w-88 lg:w-96 flex flex-col z-20 shadow-lg shrink-0 transition-all duration-200 ${
        mobileExpanded ? "max-h-[75vh]" : "max-h-14"
      } md:max-h-none md:h-full`}
    >
      {/* Inspector Header (Doubles as mobile sheet toggle) */}
      <div
        onClick={() => setMobileExpanded((prev) => !prev)}
        className="p-3.5 md:p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900 cursor-pointer md:cursor-default shrink-0"
      >
        <div className="flex items-center gap-2 min-w-0">
          <UserPen className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <h2 className="font-bold text-slate-800 dark:text-slate-100 text-sm truncate">
            {person ? person.name : "Member Inspector"}
          </h2>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {kinship && (
            <span
              data-testid="kinship-badge"
              className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
            >
              {kinship}
            </span>
          )}
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            {person ? generationLabel(gen) : "None"}
          </span>
          <span className="md:hidden text-slate-500 dark:text-slate-400">
            {mobileExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronUp className="w-4 h-4" />
            )}
          </span>
        </div>
      </div>

      {/* Scrollable Inspector Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {!person ? (
          <div className="text-center py-12 text-slate-500 dark:text-slate-400">
            <MousePointerClick className="w-8 h-8 mx-auto mb-2 opacity-60" />
            <p className="text-xs">
              Select any family member card on the canvas to inspect or add
              relatives.
            </p>
          </div>
        ) : (
          <>
            {/* Add Relative Action Grid */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200">
                Add Family Members
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onOpenAddRelative("parents", person.id)}
                  className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/70 border border-indigo-200 dark:border-indigo-800 text-left flex flex-col items-start transition cursor-pointer"
                >
                  <span className="flex items-center gap-1.5 text-xs font-bold text-indigo-800 dark:text-indigo-200">
                    <ArrowUp className="w-3.5 h-3.5" /> Add Parents
                  </span>
                  <span className="text-[10px] text-indigo-700 dark:text-indigo-300 mt-0.5">
                    Father, Mother, Ancestors
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => onOpenAddRelative("spouse", person.id)}
                  className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/70 border border-amber-200 dark:border-amber-800 text-left flex flex-col items-start transition cursor-pointer"
                >
                  <span className="flex items-center gap-1.5 text-xs font-bold text-amber-900 dark:text-amber-200">
                    <HeartHandshake className="w-3.5 h-3.5" /> Add Spouse (#
                    {myUnions.length + 1})
                  </span>
                  <span className="text-[10px] text-amber-800 dark:text-amber-300 mt-0.5">
                    1st, 2nd, 3rd Marriage
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => onOpenAddRelative("child", person.id)}
                  className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/70 border border-emerald-200 dark:border-emerald-800 text-left flex flex-col items-start transition cursor-pointer"
                >
                  <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-900 dark:text-emerald-200">
                    <ArrowDown className="w-3.5 h-3.5" /> Add Child
                  </span>
                  <span className="text-[10px] text-emerald-800 dark:text-indigo-300 mt-0.5">
                    Choose which marriage
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => onOpenAddRelative("sibling", person.id)}
                  className="p-2.5 rounded-xl bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900/70 border border-sky-200 dark:border-sky-800 text-left flex flex-col items-start transition cursor-pointer"
                >
                  <span className="flex items-center gap-1.5 text-xs font-bold text-sky-900 dark:text-sky-200">
                    <Users className="w-3.5 h-3.5" /> Add Sibling
                  </span>
                  <span className="text-[10px] text-sky-800 dark:text-sky-300 mt-0.5">
                    Full or Half-Sibling
                  </span>
                </button>
              </div>
            </div>

            {/* Marriages & Children per Marriage */}
            <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  Marriages & Unions ({myUnions.length})
                </h3>
                <button
                  type="button"
                  onClick={() => onOpenAddRelative("spouse", person.id)}
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  + New Marriage
                </button>
              </div>

              {myUnions.length === 0 ? (
                <div className="p-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-center">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                    No marriages or partnerships yet.
                  </p>
                  <button
                    type="button"
                    onClick={() => onOpenAddRelative("spouse", person.id)}
                    className="px-3 py-1.5 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800 rounded-xl text-xs font-semibold transition inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <HeartHandshake className="w-3.5 h-3.5" /> Add 1st Spouse /
                    Partner
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {myUnions.map((u, idx) => {
                    const partnerId = u.partners.find((id) => id !== person.id);
                    const partner = partnerId ? tree.people[partnerId] : null;
                    const palette =
                      UNION_COLORS[idx % UNION_COLORS.length] ??
                      UNION_COLORS[0];
                    const childrenList = u.children
                      .map((cid) => tree.people[cid])
                      .filter(Boolean);

                    return (
                      <div
                        key={u.id}
                        className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <span
                              style={{
                                backgroundColor: palette.bg,
                                color: palette.text,
                                borderColor: palette.border,
                              }}
                              className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border inline-block"
                            >
                              Union #{idx + 1} · {u.status}
                            </span>
                            <div className="text-xs font-bold text-slate-800 dark:text-slate-100 mt-1 truncate">
                              {partner ? (
                                <>
                                  Spouse:{" "}
                                  <button
                                    type="button"
                                    onClick={() => onSelectPerson(partner.id)}
                                    className="text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                                  >
                                    {partner.name}
                                  </button>
                                </>
                              ) : (
                                "Single / Unnamed Partner"
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() =>
                                onOpenAddRelative("child", person.id, u.id)
                              }
                              className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-semibold shadow-xs transition cursor-pointer"
                            >
                              + Child Here
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteUnion(u.id)}
                              title="Dissolve / remove this union"
                              aria-label={`Dissolve Union #${idx + 1}`}
                              className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition cursor-pointer"
                            >
                              <Unlink className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Inline Union Status & Label Controls */}
                        <div className="grid grid-cols-2 gap-1.5 pt-1">
                          <select
                            aria-label={`Union #${idx + 1} status`}
                            value={u.status}
                            onChange={(e) =>
                              onUpdateUnion(u.id, {
                                status: e.target.value as UnionStatus,
                              })
                            }
                            className="px-2 py-1 text-[11px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200"
                          >
                            <option value="married">Married</option>
                            <option value="divorced">Divorced / Ex</option>
                            <option value="partner">Partner</option>
                            <option value="widowed">Widowed</option>
                          </select>
                          <input
                            type="text"
                            aria-label={`Union #${idx + 1} label`}
                            value={u.label}
                            placeholder="Label / Year"
                            onChange={(e) =>
                              onUpdateUnion(u.id, { label: e.target.value })
                            }
                            className="px-2 py-1 text-[11px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200"
                          />
                        </div>

                        <div className="pt-1.5 border-t border-slate-200/70 dark:border-slate-700/70">
                          <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                            Children from Union #{idx + 1} (
                            {childrenList.length}):
                          </span>
                          {childrenList.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {childrenList.map((ch) => (
                                <button
                                  key={ch.id}
                                  type="button"
                                  onClick={() => onSelectPerson(ch.id)}
                                  className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 rounded-lg text-[11px] font-medium text-slate-700 dark:text-slate-200 cursor-pointer"
                                >
                                  {ch.name}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                              No children in this marriage yet
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Upward Lineage (Parents) */}
            <div className="space-y-1.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200">
                Upward Lineage (Parents)
              </h3>
              {parentUnion ? (
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                  <div className="text-xs text-slate-700 dark:text-slate-200 min-w-0">
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block">
                      Parents ({parentUnion.label || "Union"})
                    </span>
                    <div className="flex flex-wrap items-center gap-1 mt-0.5">
                      {parentUnion.partners
                        .map((pid) => tree.people[pid])
                        .filter(Boolean)
                        .map((p, idx, arr) => (
                          <span key={p.id}>
                            <button
                              type="button"
                              onClick={() => onSelectPerson(p.id)}
                              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                            >
                              {p.name}
                            </button>
                            {idx < arr.length - 1 ? " & " : ""}
                          </span>
                        ))}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenAddRelative("sibling", person.id)}
                    className="px-2 py-1 text-[11px] font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-indigo-400 text-slate-700 dark:text-slate-200 shrink-0 cursor-pointer"
                  >
                    + Sibling
                  </button>
                </div>
              ) : (
                <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                  No parents recorded yet.
                </p>
              )}
            </div>

            {/* Edit Selected Member Form */}
            <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  Edit Member Profile
                </h3>
                <button
                  type="button"
                  onClick={() => onSetRoot(person.id)}
                  className="text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 inline-flex items-center gap-1 cursor-pointer"
                  title="Make Gen 0 Reference"
                >
                  <Star className="w-3 h-3" /> Set as Gen 0 Root
                </button>
              </div>

              <div>
                <label
                  htmlFor="inspector-name"
                  className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1"
                >
                  Full Name
                </label>
                <input
                  id="inspector-name"
                  type="text"
                  value={person.name}
                  onChange={(e) =>
                    onUpdatePerson(person.id, { name: e.target.value })
                  }
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 focus:outline-none text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label
                    htmlFor="inspector-gender"
                    className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1"
                  >
                    Gender
                  </label>
                  <select
                    id="inspector-gender"
                    value={person.gender}
                    onChange={(e) =>
                      onUpdatePerson(person.id, {
                        gender: e.target.value as Person["gender"],
                      })
                    }
                    className="w-full px-2 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="inspector-birth"
                    className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1"
                  >
                    Birth Year
                  </label>
                  <input
                    id="inspector-birth"
                    type="text"
                    value={person.birth}
                    onChange={(e) =>
                      onUpdatePerson(person.id, { birth: e.target.value })
                    }
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label
                    htmlFor="inspector-death"
                    className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1"
                  >
                    Death / Status
                  </label>
                  <input
                    id="inspector-death"
                    type="text"
                    value={person.death}
                    onChange={(e) =>
                      onUpdatePerson(person.id, { death: e.target.value })
                    }
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="inspector-note"
                  className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1"
                >
                  Role / Bio Note
                </label>
                <input
                  id="inspector-note"
                  type="text"
                  value={person.note}
                  onChange={(e) =>
                    onUpdatePerson(person.id, { note: e.target.value })
                  }
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 focus:outline-none text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  disabled={Object.keys(tree.people).length <= 1}
                  onClick={() => onDeletePerson(person.id)}
                  className="px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 disabled:opacity-40 rounded-xl transition inline-flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Remove Member
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
