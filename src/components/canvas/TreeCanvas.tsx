"use client";

import {
  ArrowUp,
  Expand,
  GripHorizontal,
  HeartCrack,
  HeartHandshake,
  Mars,
  Minus,
  Plus,
  RotateCcw,
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
import type { LayoutPoint, Person, Tree } from "@/lib/types";
import { UNION_COLORS } from "@/lib/union-colors";
import { fitView, zoomAt, type View } from "@/lib/viewport";

export type RelativeActionType = "parents" | "spouse" | "child" | "sibling";

type DragEntity =
  | {
      kind: "node";
      id: string;
      startX: number;
      startY: number;
      origX: number;
      origY: number;
      curX: number;
      curY: number;
      moved: boolean;
    }
  | {
      kind: "union";
      id: string;
      startX: number;
      startY: number;
      origX: number;
      origY: number;
      curX: number;
      curY: number;
      moved: boolean;
    }
  | {
      kind: "bus";
      unionId: string;
      startY: number;
      origBusY: number;
      curBusY: number;
      moved: boolean;
    };

const snap4 = (v: number) => Math.round(v / 4) * 4;

interface TreeCanvasProps {
  tree: Tree;
  selectedId: string | null;
  searchQuery: string;
  view: View;
  onViewChange: (view: View) => void;
  onSelectPerson: (id: string) => void;
  onOpenAddRelative?: (
    action: RelativeActionType,
    personId: string,
    unionId?: string,
  ) => void;
  onMoveNode?: (id: string, position: LayoutPoint) => void;
  onMoveUnion?: (id: string, position: LayoutPoint) => void;
  onMoveBus?: (unionId: string, busY: number) => void;
  onResetLayout?: () => void;
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
  onMoveNode,
  onMoveUnion,
  onMoveBus,
  onResetLayout,
  readOnly = false,
  className = "",
}: TreeCanvasProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [isInteracting, setIsInteracting] = useState(false);
  const [dragEntity, setDragEntity] = useState<DragEntity | null>(null);
  const dragEntityRef = useRef<DragEntity | null>(null);
  const wheelTimeoutRef = useRef<number | null>(null);
  const dragRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    pinchDist: number | null;
  }>({ active: false, startX: 0, startY: 0, pinchDist: null });

  // Merge in-flight drag preview into tree overrides so layout & connectors update at 60fps
  const effectiveTree: Tree = useMemo(() => {
    if (!dragEntity) return tree;
    const prev = tree.overrides ?? {};
    if (dragEntity.kind === "node") {
      return {
        ...tree,
        overrides: {
          ...prev,
          nodePositions: {
            ...prev.nodePositions,
            [dragEntity.id]: { x: dragEntity.curX, y: dragEntity.curY },
          },
        },
      };
    }
    if (dragEntity.kind === "union") {
      return {
        ...tree,
        overrides: {
          ...prev,
          unionPositions: {
            ...prev.unionPositions,
            [dragEntity.id]: { x: dragEntity.curX, y: dragEntity.curY },
          },
        },
      };
    }
    return {
      ...tree,
      overrides: {
        ...prev,
        busY: {
          ...prev.busY,
          [dragEntity.unionId]: dragEntity.curBusY,
        },
      },
    };
  }, [tree, dragEntity]);

  const layout: Layout = useMemo(() => computeLayout(effectiveTree), [effectiveTree]);
  const connectors = useMemo(
    () => buildConnectorGeometry(effectiveTree, layout),
    [effectiveTree, layout],
  );

  const hasCustomLayout = Boolean(
    tree.overrides &&
      (Object.keys(tree.overrides.nodePositions ?? {}).length > 0 ||
        Object.keys(tree.overrides.unionPositions ?? {}).length > 0 ||
        Object.keys(tree.overrides.busY ?? {}).length > 0),
  );

  const handleFit = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setIsInteracting(false);
    onViewChange(
      fitView(layout.positions, { width: rect.width, height: rect.height }),
    );
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
        zoomAt(view, delta, {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        }),
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
      const entity = dragEntityRef.current;
      if (entity) {
        if (entity.kind === "node" || entity.kind === "union") {
          const dx = e.clientX - entity.startX;
          const dy = e.clientY - entity.startY;
          const moved = entity.moved || Math.hypot(dx, dy) > 4;
          if (!moved) return;
          const next: DragEntity = {
            ...entity,
            curX: snap4(entity.origX + dx / view.scale),
            curY: snap4(entity.origY + dy / view.scale),
            moved: true,
          };
          dragEntityRef.current = next;
          setDragEntity(next);
          return;
        }
        if (entity.kind === "bus") {
          const dy = e.clientY - entity.startY;
          const moved = entity.moved || Math.abs(dy) > 2;
          if (!moved) return;
          const next: DragEntity = {
            ...entity,
            curBusY: snap4(entity.origBusY + dy / view.scale),
            moved: true,
          };
          dragEntityRef.current = next;
          setDragEntity(next);
          return;
        }
      }

      if (!dragRef.current.active) return;
      onViewChange({
        ...view,
        x: e.clientX - dragRef.current.startX,
        y: e.clientY - dragRef.current.startY,
      });
    };

    const onUp = () => {
      const entity = dragEntityRef.current;
      if (entity) {
        dragEntityRef.current = null;
        setDragEntity(null);
        setIsInteracting(false);
        if (entity.moved) {
          if (entity.kind === "node") {
            onMoveNode?.(entity.id, { x: entity.curX, y: entity.curY });
          } else if (entity.kind === "union") {
            onMoveUnion?.(entity.id, { x: entity.curX, y: entity.curY });
          } else if (entity.kind === "bus") {
            onMoveBus?.(entity.unionId, entity.curBusY);
          }
        } else {
          // Click without drag
          if (entity.kind === "node") {
            onSelectPerson(entity.id);
          } else if (entity.kind === "union") {
            const u = tree.unions[entity.id];
            if (u?.partners[0]) {
              onSelectPerson(u.partners[0]);
              if (!readOnly && onOpenAddRelative) {
                onOpenAddRelative("child", u.partners[0], u.id);
              }
            }
          }
        }
        return;
      }

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
  }, [
    view,
    onViewChange,
    onMoveNode,
    onMoveUnion,
    onMoveBus,
    onSelectPerson,
    onOpenAddRelative,
    readOnly,
    tree.unions,
  ]);

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
      const midX =
        (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
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

  const startNodeDrag = (
    e: React.MouseEvent,
    id: string,
    pos: { x: number; y: number },
  ) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    if (readOnly) {
      onSelectPerson(id);
      return;
    }
    setIsInteracting(true);
    const next: DragEntity = {
      kind: "node",
      id,
      startX: e.clientX,
      startY: e.clientY,
      origX: pos.x,
      origY: pos.y,
      curX: pos.x,
      curY: pos.y,
      moved: false,
    };
    dragEntityRef.current = next;
    setDragEntity(next);
  };

  const startUnionDrag = (
    e: React.MouseEvent,
    id: string,
    uPos: { x: number; y: number },
  ) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    if (readOnly) return;
    setIsInteracting(true);
    const next: DragEntity = {
      kind: "union",
      id,
      startX: e.clientX,
      startY: e.clientY,
      origX: uPos.x,
      origY: uPos.y,
      curX: uPos.x,
      curY: uPos.y,
      moved: false,
    };
    dragEntityRef.current = next;
    setDragEntity(next);
  };

  const startBusDrag = (
    e: React.MouseEvent,
    unionId: string,
    busY: number,
  ) => {
    if (e.button !== 0 || readOnly) return;
    e.stopPropagation();
    setIsInteracting(true);
    const next: DragEntity = {
      kind: "bus",
      unionId,
      startY: e.clientY,
      origBusY: busY,
      curBusY: busY,
      moved: false,
    };
    dragEntityRef.current = next;
    setDragEntity(next);
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
                  strokeLinejoin="round"
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
          {/* Interactive Draggable Connector Bus Lines & Handles */}
          {!readOnly &&
            connectors.map((g) => {
              if (g.busY === null || !g.busSpan) return null;
              const spanWidth = Math.max(28, g.busSpan.maxX - g.busSpan.minX);
              const isDraggingBus =
                dragEntity?.kind === "bus" && dragEntity.unionId === g.unionId;
              return (
                <div key={`bus-${g.unionId}`}>
                  {/* Wide hit strip along the horizontal bus line */}
                  <div
                    data-node-interactive="true"
                    onMouseDown={(e) => startBusDrag(e, g.unionId, g.busY!)}
                    title="Drag up or down to adjust this family line"
                    style={{
                      left: `${g.busSpan.minX}px`,
                      top: `${g.busY - 6}px`,
                      width: `${spanWidth}px`,
                      height: "12px",
                    }}
                    className="absolute z-10 cursor-ns-resize group"
                  />
                  {/* Visible grip pill at the T-junction */}
                  <button
                    type="button"
                    data-node-interactive="true"
                    data-testid={`bus-handle-${g.unionId}`}
                    aria-label={`Adjust connector line for ${g.unionId}`}
                    onMouseDown={(e) => startBusDrag(e, g.unionId, g.busY!)}
                    title="Drag up or down to adjust line position"
                    style={{
                      left: `${g.busSpan.handleX}px`,
                      top: `${g.busY}px`,
                      borderColor: g.palette.stroke,
                      backgroundColor: isDraggingBus
                        ? g.palette.stroke
                        : g.palette.bg,
                      color: isDraggingBus ? "#ffffff" : g.palette.text,
                    }}
                    className=" absolute -translate-x-1/2 -translate-y-1/2 z-15 px-1.5 py-0.5 rounded-full border shadow-2xs cursor-ns-resize opacity-75 hover:opacity-100 hover:scale-110 transition-opacity flex items-center justify-center"
                  >
                    <GripHorizontal className="w-2.5 h-2.5" />
                  </button>
                </div>
              );
            })}

          {Object.values(tree.unions).map((u) => {
            const uPos = layout.unionPositions[u.id];
            if (!uPos) return null;
            const palette = UNION_COLORS[uPos.colorIdx ?? 0] ?? UNION_COLORS[0];
            const isDivorced = u.status === "divorced";
            const isDraggingThis =
              dragEntity?.kind === "union" && dragEntity.id === u.id;
            return (
              <button
                key={u.id}
                type="button"
                data-node-interactive="true"
                data-dragging={isDraggingThis ? "true" : undefined}
                onMouseDown={(e) => startUnionDrag(e, u.id, uPos)}
                title={`${u.label || "Marriage"} (${u.children.length} children)${readOnly ? "" : " — Drag to move hub, click to add child"}`}
                style={{
                  left: `${uPos.x}px`,
                  top: `${uPos.y}px`,
                  backgroundColor: palette.bg,
                  borderColor: palette.border,
                  color: palette.text,
                }}
                className="union-pill absolute -translate-x-1/2 -translate-y-1/2 z-20 px-2 py-0.5 rounded-full shadow-xs border text-[10px] font-bold flex items-center gap-1 cursor-grab active:cursor-grabbing"
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
            const isDraggingThis =
              dragEntity?.kind === "node" && dragEntity.id === person.id;

            return (
              <PersonNodeCard
                key={person.id}
                person={person}
                pos={pos}
                gen={gen}
                isSelected={isSelected}
                isRoot={isRoot}
                isSearchMatch={isSearchMatch}
                isDragging={isDraggingThis}
                unionCount={myUnions.length}
                readOnly={readOnly}
                onMouseDownCard={(e) => startNodeDrag(e, person.id, pos)}
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
          {!readOnly && (
            <p className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-500 dark:text-slate-400">
              Tip: Drag any card, marriage hub, or connector line handle to
              fine-tune alignment.
            </p>
          )}
        </div>
      </div>

      {/* Bottom-Right Zoom & Layout Controls */}
      <div
        data-node-interactive="true"
        className="absolute bottom-4 right-4 z-20 flex items-center gap-1 bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 rounded-2xl p-1.5 shadow-md"
      >
        {!readOnly && hasCustomLayout && onResetLayout && (
          <>
            <button
              type="button"
              onClick={onResetLayout}
              className="btn-tactile px-2.5 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/70 hover:bg-amber-100 dark:hover:bg-amber-900 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-semibold flex items-center gap-1 cursor-pointer"
              title="Snap all dragged cards and lines back to automatic layout"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset Layout
            </button>
            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-0.5" />
          </>
        )}
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
  isDragging: boolean;
  unionCount: number;
  readOnly: boolean;
  onMouseDownCard: (e: React.MouseEvent) => void;
  onQuickAction: (action: RelativeActionType) => void;
}

function PersonNodeCard({
  person,
  pos,
  gen,
  isSelected,
  isRoot,
  isSearchMatch,
  isDragging,
  unionCount,
  readOnly,
  onMouseDownCard,
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
      data-dragging={isDragging ? "true" : undefined}
      onMouseDown={onMouseDownCard}
      style={{
        width: `${CARD_WIDTH}px`,
        height: `${CARD_HEIGHT}px`,
        left: `${pos.x}px`,
        top: `${pos.y}px`,
      }}
      className={`node-card absolute rounded-2xl bg-white dark:bg-slate-900 p-3 ${
        readOnly ? "cursor-pointer" : "cursor-grab active:cursor-grabbing"
      } flex flex-col justify-between ${ringClass}`}
    >
      {isSelected && !readOnly && (
        <>
          <div
            onMouseDown={(e) => e.stopPropagation()}
            className="animate-pop-in absolute -top-3.5 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-indigo-600 text-white px-2.5 py-0.5 rounded-full text-[10px] font-semibold shadow-sm whitespace-nowrap"
          >
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
          <div
            onMouseDown={(e) => e.stopPropagation()}
            className="animate-pop-in absolute -bottom-3.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-slate-900 dark:bg-slate-800 text-white px-2.5 py-0.5 rounded-full text-[10px] font-semibold shadow-sm whitespace-nowrap border border-slate-700"
          >
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
