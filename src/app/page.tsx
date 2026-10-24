"use client";

import {
  ArrowRight,
  Crown,
  Download,
  FileCode2,
  GitBranch,
  GripHorizontal,
  HeartCrack,
  HeartHandshake,
  Moon,
  Network,
  Sparkles,
  Sprout,
  Sun,
  Users,
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
  Icon: typeof WandSparkles;
}[] = [
  {
    id: "multi",
    label: "Multi-marriage",
    Icon: WandSparkles,
  },
  {
    id: "ancestry",
    label: "5-generation",
    Icon: Crown,
  },
  {
    id: "blank",
    label: "Blank",
    Icon: Sprout,
  },
];

const ORBIT_NODES = [
  {
    Icon: HeartHandshake,
    color: "text-amber-500",
    bg: "bg-amber-50 dark:bg-amber-950/80",
    pos: "top-[14%] left-[18%] hidden md:flex",
    label: "1st Union Hub",
  },
  {
    Icon: GitBranch,
    color: "text-indigo-600 dark:text-indigo-400",
    bg: "bg-indigo-50 dark:bg-indigo-950/80",
    pos: "top-[42%] left-[9%] hidden lg:flex",
    label: "Staggered Bus",
  },
  {
    Icon: Crown,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/80",
    pos: "top-[66%] left-[21%] hidden md:flex",
    label: "Gen 0 Root",
  },
  {
    Icon: Users,
    color: "text-sky-600 dark:text-sky-400",
    bg: "bg-sky-50 dark:bg-sky-950/80",
    pos: "top-[74%] left-[7%] hidden xl:flex",
    label: "Sibling Cluster",
  },
  {
    Icon: HeartCrack,
    color: "text-rose-500",
    bg: "bg-rose-50 dark:bg-rose-950/80",
    pos: "top-[14%] right-[18%] hidden md:flex",
    label: "Ex-Spouse Link",
  },
  {
    Icon: GripHorizontal,
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-50 dark:bg-purple-950/80",
    pos: "top-[42%] right-[9%] hidden lg:flex",
    label: "Draggable Line",
  },
  {
    Icon: FileCode2,
    color: "text-indigo-600 dark:text-indigo-400",
    bg: "bg-indigo-50 dark:bg-indigo-950/80",
    pos: "top-[66%] right-[21%] hidden md:flex",
    label: "JSON & GEDCOM",
  },
  {
    Icon: Download,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/80",
    pos: "top-[74%] right-[7%] hidden xl:flex",
    label: "SVG & 2x PNG",
  },
];

