"use client";

import { Copy, Download, FileCode2, FolderOpen, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import { exportTreeToGedcom, importTreeFromGedcom } from "@/lib/gedcom";
import { parseTreeJson, serializeTree } from "@/lib/tree-json";
import type { Tree } from "@/lib/types";

interface JsonModalProps {
  tree: Tree;
  onImport: (tree: Tree) => void;
  onCopySuccess: () => void;
  onClose: () => void;
}

export function JsonModal({
  tree,
  onImport,
  onCopySuccess,
  onClose,
}: JsonModalProps) {
  const [raw, setRaw] = useState(() => serializeTree(tree));
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(raw);
      onCopySuccess();
    } catch {
      setError("Could not copy to clipboard. Select the text manually.");
    }
  };

  const handleDownloadFile = () => {
    const blob = new Blob([raw], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "lineageflow-tree.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadGedcom = () => {
    const ged = exportTreeToGedcom(tree);
    const blob = new Blob([ged], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "lineageflow-tree.ged";
    a.click();
    URL.revokeObjectURL(url);
  };

  const parseRawInput = (content: string): { ok: true; tree: Tree } | { ok: false; error: string } => {
    if (content.trimStart().startsWith("0 HEAD")) {
      try {
        return { ok: true, tree: importTreeFromGedcom(content) };
      } catch (err) {
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Invalid GEDCOM file.",
        };
      }
    }
    return parseTreeJson(content);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const content = typeof reader.result === "string" ? reader.result : "";
      setRaw(content);
      const parsed = parseRawInput(content);
      if (!parsed.ok) {
        setError(parsed.error);
      } else {
        setError(null);
      }
    };
    reader.readAsText(file);
  };

  const handleImport = () => {
    const result = parseRawInput(raw);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    onImport(result.tree);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="json-modal-title"
      className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4"
    >
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="px-5 py-4 bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3
            id="json-modal-title"
            className="font-bold text-slate-800 dark:text-slate-100 text-base flex items-center gap-2"
          >
            <FileCode2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            Import / Export Family Tree JSON
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

        <div className="p-5 space-y-3">
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Copy or download this JSON to back up your family tree locally, or
            upload/paste a previously exported JSON file below.
          </p>

          <textarea
            rows={10}
            aria-label="Family tree JSON"
            value={raw}
            onChange={(e) => {
              setRaw(e.target.value);
              if (error) setError(null);
            }}
            className="w-full p-3 text-xs font-mono bg-slate-900 text-emerald-300 rounded-xl border border-slate-700 focus:outline-none"
          />

          {error && (
            <p
              role="alert"
              className="text-xs font-medium text-rose-600 dark:text-rose-400"
            >
              {error}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleCopy}
                className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" /> Copy
              </button>
              <button
                type="button"
                onClick={handleDownloadFile}
                className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> Save .json
              </button>
              <button
                type="button"
                onClick={handleDownloadGedcom}
                className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> Save .ged
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition inline-flex items-center gap-1.5 cursor-pointer"
              >
                <FolderOpen className="w-3.5 h-3.5" /> Open .json
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.ged,application/json,text/plain"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleImport}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" /> Load JSON
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
