"use client";

import {
  ArrowRight,
  Crown,
  GripHorizontal,
  HeartCrack,
  HeartHandshake,
  Moon,
  Network,
  RotateCcw,
  Sparkles,
  Sprout,
  Sun,
  WandSparkles,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TreeCanvas } from "@/components/canvas/TreeCanvas";
import { describeRelationship } from "@/lib/kinship";
import { computeLayout } from "@/lib/layout";
import { PRESETS, type PresetName } from "@/lib/presets";
import type { LayoutPoint, Tree } from "@/lib/types";
import { fitView, type View } from "@/lib/viewport";

const THEME_KEY = "lineageflow.theme";

const TAB_ITEMS: {
  id: PresetName;
  label: string;
  caption: string;
  Icon: typeof WandSparkles;
}[] = [
  {
    id: "multi",
    label: "Multi-marriage",
    caption:
      "Two remarriages, half-siblings, and step-parents across 5 generations",
    Icon: WandSparkles,
  },
  {
    id: "ancestry",
    label: "5-generation",
    caption: "Direct upward lineage from self to great-great-grandparents",
    Icon: Crown,
  },
  {
    id: "blank",
    label: "Blank",
    caption: "Single root member ready for parents, spouses, and children",
    Icon: Sprout,
  },
];

const SPEC_ROWS: {
  term: string;
  detail: string;
  badges: string[];
}[] = [
  {
    term: "Automatic layout with manual overrides",
    detail:
      "LineageFlow places generations, bridge couples, and sibling clusters automatically so separate family branches never interleave. Need pixel-level control? Drag any person card, marriage hub, or horizontal bus line directly on the canvas—or snap back to automatic layout with one click.",
    badges: ["4px Grid Snap", "Draggable Bus Lines", "One-Click Reset"],
  },
  {
    term: "Multi-union & 3+ spouse routing",
    detail:
      "Instead of forcing a single partner slot per person, every marriage or partnership is modeled as its own union hub with dedicated color coding, divorced/ex status, and stepped bypass routing that cleanly clears intermediate spouse cards.",
    badges: ["1st & 2nd+ Marriages", "Divorced / Ex-Partner", "Stepped Bypass Rail"],
  },
  {
    term: "Live kinship & root re-anchoring",
    detail:
      "Click any relative to trace their exact blood or marriage relationship to the root person—distinguishing full siblings from half-siblings, biological parents from step-parents, and direct ancestors across five or more generations.",
    badges: ["Half & Step Kinship", "Dynamic Gen 0 Root", "Instant Search (/)"],
  },
  {
    term: "Local-first privacy & portable files",
    detail:
      "Your family diagram stays in your browser's local storage with zero sign-up and zero server tracking. Back up raw JSON, interchange with genealogy software via GEDCOM 5.5.1 (.ged), share compressed URLs, or export print-ready vector SVG and 2x PNG.",
    badges: ["JSON & GEDCOM 5.5.1", "Vector SVG & 2x PNG", "Shareable URL State"],
  },
];

