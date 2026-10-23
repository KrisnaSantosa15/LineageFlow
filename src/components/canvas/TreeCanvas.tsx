"use client";

import {
  ArrowUp,
  Expand,
  HeartCrack,
  HeartHandshake,
  Mars,
  Minus,
  Plus,
  Sparkles,
  Star,
  User,
  Venus,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buildConnectorGeometry } from "@/lib/connectors";
import { CARD_HEIGHT, CARD_WIDTH } from "@/lib/constants";
import { generationLabel } from "@/lib/labels";
import { computeLayout, type Layout } from "@/lib/layout";
import type { Person, Tree } from "@/lib/types";
import { UNION_COLORS } from "@/lib/union-colors";
import { fitView, zoomAt, type View } from "@/lib/viewport";

export type RelativeActionType = "parents" | "spouse" | "child" | "sibling";

interface TreeCanvasProps {
  tree: Tree;
  selectedId: string | null;
  searchQuery: string;
  view: View;
  onViewChange: (view: View) => void;
  onSelectPerson: (id: string) => void;
  onOpenAddRelative?: (action: RelativeActionType, personId: string, unionId?: string) => void;
  readOnly?: boolean;
  className?: string;
}

export function TreeCanvas({
  tree,
  selectedId,
  searchQuery,
  view,
  onViewChange,
  onSelectPerson,
  onOpenAddRelative,
  readOnly = false,
  className = "",
}: TreeCanvasProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [isInteracting, setIsInteracting] = useState(false);
  const wheelTimeoutRef = useRef<number | null>(null);
  const dragRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    pinchDist: number | null;
  }>({ active: false, startX: 0, startY: 0, pinchDist: null });

  const layout: Layout = useMemo(() => computeLayout(tree), [tree]);
  const connectors = useMemo(() => buildConnectorGeometry(tree, layout), [tree, layout]);

  const handleFit = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setIsInteracting(false);
    onViewChange(fitView(layout.positions, { width: rect.width, height: rect.height }));
  }, [layout.positions, onViewChange]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setIsInteracting(true);
      if (wheelTimeoutRef.current !== null) {
        window.clearTimeout(wheelTimeoutRef.current);
      }
      wheelTimeoutRef.current = window.setTimeout(() => {
        setIsInteracting(false);
      }, 120);
      const rect = el.getBoundingClientRect();
      const delta = e.deltaY < 0 ? 0.08 : -0.08;
      onViewChange(
        zoomAt(view, delta, { x: e.clientX - rect.left, y: e.clientY - rect.top }),
      );
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [view, onViewChange]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest("[data-node-interactive]")) return;
    setIsInteracting(true);
    dragRef.current = {
      active: true,
      startX: e.clientX - view.x,
      startY: e.clientY - view.y,
      pinchDist: null,
    };
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current.active) return;
      onViewChange({
        ...view,
        x: e.clientX - dragRef.current.startX,
        y: e.clientY - dragRef.current.startY,
      });
    };
    const onUp = () => {
      if (dragRef.current.active) {
        dragRef.current.active = false;
        setIsInteracting(false);
      }
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [view, onViewChange]);

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest("[data-node-interactive]")) return;
    setIsInteracting(true);
    if (e.touches.length === 1) {
      dragRef.current = {
        active: true,
        startX: e.touches[0].clientX - view.x,
        startY: e.touches[0].clientY - view.y,
        pinchDist: null,
      };
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      dragRef.current = {
        active: false,
        startX: 0,
        startY: 0,
        pinchDist: Math.hypot(dx, dy),
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 1 && dragRef.current.active) {
      onViewChange({
        ...view,
        x: e.touches[0].clientX - dragRef.current.startX,
        y: e.touches[0].clientY - dragRef.current.startY,
      });
    } else if (e.touches.length === 2 && dragRef.current.pinchDist !== null) {
      const el = viewportRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const delta = (dist - dragRef.current.pinchDist) * 0.004;
      dragRef.current.pinchDist = dist;
      const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
      const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;
      onViewChange(zoomAt(view, delta, { x: midX, y: midY }));
    }
  };

  const handleTouchEnd = () => {
    dragRef.current.active = false;
    dragRef.current.pinchDist = null;
    setIsInteracting(false);
  };

  const zoomStep = (delta: number) => {
    const el = viewportRef.current;
    const rect = el?.getBoundingClientRect();
    const cx = rect ? rect.width / 2 : 400;
    const cy = rect ? rect.height / 2 : 300;
    setIsInteracting(false);
    onViewChange(zoomAt(view, delta, { x: cx, y: cy }));
  };

  const totalPeople = Object.keys(tree.people).length;
  const totalUnions = Object.keys(tree.unions).length;

  return (
    <div
      ref={viewportRef}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={`bg-dot-grid relative flex-1 h-full overflow-hidden cursor-grab active:cursor-grabbing select-none touch-none ${className}`}
    >
      <div
        className={`absolute top-0 left-0 origin-top-left ${
          isInteracting ? "" : "canvas-camera-smooth"
        }`}
        style={{
          transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
        }}
      >
        <svg
          className="overflow-visible pointer-events-none absolute top-0 left-0"
          width="1"
          height="1"
        >
          {connectors.map((g) => (
            <g key={g.unionId}>
              {g.partnerPaths.map((d, i) => (
                <path
                  key={i}
                  d={d}
                  stroke={g.palette.stroke}
                  strokeWidth={2.5}
                  fill="none"
                  strokeDasharray={g.dashed ? "6,4" : undefined}
                />
              ))}
              {g.dropPath && (
                <path
                  d={g.dropPath}
                  stroke={g.palette.stroke}
                  strokeWidth={2.2}
                  fill="none"
                />
              )}
              {g.children.map((c) => (
                <g key={c.id}>
                  <path
                    d={c.path}
                    stroke={g.palette.stroke}
                    strokeWidth={2.2}
                    strokeLinejoin="round"
                    fill="none"
                  />
                  <circle
                    cx={c.dot.cx}
                    cy={c.dot.cy}
                    r={3.5}
                    fill={g.palette.stroke}
                  />
                </g>
              ))}
            </g>
          ))}
        </svg>

        <div className="relative">
          {Object.values(tree.unions).map((u) => {
            const uPos = layout.unionPositions[u.id];
            if (!uPos) return null;
            const palette = UNION_COLORS[uPos.colorIdx ?? 0] ?? UNION_COLORS[0];
            const isDivorced = u.status === "divorced";
            return (
              <button
                key={u.id}
                type="button"
                data-node-interactive="true"
                onClick={(e) => {
                  e.stopPropagation();
                  if (u.partners[0]) {
                    onSelectPerson(u.partners[0]);
                    if (!readOnly && onOpenAddRelative) {
                      onOpenAddRelative("child", u.partners[0], u.id);
                    }
                  }
                }}
                title={`${u.label || "Marriage"} (${u.children.length} children)${readOnly ? "" : " — Click to add child"}`}
                style={{
                  left: `${uPos.x}px`,
                  top: `${uPos.y}px`,
                  backgroundColor: palette.bg,
                  borderColor: palette.border,
                  color: palette.text,
                }}
                className="union-pill absolute -translate-x-1/2 -translate-y-1/2 z-10 px-2 py-0.5 rounded-full shadow-xs border text-[10px] font-bold flex items-center gap-1 cursor-pointer"
              >
                {isDivorced ? (
                  <HeartCrack className="w-2.5 h-2.5" />
                ) : (
                  <HeartHandshake className="w-2.5 h-2.5" />
                )}
                <span>{u.children.length}</span>
              </button>
            );
          })}

          {Object.values(tree.people).map((person) => {
            const pos = layout.positions[person.id];
            if (!pos) return null;
            const isSelected = person.id === selectedId;
            const isRoot = person.id === tree.rootPersonId;
            const isSearchMatch =
              searchQuery.trim().length > 0 &&
              person.name.toLowerCase().includes(searchQuery.toLowerCase());
            const myUnions = Object.values(tree.unions).filter((u) =>
              u.partners.includes(person.id),
            );
            const gen = layout.gens[person.id] ?? 0;

            return (
              <PersonNodeCard
                key={person.id}
                person={person}
                pos={pos}
                gen={gen}
                isSelected={isSelected}
                isRoot={isRoot}
                isSearchMatch={isSearchMatch}
                unionCount={myUnions.length}
                readOnly={readOnly}
                onSelect={() => onSelectPerson(person.id)}
                onQuickAction={(action) =>
                  onOpenAddRelative?.(action, person.id)
                }
              />
            );
          })}
        </div>
      </div>

      {/* Bottom-Left Legend */}
      <div className="absolute bottom-4 left-4 z-20 hidden sm:flex flex-col gap-2 pointer-events-none">
        <div
          data-node-interactive="true"
          className="bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-md pointer-events-auto max-w-xs"
        >
          <div className="flex items-center justify-between gap-4 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Diagram Legend
            </span>
            <span className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/70 px-2 py-0.5 rounded-full">
              {totalPeople} Members · {totalUnions} Unions
            </span>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-slate-600 dark:text-slate-300">
            <div className="flex items-center gap-2">
              <span className="w-4 h-0.5 bg-amber-500 inline-block" />
              <span>1st Marriage</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-0.5 bg-purple-500 inline-block" />
              <span>2nd+ Marriage</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-0.5 border-b-2 border-dashed border-rose-400 inline-block" />
              <span>Divorced / Ex</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-full bg-amber-100 border border-amber-400 inline-flex items-center justify-center text-amber-700">
                <HeartHandshake className="w-2.5 h-2.5" />
              </span>
              <span>Union Hub</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom-Right Zoom Controls */}
      <div
        data-node-interactive="true"
        className="absolute bottom-4 right-4 z-20 flex items-center gap-1 bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 rounded-2xl p-1.5 shadow-md"
      >
        <button
          type="button"
          onClick={() => zoomStep(-0.15)}
          className="btn-tactile w-8 h-8 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center cursor-pointer"
          title="Zoom Out"
          aria-label="Zoom out"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={handleFit}
          className="btn-tactile text-xs font-semibold text-slate-700 dark:text-slate-200 px-2 py-1 rounded-lg cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 tabular-nums"
          title="Reset Zoom"
        >
          {Math.round(view.scale * 100)}%
        </button>
        <button
          type="button"
          onClick={() => zoomStep(0.15)}
          className="btn-tactile w-8 h-8 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center cursor-pointer"
          title="Zoom In"
          aria-label="Zoom in"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
        <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-0.5" />
        <button
          type="button"
          onClick={handleFit}
          className="btn-tactile px-2.5 h-8 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-medium flex items-center gap-1 cursor-pointer"
          title="Fit Entire Tree"
        >
          <Expand className="w-3.5 h-3.5" /> Fit
        </button>
      </div>
    </div>
  );
}

