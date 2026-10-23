"use client";

import { ArrowRight, Crown, Network, Sprout, WandSparkles } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TreeCanvas } from "@/components/canvas/TreeCanvas";
import { computeLayout } from "@/lib/layout";
import { PRESETS, type PresetName } from "@/lib/presets";
import { fitView, type View } from "@/lib/viewport";

const TAB_ITEMS: {
  id: PresetName;
  label: string;
  caption: string;
  Icon: typeof WandSparkles;
}[] = [
  {
    id: "multi",
    label: "Multi-marriage",
    caption: "Two remarriages, half-siblings, and step-parents across 5 generations",
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

export default function LandingPage() {
  const [preset, setPreset] = useState<PresetName>("multi");
  const tree = useMemo(() => PRESETS[preset](), [preset]);
  const [selectedId, setSelectedId] = useState<string | null>(tree.rootPersonId);
  const frameRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>({ x: 460, y: 240, scale: 0.78 });

  const recenter = useCallback((nextTree: ReturnType<typeof PRESETS.multi>) => {
    const el = frameRef.current;
    const rect = el?.getBoundingClientRect();
    const size = rect
      ? { width: rect.width, height: rect.height }
      : { width: 960, height: 520 };
    const { positions } = computeLayout(nextTree);
    setView(fitView(positions, size));
  }, []);

  useEffect(() => {
    const id = window.requestAnimationFrame(() => recenter(tree));
    return () => window.cancelAnimationFrame(id);
  }, [tree, recenter]);

  const handleSelectPreset = (nextPreset: PresetName) => {
    setPreset(nextPreset);
    const nextTree = PRESETS[nextPreset]();
    setSelectedId(nextTree.rootPersonId);
  };

  const activeTab = TAB_ITEMS.find((t) => t.id === preset) ?? TAB_ITEMS[0];

  return (
    <div className="min-h-screen overflow-y-auto bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col">
      {/* Top Bar */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 px-4 sm:px-8 h-16 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-xs">
            <Network className="w-4 h-4" />
          </div>
          <span className="font-bold text-slate-900 dark:text-slate-100 text-base tracking-tight">
            LineageFlow
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/app?preset=${preset}`}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold shadow-xs transition inline-flex items-center gap-1.5"
          >
            <span>Start your tree</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </header>

      {/* First Viewport: Live Preset Playground */}
      <main className="flex-1 flex flex-col max-w-7xl w-full mx-auto px-4 sm:px-8 pt-6 pb-12 gap-6">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="max-w-2xl space-y-2">
            <h1 className="text-2xl sm:text-4xl font-bold text-slate-900 dark:text-slate-50 tracking-tight text-balance">
              Draw the family you actually have.
            </h1>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-[65ch]">
              Most family tree tools assume one marriage per person. LineageFlow
              models each union as its own hub so remarriages, half-siblings,
              and step-parents stay unambiguous.
            </p>
          </div>

          {/* Preset Tabs + Primary CTA */}
          <div className="flex flex-wrap items-center gap-2">
            <div
              role="tablist"
              aria-label="Sample family tree presets"
              className="inline-flex items-center gap-1 bg-slate-200/80 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700"
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
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition inline-flex items-center gap-1.5"
            >
              <span>Open in editor</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Interactive Canvas Playground */}
        <section
          ref={frameRef}
          aria-label="Interactive family tree playground"
          className="relative h-[520px] sm:h-[580px] w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden flex flex-col"
        >
          {/* Floating Callout Bar inside Playground */}
          <div className="absolute top-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
            <div className="bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 shadow-xs flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {activeTab.caption}
              </span>
              <span className="text-slate-400 hidden sm:inline">·</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Synthetic demo data — drag to pan, scroll to zoom
              </span>
            </div>

            <div className="bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-[11px] text-slate-600 dark:text-slate-300 shadow-xs flex items-center gap-3">
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
            readOnly
          />
        </section>

        {/* Below-the-fold Features Strip */}
        <section
          aria-label="Capabilities"
          className="pt-6 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-6 text-sm"
        >
          <div className="space-y-1">
            <h2 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
              Local-only by default
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              No sign-up, no server database, and no tracking. Your diagram
              autosaves in your browser&apos;s local storage so you can pick up
              where you left off.
            </p>
          </div>

          <div className="space-y-1">
            <h2 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
              Portable JSON, PNG, and SVG
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Export high-resolution PNG or vector SVG diagrams for printing, or
              save the raw JSON file to back up and edit later.
            </p>
          </div>

          <div className="space-y-1">
            <h2 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
              Shareable URLs & Undo history
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Copy a self-contained link to send a tree to family members, and
              step backward or forward through edits with full undo/redo.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
