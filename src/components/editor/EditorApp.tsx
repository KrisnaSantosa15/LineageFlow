"use client";

import {
  Check,
  CheckCircle2,
  Crosshair,
  Crown,
  Download,
  FileCode2,
  Image as ImageIcon,
  Link2,
  Moon,
  Network,
  Redo2,
  Search,
  Sprout,
  Sun,
  Undo2,
  WandSparkles,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import {
  TreeCanvas,
  type RelativeActionType,
} from "@/components/canvas/TreeCanvas";
import { AddRelativeModal } from "@/components/editor/AddRelativeModal";
import { InspectorPanel } from "@/components/editor/InspectorPanel";
import { JsonModal } from "@/components/editor/JsonModal";
import { initialState } from "@/lib/editor-state";
import { renderTreeToSvgString } from "@/lib/export-svg";
import { createHistory, historyReducer } from "@/lib/history";
import { computeLayout } from "@/lib/layout";
import { detectPreset, PRESETS, type PresetName } from "@/lib/presets";
import { decodeTreeFromParam, encodeTreeToParam } from "@/lib/share-url";
import { parseTreeJson, serializeTree } from "@/lib/tree-json";
import type { OpResult } from "@/lib/tree-ops";
import { computeTreeStats } from "@/lib/tree-stats";
import type { Tree } from "@/lib/types";
import { centerOn, fitView, type View } from "@/lib/viewport";

const STORAGE_KEY = "lineageflow.tree.v1";
const THEME_KEY = "lineageflow.theme";

interface ModalState {
  action: RelativeActionType;
  personId: string;
  unionId?: string;
}

export function EditorApp({ initialPreset = "multi" }: { initialPreset?: PresetName }) {
  const [history, dispatch] = useReducer(
    historyReducer,
    undefined,
    () => createHistory(initialState(PRESETS[initialPreset]())),
  );

  const { tree, selectedId, search } = history.present;
  const layout = useMemo(() => computeLayout(tree), [tree]);
  const stats = useMemo(() => computeTreeStats(tree), [tree]);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [selectedPreset, setSelectedPreset] = useState<PresetName | null>(initialPreset);
  const activePreset = useMemo(
    () => detectPreset(tree) ?? selectedPreset,
    [tree, selectedPreset],
  );
  const [view, setView] = useState<View>({ x: 480, y: 260, scale: 0.9 });
  const [modal, setModal] = useState<ModalState | null>(null);
  const [jsonModalOpen, setJsonModalOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [dark, setDark] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [pendingSharedTree, setPendingSharedTree] = useState<Tree | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  const fitCurrentTree = useCallback(
    (targetTree: Tree) => {
      const el = containerRef.current;
      const rect = el?.getBoundingClientRect();
      const size = rect
        ? { width: rect.width, height: rect.height }
        : { width: 1000, height: 700 };
      const { positions } = computeLayout(targetTree);
      setView(fitView(positions, size));
    },
    [],
  );

  // Hydrate theme, localStorage tree, and optional ?tree= / ?preset= query parameters
  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      const savedTheme = window.localStorage.getItem(THEME_KEY);
      const prefersDark =
        savedTheme === "dark" ||
        (!savedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches);
      setDark(prefersDark);
      document.documentElement.classList.toggle("dark", prefersDark);

      const params = new URLSearchParams(window.location.search);
      const sharedParam = params.get("tree");
      const presetParam = params.get("preset") as PresetName | null;
      const savedRaw = window.localStorage.getItem(STORAGE_KEY);

      if (sharedParam) {
        const decoded = decodeTreeFromParam(sharedParam);
        if (decoded) {
          if (savedRaw) {
            setPendingSharedTree(decoded);
          } else {
            dispatch({ type: "load", tree: decoded });
            fitCurrentTree(decoded);
            showToast("Loaded shared family tree");
          }
        }
      } else if (presetParam && PRESETS[presetParam]) {
        const presetTree = PRESETS[presetParam]();
        setSelectedPreset(presetParam);
        dispatch({ type: "load", tree: presetTree });
        fitCurrentTree(presetTree);
      } else if (savedRaw) {
        const parsed = parseTreeJson(savedRaw);
        if (parsed.ok) {
          setSelectedPreset(detectPreset(parsed.tree));
          dispatch({ type: "load", tree: parsed.tree });
          fitCurrentTree(parsed.tree);
        }
      } else {
        fitCurrentTree(tree);
      }

      setHydrated(true);
    });
    return () => window.cancelAnimationFrame(frameId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Autosave to localStorage after hydration
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, serializeTree(tree));
    } catch {
      // Ignore storage quota errors
    }
  }, [tree, hydrated]);

  // Keyboard shortcuts for Undo / Redo / Escape / Quick Search (/)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setModal(null);
        setJsonModalOpen(false);
        return;
      }
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT")
      ) {
        return;
      }
      if (e.key === "/" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          dispatch({ type: "redo" });
        } else {
          dispatch({ type: "undo" });
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        dispatch({ type: "redo" });
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      window.localStorage.setItem(THEME_KEY, next ? "dark" : "light");
    } catch {
      // Ignore
    }
  };

  const handleLoadPreset = (preset: PresetName, label: string) => {
    const nextTree = PRESETS[preset]();
    setSelectedPreset(preset);
    dispatch({ type: "load", tree: nextTree });
    fitCurrentTree(nextTree);
    showToast(label);
  };

  const handleCenterOnSelected = () => {
    const el = containerRef.current;
    const rect = el?.getBoundingClientRect();
    const size = rect
      ? { width: rect.width, height: rect.height }
      : { width: 1000, height: 700 };
    const targetPos =
      (selectedId && layout.positions[selectedId]) || { x: 0, y: 0 };
    setView((prev) => centerOn(prev, targetPos, size));
  };

  const handleSearch = (query: string) => {
    dispatch({ type: "search", query });
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return;
    const match = Object.values(tree.people).find((p) =>
      p.name.toLowerCase().includes(trimmed),
    );
    if (match) {
      dispatch({ type: "select", id: match.id });
      const el = containerRef.current;
      const rect = el?.getBoundingClientRect();
      const size = rect
        ? { width: rect.width, height: rect.height }
        : { width: 1000, height: 700 };
      const pos = layout.positions[match.id];
      if (pos) {
        setView((prev) => centerOn(prev, pos, size));
      }
    }
  };

  const handleApplyRelative = (result: OpResult, message: string) => {
    dispatch({ type: "apply", result });
    setModal(null);
    showToast(message);
  };

  const handleShareUrl = async () => {
    const encoded = encodeTreeToParam(tree);
    if (encoded.length > 6000) {
      showToast("Tree is large — use JSON Export to share without truncation");
      return;
    }
    const url = `${window.location.origin}/app?tree=${encoded}`;
    try {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      window.setTimeout(() => setLinkCopied(false), 1600);
      showToast("Copied shareable tree link to clipboard");
    } catch {
      showToast("Could not copy link automatically");
    }
  };

  const handleExportSvg = () => {
    const svg = renderTreeToSvgString(tree, layout, dark);
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "lineageflow-tree.svg";
    a.click();
    URL.revokeObjectURL(url);
    showToast("Exported SVG diagram");
  };

  const handleExportPng = () => {
    const svg = renderTreeToSvgString(tree, layout, dark);
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width * 2;
      canvas.height = img.height * 2;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.scale(2, 2);
        ctx.drawImage(img, 0, 0);
        const pngUrl = canvas.toDataURL("image/png");
        const a = document.createElement("a");
        a.href = pngUrl;
        a.download = "lineageflow-tree.png";
        a.click();
        showToast("Exported PNG diagram");
      }
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  const presetItems: {
    id: PresetName;
    label: string;
    toastLabel: string;
    Icon: typeof WandSparkles;
    iconColor: string;
  }[] = [
    {
      id: "multi",
      label: "Multi-Marriage Demo",
      toastLabel: "Loaded Multi-Marriage Family Demo",
      Icon: WandSparkles,
      iconColor: "text-indigo-500",
    },
    {
      id: "ancestry",
      label: "5-Gen Ancestry",
      toastLabel: "Loaded 5-Generation Deep Ancestry",
      Icon: Crown,
      iconColor: "text-amber-500",
    },
    {
      id: "blank",
      label: "Start Fresh",
      toastLabel: "Started fresh family tree",
      Icon: Sprout,
      iconColor: "text-emerald-500",
    },
  ];

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100">
      {/* Top Toolbar */}
      <header className="h-16 bg-white/95 dark:bg-slate-900/95 border-b border-slate-200/90 dark:border-slate-800 px-3 lg:px-5 flex items-center justify-between gap-2 z-30 shadow-2xs shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/"
            className="btn-tactile w-9 h-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 flex items-center justify-center text-white shadow-xs shrink-0"
            title="LineageFlow Home"
          >
            <Network className="w-4 h-4" />
          </Link>
          <div className="min-w-0">
            <div className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base leading-tight flex items-center gap-2">
              <span className="truncate tracking-tight">LineageFlow</span>
              <span className="text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-200/80 dark:border-indigo-800 hidden sm:inline-block">
                Multi-Union
              </span>
            </div>
            <p
              aria-label="Tree summary"
              className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block tabular-nums"
            >
              {stats.generationCount} Generations · {stats.remarriageCount}{" "}
              Multi-Unions
            </p>
          </div>
        </div>

        {/* Center Segmented Preset Switcher */}
        <div
          role="group"
          aria-label="Preset templates"
          className="hidden lg:inline-flex items-center gap-1 bg-slate-100/90 dark:bg-slate-800/90 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/80"
        >
          {presetItems.map(({ id, label, toastLabel, Icon, iconColor }) => {
            const isActive = activePreset === id;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={isActive}
                onClick={() => handleLoadPreset(id, toastLabel)}
                className={`btn-tactile px-2.5 py-1.5 text-xs font-medium rounded-lg inline-flex items-center gap-1.5 cursor-pointer ${
                  isActive
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs ring-1 ring-slate-200/80 dark:ring-slate-700"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-900/40"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        {/* Right Action Controls (Grouped Pill Clusters) */}
        <div className="flex items-center gap-2">
          {/* Search Input with '/' shortcut and clear button */}
          <div className="relative hidden md:block">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Find family member..."
              aria-label="Find family member"
              className="pl-8 pr-7 py-1.5 text-xs bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 rounded-xl focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 w-44 transition text-slate-800 dark:text-slate-100"
            />
            {search ? (
              <button
                type="button"
                onClick={() => handleSearch("")}
                aria-label="Clear search"
                className="btn-tactile absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded-md cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            ) : (
              <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-400 bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                /
              </kbd>
            )}
          </div>

          {/* History Cluster */}
          <div className="inline-flex items-center gap-0.5 bg-slate-100/90 dark:bg-slate-800/90 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
            <button
              type="button"
              disabled={history.past.length === 0}
              onClick={() => dispatch({ type: "undo" })}
              title="Undo (Ctrl+Z)"
              aria-label="Undo"
              className="btn-tactile p-1.5 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-slate-900 disabled:opacity-35 rounded-lg cursor-pointer disabled:cursor-not-allowed"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={history.future.length === 0}
              onClick={() => dispatch({ type: "redo" })}
              title="Redo (Ctrl+Shift+Z)"
              aria-label="Redo"
              className="btn-tactile p-1.5 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-slate-900 disabled:opacity-35 rounded-lg cursor-pointer disabled:cursor-not-allowed"
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </div>

          {/* Share & Export Cluster */}
          <div className="inline-flex items-center gap-0.5 bg-slate-100/90 dark:bg-slate-800/90 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
            <button
              type="button"
              onClick={handleShareUrl}
              title="Copy Shareable Link"
              aria-label="Copy shareable link"
              className="btn-tactile p-1.5 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-slate-900 rounded-lg cursor-pointer"
            >
              {linkCopied ? (
                <Check className="w-4 h-4 text-emerald-500" />
              ) : (
                <Link2 className="w-4 h-4" />
              )}
            </button>

            <button
              type="button"
              onClick={handleExportSvg}
              title="Export SVG"
              aria-label="Export SVG"
              className="btn-tactile p-1.5 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-slate-900 rounded-lg cursor-pointer hidden sm:inline-flex"
            >
              <Download className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleExportPng}
              title="Export PNG"
              aria-label="Export PNG"
              className="btn-tactile p-1.5 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-slate-900 rounded-lg cursor-pointer hidden sm:inline-flex"
            >
              <ImageIcon className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setJsonModalOpen(true)}
              title="Import / Export JSON or GEDCOM"
              aria-label="Import or export JSON"
              className="btn-tactile p-1.5 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-slate-900 rounded-lg cursor-pointer"
            >
              <FileCode2 className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={toggleDark}
            title={dark ? "Switch to light mode" : "Switch to dark mode"}
            aria-label="Toggle color theme"
            className="btn-tactile p-2 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700/80 cursor-pointer"
          >
            {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={handleCenterOnSelected}
            title="Center Tree"
            className="btn-tactile px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/80 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 font-semibold text-xs rounded-xl border border-indigo-200 dark:border-indigo-800 inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Center</span>
          </button>
        </div>
      </header>

      {/* Shared Link Confirmation Banner */}
      {pendingSharedTree && (
        <div className="bg-indigo-600 text-white px-4 py-2 text-xs flex items-center justify-between gap-3 z-30">
          <span>
            A shared family tree link was opened. Replace your local diagram
            with the shared tree?
          </span>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                dispatch({ type: "load", tree: pendingSharedTree });
                fitCurrentTree(pendingSharedTree);
                setPendingSharedTree(null);
                showToast("Loaded shared family tree");
              }}
              className="px-2.5 py-1 bg-white text-indigo-700 font-semibold rounded-lg cursor-pointer"
            >
              Load Shared Tree
            </button>
            <button
              type="button"
              onClick={() => setPendingSharedTree(null)}
              className="px-2.5 py-1 bg-indigo-700 hover:bg-indigo-800 text-white rounded-lg cursor-pointer"
            >
              Keep Local
            </button>
          </div>
        </div>
      )}

      {/* Main Workspace (Canvas + Inspector) */}
      <div
        ref={containerRef}
        className="flex-1 flex flex-col md:flex-row relative overflow-hidden"
      >
        <TreeCanvas
          tree={tree}
          selectedId={selectedId}
          searchQuery={search}
          view={view}
          onViewChange={setView}
          onSelectPerson={(id) => dispatch({ type: "select", id })}
          onOpenAddRelative={(action, personId, unionId) =>
            setModal({ action, personId, unionId })
          }
        />

        <InspectorPanel
          tree={tree}
          selectedId={selectedId}
          gens={layout.gens}
          onSelectPerson={(id) => dispatch({ type: "select", id })}
          onUpdatePerson={(id, patch) => dispatch({ type: "update", id, patch })}
          onUpdateUnion={(id, patch) =>
            dispatch({ type: "updateUnion", id, patch })
          }
          onDeleteUnion={(id) => {
            dispatch({ type: "deleteUnion", id });
            showToast("Dissolved marriage union");
          }}
          onDeletePerson={(id) => {
            const name = tree.people[id]?.name || "Member";
            dispatch({ type: "delete", id });
            showToast(`Removed ${name}`);
          }}
          onSetRoot={(id) => {
            dispatch({ type: "setRoot", id });
            showToast(
              `Set ${tree.people[id]?.name || "Member"} as Generation 0 Root`,
            );
          }}
          onOpenAddRelative={(action, personId, unionId) =>
            setModal({ action, personId, unionId })
          }
        />
      </div>

      {/* Add Relative Modal */}
      {modal && (
        <AddRelativeModal
          tree={tree}
          gens={layout.gens}
          actionType={modal.action}
          targetPersonId={modal.personId}
          preselectedUnionId={modal.unionId}
          onApply={handleApplyRelative}
          onClose={() => setModal(null)}
        />
      )}

      {/* Import / Export JSON Modal */}
      {jsonModalOpen && (
        <JsonModal
          tree={tree}
          onImport={(imported) => {
            setSelectedPreset(detectPreset(imported));
            dispatch({ type: "load", tree: imported });
            setJsonModalOpen(false);
            fitCurrentTree(imported);
            showToast("Loaded family tree");
          }}
          onCopySuccess={() => showToast("Copied family tree JSON to clipboard")}
          onClose={() => setJsonModalOpen(false)}
        />
      )}

      {/* Toast Notification */}
      {toast && (
        <div
          key={toast}
          role="status"
          className="animate-pop-in fixed bottom-5 left-1/2 -translate-x-1/2 z-50 pointer-events-none bg-slate-900 dark:bg-slate-800 text-white text-xs font-medium px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 border border-slate-700"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}