interface PersonNodeCardProps {
  person: Person;
  pos: { x: number; y: number };
  gen: number;
  isSelected: boolean;
  isRoot: boolean;
  isSearchMatch: boolean;
  unionCount: number;
  readOnly: boolean;
  onSelect: () => void;
  onQuickAction: (action: RelativeActionType) => void;
}

function PersonNodeCard({
  person,
  pos,
  gen,
  isSelected,
  isRoot,
  isSearchMatch,
  unionCount,
  readOnly,
  onSelect,
  onQuickAction,
}: PersonNodeCardProps) {
  const avatarColors =
    person.gender === "male"
      ? "bg-sky-50 text-sky-600 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800"
      : person.gender === "female"
        ? "bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800"
        : "bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";

  const GenderIcon =
    person.gender === "male" ? Mars : person.gender === "female" ? Venus : User;

  const ringClass = isSelected
    ? "ring-2 ring-indigo-600 border-2 border-indigo-600 shadow-lg z-20"
    : isSearchMatch
      ? "ring-2 ring-amber-500 border-2 border-amber-500 shadow-md z-20"
      : "border border-slate-200/90 dark:border-slate-700 shadow-sm hover:border-indigo-300 dark:hover:border-indigo-500 z-10";

  return (
    <div
      data-node-interactive="true"
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      style={{
        width: `${CARD_WIDTH}px`,
        height: `${CARD_HEIGHT}px`,
        left: `${pos.x}px`,
        top: `${pos.y}px`,
      }}
      className={`node-card absolute rounded-2xl bg-white dark:bg-slate-900 p-3 cursor-pointer flex flex-col justify-between ${ringClass}`}
    >
      {isSelected && !readOnly && (
        <>
          <div className="animate-pop-in absolute -top-3.5 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-indigo-600 text-white px-2.5 py-0.5 rounded-full text-[10px] font-semibold shadow-sm whitespace-nowrap">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onQuickAction("parents");
              }}
              className="btn-tactile hover:text-amber-200 flex items-center gap-1 cursor-pointer"
              title="Add Parents Upward"
            >
              <ArrowUp className="w-2.5 h-2.5" /> Parents
            </button>
          </div>
          <div className="animate-pop-in absolute -bottom-3.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-slate-900 dark:bg-slate-800 text-white px-2.5 py-0.5 rounded-full text-[10px] font-semibold shadow-sm whitespace-nowrap border border-slate-700">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onQuickAction("spouse");
              }}
              className="btn-tactile hover:text-amber-300 cursor-pointer"
              title="Add Spouse / Partner"
            >
              +Spouse
            </button>
            <span className="text-slate-600">|</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onQuickAction("child");
              }}
              className="btn-tactile hover:text-emerald-300 cursor-pointer"
              title="Add Child Downward"
            >
              +Child
            </button>
            <span className="text-slate-600">|</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onQuickAction("sibling");
              }}
              className="btn-tactile hover:text-sky-300 cursor-pointer"
              title="Add Sibling"
            >
              +Sibling
            </button>
          </div>
        </>
      )}

      <div className="flex items-start gap-2.5">
        <div
          className={`w-9 h-9 rounded-xl border ${avatarColors} flex items-center justify-center shrink-0`}
        >
          <GenderIcon className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-1">
            <span
              className={`text-[9px] font-bold uppercase tracking-wider truncate flex items-center gap-1 ${
                isRoot
                  ? "text-indigo-600 dark:text-indigo-400"
                  : "text-slate-500 dark:text-slate-400"
              }`}
            >
              {isRoot ? (
                <>
                  <Star className="w-2.5 h-2.5 fill-current shrink-0" />
                  <span>Root (Gen 0)</span>
                </>
              ) : (
                generationLabel(gen)
              )}
            </span>
            {unionCount > 1 && (
              <span
                className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 rounded-md text-[9px] font-bold flex items-center gap-0.5 shrink-0"
                title={`${unionCount} Marriages/Unions`}
              >
                <Sparkles className="w-2.5 h-2.5" />
                <span>{unionCount}</span>
              </span>
            )}
          </div>
          <p
            className="font-bold text-slate-800 dark:text-slate-100 text-xs truncate leading-snug mt-0.5"
            title={person.name}
          >
            {person.name}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 pt-1.5 border-t border-slate-100 dark:border-slate-800">
        <span className="truncate max-w-[105px]" title={person.note || ""}>
          {person.note || "Family Member"}
        </span>
        <span className="font-mono text-[9px] text-slate-500 dark:text-slate-400 shrink-0 tabular-nums">
          {person.birth || "?"}–{person.death || "Living"}
        </span>
      </div>
    </div>
  );
}