const CAPABILITY_STRIP = [
  "Multi-Union Hubs",
  "Draggable Cards & Lines",
  "Live Kinship Engine",
  "GEDCOM 5.5.1",
  "Vector SVG",
  "2x PNG",
  "Local-First JSON",
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

  const rootPerson =
    (tree.rootPersonId && tree.people[tree.rootPersonId]) || null;
  const selectedPerson =
    (selectedId && tree.people[selectedId]) || rootPerson;
  const selectedKinship = useMemo(() => {
    if (!selectedPerson || !rootPerson) return null;
    return describeRelationship(tree, rootPerson.id, selectedPerson.id);
  }, [selectedPerson, rootPerson, tree]);

  return (
    <div className="min-h-screen overflow-y-auto bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      {/* Floating Pill Navbar */}
      <div className="sticky top-4 z-30 max-w-5xl w-full mx-auto px-4">
        <header className="h-14 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 px-4 sm:px-5 shadow-xs flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-950 dark:bg-indigo-600 flex items-center justify-center text-white">
              <Network className="w-4 h-4" />
            </div>
            <span className="font-bold text-slate-950 dark:text-white text-sm sm:text-base tracking-tight">
              LineageFlow
            </span>
          </Link>

          <nav
            aria-label="Primary navigation"
            className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-600 dark:text-slate-300"
          >
            <a
              href="#playground"
              className="hover:text-slate-950 dark:hover:text-white transition"
            >
              Playground
            </a>
            <Link
              href="/app?preset=multi"
              className="hover:text-slate-950 dark:hover:text-white transition"
            >
              Multi-Union Demo
            </Link>
            <Link
              href="/app?preset=ancestry"
              className="hover:text-slate-950 dark:hover:text-white transition"
            >
              5-Gen Ancestry
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleDark}
              title={dark ? "Switch to light mode" : "Switch to dark mode"}
              aria-label="Toggle color theme"
              className="btn-tactile p-2 text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
            >
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <Link
              href="/app?preset=blank"
              className="btn-tactile px-4 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-200 text-white dark:text-slate-950 text-xs font-semibold shadow-2xs inline-flex items-center gap-1.5"
            >
              <span>Open Editor</span>
            </Link>
          </div>
        </header>
      </div>

      <main className="flex-1 flex flex-col">
        {/* Concentric Orbital Hero Section */}
        <section className="relative overflow-hidden pt-12 pb-16 sm:pt-16 sm:pb-20 px-4">
          {/* Concentric SVG Orbit Rings & Accent Arcs */}
          <svg
            aria-hidden="true"
            viewBox="0 0 1200 680"
            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[680px] opacity-90 dark:opacity-35"
            fill="none"
          >
            <circle
              cx="600"
              cy="340"
              r="230"
              className="stroke-slate-200/80 dark:stroke-slate-800"
              strokeWidth="1"
            />
            <circle
              cx="600"
              cy="340"
              r="340"
              className="stroke-slate-200/75 dark:stroke-slate-800"
              strokeWidth="1"
            />
            <circle
              cx="600"
              cy="340"
              r="450"
              className="stroke-slate-200/65 dark:stroke-slate-800"
              strokeWidth="1"
            />
            <circle
              cx="600"
              cy="340"
              r="560"
              className="stroke-slate-100 dark:stroke-slate-900"
              strokeWidth="1"
            />
            {/* Subtle Colored Lineage Arcs on the Rings */}
            <path
              d="M 262 292 A 340 340 0 0 1 285 212"
              stroke="#6366f1"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M 915 468 A 340 340 0 0 1 888 522"
              stroke="#6366f1"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M 1044 265 A 450 450 0 0 1 1050 340"
              stroke="#f59e0b"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>

          {/* Floating Orbital Node Pills */}
          <div className="pointer-events-none absolute inset-0 max-w-6xl mx-auto">
            {ORBIT_NODES.map(({ Icon, color, bg, pos, label }) => (
              <div
                key={label}
                title={label}
                className={`absolute ${pos} w-12 h-12 rounded-full bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-md items-center justify-center`}
              >
                <div
                  className={`w-8 h-8 rounded-full ${bg} flex items-center justify-center`}
                >
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
              </div>
            ))}
          </div>

          {/* Centered Hero Content */}
          <div className="relative z-10 max-w-2xl mx-auto text-center flex flex-col items-center">
            {/* Compact Status Pill Row */}
            <div className="inline-flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mb-5">
              <span className="inline-flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                <HeartHandshake className="w-3.5 h-3.5 text-amber-500" />
                <span>Multi-Union Hubs</span>
              </span>
              <span className="text-slate-300 dark:text-slate-700">·</span>
              <span className="inline-flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                <span>Draggable Lines</span>
              </span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-bold text-slate-950 dark:text-white tracking-tight text-balance leading-[1.06]">
              Draw the family you actually have.
            </h1>

            <p className="mt-4 text-sm sm:text-base text-slate-500 dark:text-slate-400 max-w-md leading-relaxed">
              From direct ancestors to remarriages and step-families, map every
              relationship in one place and keep your lineage clear.
            </p>

            {/* Dual Pill CTA Buttons */}
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/app?preset=blank"
                className="btn-tactile px-6 py-3 rounded-full bg-slate-950 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-200 text-white dark:text-slate-950 text-xs sm:text-sm font-semibold shadow-sm inline-flex items-center gap-2"
              >
                <span>Start your tree</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>

              <a
                href="#playground"
                className="btn-tactile px-6 py-3 rounded-full bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm font-semibold shadow-2xs"
              >
                Try interactive demo
              </a>
            </div>

            {/* Cascading Stacked Family Cards over Soft Ambient Glow */}
            <div className="relative mt-10 w-full max-w-sm flex flex-col items-center">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-5 left-1/2 -translate-x-1/2 w-72 h-28 rounded-full bg-sky-200/70 dark:bg-indigo-500/20 blur-2xl"
              />

              {/* Top Card */}
              <div className="relative z-30 w-full rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 px-4 py-3 shadow-md flex items-center gap-3 text-left">
                <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold text-xs flex items-center justify-center shrink-0">
                  AS
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    Alex Sterling{" "}
                    <span className="font-normal text-slate-500 dark:text-slate-400">
                      connected to
                    </span>{" "}
                    2 Marriages
                  </div>
                  <div className="text-[11px] text-slate-400 dark:text-slate-500">
                    Gen 0 Root · 1st & 2nd Union Hubs
                  </div>
                </div>
              </div>

              {/* Middle Card */}
              <div className="relative z-20 -mt-2 w-[90%] rounded-2xl bg-white/95 dark:bg-slate-900/95 border border-slate-200/80 dark:border-slate-800 px-4 py-2.5 shadow-sm flex items-center gap-3 text-left">
                <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold text-xs flex items-center justify-center shrink-0">
                  LS
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                    Lucas Sterling
                  </div>
                  <div className="text-[11px] text-slate-400 dark:text-slate-500">
                    Half-Brother · 2nd Marriage Bus
                  </div>
                </div>
              </div>

              {/* Bottom Card */}
              <div className="relative z-10 -mt-2 w-[80%] rounded-2xl bg-white/85 dark:bg-slate-900/85 border border-slate-200/70 dark:border-slate-800 px-4 py-2 shadow-2xs flex items-center gap-3 text-left opacity-85">
                <div className="w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-bold text-[11px] flex items-center justify-center shrink-0">
                  DB
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 truncate">
                    Diana Brooks
                  </div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500">
                    Stepmother · Connected automatically
                  </div>
                </div>
              </div>
            </div>

            {/* Minimal Capability Strip (Reference Footer Style) */}
            <div className="mt-12 pt-2 flex flex-col items-center gap-4">
              <p className="text-xs font-medium text-slate-400 dark:text-slate-500">
                100% private in your browser · Zero account required
              </p>
              <div className="flex flex-wrap items-center justify-center gap-x-7 gap-y-2 text-xs sm:text-sm font-bold tracking-tight text-slate-400 dark:text-slate-500">
                {CAPABILITY_STRIP.map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Interactive Demo Playground Section */}
        <section
          id="playground"
          className="max-w-6xl w-full mx-auto px-4 sm:px-6 pb-16 flex flex-col gap-4"
        >
          {/* Compact Switcher Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div
              role="tablist"
              aria-label="Sample family tree presets"
              className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-full border border-slate-200 dark:border-slate-800"
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
                    className={`btn-tactile px-3.5 py-1.5 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer ${
                      active
                        ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950 shadow-2xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white"
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
              className="btn-tactile px-4 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <span>Open demo in editor</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Interactive Canvas Frame */}
          <div
            ref={frameRef}
            aria-label="Interactive family tree playground"
            className="relative h-[520px] sm:h-[560px] w-full rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden flex flex-col"
          >
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

            {/* Minimal Bottom-Center Kinship Pill */}
            {selectedPerson && rootPerson && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 pointer-events-auto max-w-[92vw]">
                <div className="bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 rounded-full px-4 py-1.5 shadow-md flex items-center gap-2.5 text-xs">
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    {selectedPerson.name}
                  </span>
                  {selectedKinship && (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800">
                      {selectedKinship}
                    </span>
                  )}
                  {selectedPerson.id !== rootPerson.id && (
                    <button
                      type="button"
                      onClick={() => handleSetDemoRoot(selectedPerson.id)}
                      className="btn-tactile px-2.5 py-0.5 rounded-full bg-slate-950 text-white dark:bg-white dark:text-slate-950 font-semibold text-[11px] cursor-pointer"
                    >
                      Set Root
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