export default function LandingPage() {
  const [preset, setPreset] = useState<PresetName>("multi");
  const [tree, setTree] = useState<Tree>(() => PRESETS.multi());
  const [selectedId, setSelectedId] = useState<string | null>(
    () => PRESETS.multi().rootPersonId,
  );
  const [dark, setDark] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>({ x: 460, y: 240, scale: 0.78 });

  const recenter = useCallback((nextTree: Tree) => {
    const el = frameRef.current;
    const rect = el?.getBoundingClientRect();
    const size = rect
      ? { width: rect.width, height: rect.height }
      : { width: 960, height: 540 };
    const { positions } = computeLayout(nextTree);
    setView(fitView(positions, size));
  }, []);

  useEffect(() => {
    const id = window.requestAnimationFrame(() => {
      const savedTheme = window.localStorage.getItem(THEME_KEY);
      const prefersDark =
        savedTheme === "dark" ||
        (!savedTheme &&
          window.matchMedia("(prefers-color-scheme: dark)").matches);
      setDark(prefersDark);
      document.documentElement.classList.toggle("dark", prefersDark);
      recenter(tree);
    });
    return () => window.cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      window.localStorage.setItem(THEME_KEY, next ? "dark" : "light");
    } catch {
      // Ignore storage errors
    }
  };

  const handleSelectPreset = (nextPreset: PresetName) => {
    const nextTree = PRESETS[nextPreset]();
    setPreset(nextPreset);
    setTree(nextTree);
    setSelectedId(nextTree.rootPersonId);
    window.requestAnimationFrame(() => recenter(nextTree));
  };

  const handleMoveNode = (id: string, position: LayoutPoint) => {
    setTree((prev) => ({
      ...prev,
      overrides: {
        ...prev.overrides,
        nodePositions: {
          ...prev.overrides?.nodePositions,
          [id]: position,
        },
      },
    }));
  };

  const handleMoveUnion = (id: string, position: LayoutPoint) => {
    setTree((prev) => ({
      ...prev,
      overrides: {
        ...prev.overrides,
        unionPositions: {
          ...prev.overrides?.unionPositions,
          [id]: position,
        },
      },
    }));
  };

  const handleMoveBus = (unionId: string, busY: number) => {
    setTree((prev) => ({
      ...prev,
      overrides: {
        ...prev.overrides,
        busY: {
          ...prev.overrides?.busY,
          [unionId]: busY,
        },
      },
    }));
  };

  const handleResetLayout = () => {
    setTree((prev) => {
      const next = { ...prev };
      delete next.overrides;
      return next;
    });
  };

  const handleSetDemoRoot = (personId: string) => {
    const nextTree: Tree = { ...tree, rootPersonId: personId };
    setTree(nextTree);
    setSelectedId(personId);
    window.requestAnimationFrame(() => recenter(nextTree));
  };

  const activeTab = TAB_ITEMS.find((t) => t.id === preset) ?? TAB_ITEMS[0];
  const rootPerson =
    (tree.rootPersonId && tree.people[tree.rootPersonId]) || null;
  const selectedPerson =
    (selectedId && tree.people[selectedId]) || rootPerson;
  const selectedKinship = useMemo(() => {
    if (!selectedPerson || !rootPerson) return null;
    return describeRelationship(tree, rootPerson.id, selectedPerson.id);
  }, [selectedPerson, rootPerson, tree]);

  return (
    <div className="min-h-screen overflow-y-auto bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col">
      {/* Top Navigation */}
      <header className="sticky top-0 z-30 border-b border-slate-200/90 dark:border-slate-800/90 bg-white/95 dark:bg-slate-900/95 px-4 sm:px-8 h-16 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-xs">
              <Network className="w-4 h-4" />
            </div>
            <span className="font-bold text-slate-900 dark:text-slate-100 text-base tracking-tight">
              LineageFlow
            </span>
          </Link>

          <nav
            aria-label="Page sections"
            className="hidden md:flex items-center gap-5 text-xs font-medium text-slate-600 dark:text-slate-300"
          >
            <a
              href="#playground"
              className="hover:text-slate-900 dark:hover:text-white transition"
            >
              Interactive Demo
            </a>
            <a
              href="#how-it-works"
              className="hover:text-slate-900 dark:hover:text-white transition"
            >
              Multi-Union Routing
            </a>
            <a
              href="#specifications"
              className="hover:text-slate-900 dark:hover:text-white transition"
            >
              Specifications
            </a>
          </nav>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={toggleDark}
            title={dark ? "Switch to light mode" : "Switch to dark mode"}
            aria-label="Toggle color theme"
            className="btn-tactile p-2 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700/80 cursor-pointer"
          >
            {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <Link
            href="/app?preset=blank"
            className="btn-tactile px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold shadow-xs inline-flex items-center gap-1.5"
          >
            <span>Start your tree</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col max-w-7xl w-full mx-auto px-4 sm:px-8">
        {/* Hero & Live Interactive Playground */}
        <section
          id="playground"
          className="pt-8 sm:pt-12 pb-14 flex flex-col gap-6"
        >
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="max-w-2xl">
              <h1 className="text-3xl sm:text-5xl font-bold text-slate-900 dark:text-slate-50 tracking-tight text-balance leading-[1.1]">
                Draw the family you actually have.
              </h1>
              <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-[65ch] leading-relaxed">
                Most family tree tools assume one marriage per person.
                LineageFlow models each union as its own hub so remarriages,
                half-siblings, and step-parents stay unambiguous—with full
                drag-and-drop control over every card and connector line.
              </p>
            </div>

            {/* Demo Preset Switcher Pills + Secondary Editor Action */}
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <div
                role="tablist"
                aria-label="Sample family tree presets"
                className="inline-flex items-center gap-1 bg-slate-200/80 dark:bg-slate-800/90 p-1 rounded-xl border border-slate-200 dark:border-slate-700"
              >
                {TAB_ITEMS.map(({ id, label, Icon }) => {
                  const active = preset === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => handleSelectPreset(id)}
                      className={`btn-tactile px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer ${
                        active
                          ? "bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow-xs ring-1 ring-slate-200/80 dark:ring-slate-700"
                          : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>

              <Link
                href={`/app?preset=${preset}`}
                className="btn-tactile px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 text-xs font-semibold shadow-2xs inline-flex items-center gap-1.5"
              >
                <span>Open demo in editor</span>
                <ArrowRight className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              </Link>
            </div>
          </div>

          {/* Interactive Canvas Studio Frame */}
          <div
            ref={frameRef}
            aria-label="Interactive family tree playground"
            className="relative h-[540px] sm:h-[600px] w-full rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md overflow-hidden flex flex-col"
          >
            {/* Top Floating Workspace Bar */}
            <div className="absolute top-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
              <div className="bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-700 dark:text-slate-200 shadow-xs flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {activeTab.caption}
                </span>
                <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">
                  |
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Interactive sandbox — click any member or drag cards & lines
                </span>
              </div>

              <div className="bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-[11px] text-slate-600 dark:text-slate-300 shadow-xs hidden xl:flex items-center gap-3.5">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3.5 h-0.5 bg-amber-500 inline-block" />
                  1st marriage
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3.5 h-0.5 bg-purple-500 inline-block" />
                  2nd+ marriage
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3.5 h-0.5 border-b-2 border-dashed border-rose-400 inline-block" />
                  Divorced / ex
                </span>
              </div>
            </div>

            <TreeCanvas
              tree={tree}
              selectedId={selectedId}
              searchQuery=""
              view={view}
              onViewChange={setView}
              onSelectPerson={setSelectedId}
              onMoveNode={handleMoveNode}
              onMoveUnion={handleMoveUnion}
              onMoveBus={handleMoveBus}
              onResetLayout={handleResetLayout}
            />

            {/* Bottom-Center Live Kinship Inspection Pill */}
            {selectedPerson && rootPerson && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 pointer-events-auto max-w-[92vw]">
                <div className="bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 rounded-2xl px-3.5 py-2 shadow-md flex flex-wrap items-center gap-2.5 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      {selectedPerson.name}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                      ({selectedPerson.birth || "?"}–
                      {selectedPerson.death || "Living"})
                    </span>
                  </div>

                  {selectedKinship && (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950/90 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800">
                      {selectedKinship}
                      {selectedPerson.id !== rootPerson.id
                        ? ` of ${rootPerson.name}`
                        : ""}
                    </span>
                  )}

                  {selectedPerson.id !== rootPerson.id && (
                    <button
                      type="button"
                      onClick={() => handleSetDemoRoot(selectedPerson.id)}
                      className="btn-tactile px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 text-slate-700 dark:text-slate-200 font-semibold text-[11px] inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Set as Root</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Section 2: Asymmetric Visual Breakdown of Multi-Union Routing */}
        <section
          id="how-it-works"
          className="py-16 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center"
        >
          <div className="lg:col-span-5">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-50 tracking-tight text-balance leading-tight">
              Every marriage is a hub, never a tangled line.
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-[65ch] leading-relaxed">
              Conventional diagram makers wire spouses directly person-to-person.
              As soon as someone remarries or has children across three
              partnerships, connectors cut straight through adjacent cards and
              sibling branches collide into a single horizontal line.
            </p>
            <p className="mt-4 text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-[65ch] leading-relaxed">
              LineageFlow separates marriage unions into dedicated junction
              nodes. Co-generational parent unions receive staggered horizontal
              bus lanes, non-adjacent spouses route along a stepped bypass rail
              underneath intermediate cards, and every card, hub, and bus handle
              can be dragged directly on the canvas.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                href="/app?preset=blank"
                className="btn-tactile px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold shadow-xs inline-flex items-center gap-1.5"
              >
                <span>Start a fresh diagram</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/app?preset=multi"
                className="btn-tactile px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5"
              >
                <span>Inspect multi-marriage example</span>
              </Link>
            </div>
          </div>

          {/* Architectural Diagram Specimen */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-5 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                Routing & Interactive Handle Anatomy
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Automatic layout by default · 4px grid snap when dragged
              </span>
            </div>

            <div className="mt-6 space-y-6">
              {/* Row 1: Union Hub States */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/70 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                      1st Marriage Hub
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 border border-amber-400 text-amber-800 text-[10px] font-bold inline-flex items-center gap-1">
                      <HeartHandshake className="w-2.5 h-2.5" /> 2
                    </span>
                  </div>
                  <div className="h-0.5 w-full bg-amber-500 rounded-full my-1" />
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-normal">
                    Primary amber curve joining adjacent partners to their shared
                    children bus.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/70 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                      2nd+ Marriage Hub
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-purple-100 border border-purple-400 text-purple-800 text-[10px] font-bold inline-flex items-center gap-1">
                      <HeartHandshake className="w-2.5 h-2.5" /> 1
                    </span>
                  </div>
                  <div className="h-0.5 w-full bg-purple-500 rounded-full my-1" />
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-normal">
                    Distinct palette and vertically offset hub with stepped
                    bypass for 3+ spouses.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/70 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                      Divorced / Ex Hub
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-rose-100 border border-rose-400 text-rose-800 text-[10px] font-bold inline-flex items-center gap-1">
                      <HeartCrack className="w-2.5 h-2.5" /> 1
                    </span>
                  </div>
                  <div className="h-0.5 w-full border-b-2 border-dashed border-rose-400 my-1" />
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-normal">
                    Dashed partner curves while keeping biological children
                    clearly attached.
                  </p>
                </div>
              </div>

              {/* Row 2: Interactive Controls Strip */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <span>Direct Manipulation Controls</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 max-w-[54ch]">
                    Every element on the editor canvas responds to direct drag
                    gestures while preserving live SVG curves and full{" "}
                    <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700">
                      Ctrl+Z
                    </kbd>{" "}
                    undo history.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <span className="px-2.5 py-1 rounded-full border border-amber-500 bg-amber-50 text-amber-800 text-[11px] font-semibold inline-flex items-center gap-1">
                    <GripHorizontal className="w-3 h-3" /> Bus Line Handle
                  </span>
                  <span className="px-2.5 py-1 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 text-[11px] font-semibold inline-flex items-center gap-1">
                    <RotateCcw className="w-3 h-3" /> Reset Layout
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Editorial Specification Ledger */}
        <section
          id="specifications"
          aria-label="Product specifications"
          className="py-16 border-t border-slate-200 dark:border-slate-800"
        >
          <div className="max-w-2xl mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-50 tracking-tight text-balance">
              Built for real family structures, owned by you.
            </h2>
            <p className="mt-2.5 text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-[65ch]">
              No subscription walls, no forced cloud accounts, and no simplified
              single-spouse assumptions.
            </p>
          </div>

          <dl className="divide-y divide-slate-200 dark:divide-slate-800 border-y border-slate-200 dark:border-slate-800">
            {SPEC_ROWS.map((row) => (
              <div
                key={row.term}
                className="py-6 grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-8 items-start"
              >
                <dt className="lg:col-span-4 font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base">
                  {row.term}
                </dt>
                <dd className="lg:col-span-8 space-y-3">
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-[68ch] leading-relaxed">
                    {row.detail}
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {row.badges.map((badge) => (
                      <span
                        key={badge}
                        className="px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 text-[11px] font-medium"
                      >
                        {badge}
                      </span>
                    ))}
                  </div>
                </dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Closing Action Band */}
        <section className="py-12 mb-8 rounded-2xl bg-slate-900 dark:bg-slate-900/90 border border-slate-800 px-6 sm:px-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 text-white">
          <div className="space-y-1.5 max-w-xl">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-balance">
              Ready to map your family lineage?
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-[60ch]">
              Open a blank canvas with a single root person, or import an
              existing JSON or GEDCOM file from the Load menu.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link
              href="/app?preset=blank"
              className="btn-tactile px-5 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-slate-950 font-bold text-xs sm:text-sm shadow-xs inline-flex items-center gap-1.5"
            >
              <span>Start Fresh in Editor</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/app?preset=multi"
              className="btn-tactile px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 font-semibold text-xs sm:text-sm inline-flex items-center gap-1.5"
            >
              <span>Explore Multi-Marriage Demo</span>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
