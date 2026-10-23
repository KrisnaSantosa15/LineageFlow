import { buildConnectorGeometry } from "./connectors";
import { CARD_HEIGHT, CARD_WIDTH } from "./constants";
import { generationLabel } from "./labels";
import type { Layout } from "./layout";
import type { Tree } from "./types";
import { UNION_COLORS } from "./union-colors";

const esc = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export function renderTreeToSvgString(tree: Tree, layout: Layout, dark = false): string {
  const { positions, unionPositions, gens } = layout;
  const pts = Object.values(positions);
  if (pts.length === 0) {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200"></svg>';
  }

  const pad = 48;
  const minX = Math.min(...pts.map((p) => p.x)) - pad;
  const maxX = Math.max(...pts.map((p) => p.x + CARD_WIDTH)) + pad;
  const minY = Math.min(...pts.map((p) => p.y)) - pad;
  const maxY = Math.max(...pts.map((p) => p.y + CARD_HEIGHT)) + pad;
  const width = Math.max(200, Math.round(maxX - minX));
  const height = Math.max(150, Math.round(maxY - minY));

  const bg = dark ? "#0f172a" : "#f8fafc";
  const cardBg = dark ? "#1e293b" : "#ffffff";
  const cardBorder = dark ? "#334155" : "#e2e8f0";
  const textMain = dark ? "#f1f5f9" : "#1e293b";
  const textSub = dark ? "#94a3b8" : "#64748b";

  const groups = buildConnectorGeometry(tree, layout);
  const pathsSvg = groups
    .map((g) => {
      const dash = g.dashed ? ' stroke-dasharray="6,4"' : "";
      const partners = g.partnerPaths
        .map(
          (d) =>
            `<path d="${d}" stroke="${g.palette.stroke}" stroke-width="2.5" fill="none"${dash} />`,
        )
        .join("");
      const drop = g.dropPath
        ? `<path d="${g.dropPath}" stroke="${g.palette.stroke}" stroke-width="2.2" fill="none" />`
        : "";
      const kids = g.children
        .map(
          (c) =>
            `<path d="${c.path}" stroke="${g.palette.stroke}" stroke-width="2.2" stroke-linejoin="round" fill="none" />` +
            `<circle cx="${c.dot.cx}" cy="${c.dot.cy}" r="3.5" fill="${g.palette.stroke}" />`,
        )
        .join("");
      return partners + drop + kids;
    })
    .join("");

  const hubsSvg = Object.values(tree.unions)
    .map((u) => {
      const uPos = unionPositions[u.id];
      if (!uPos) return "";
      const palette = UNION_COLORS[uPos.colorIdx ?? 0] ?? UNION_COLORS[0];
      return (
        `<g transform="translate(${uPos.x},${uPos.y})">` +
        `<rect x="-18" y="-10" width="36" height="20" rx="10" fill="${palette.bg}" stroke="${palette.border}" stroke-width="1.2" />` +
        `<text x="0" y="3.5" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="10" font-weight="700" fill="${palette.text}">${u.children.length}</text>` +
        `</g>`
      );
    })
    .join("");

  const cardsSvg = Object.values(tree.people)
    .map((p) => {
      const pos = positions[p.id];
      if (!pos) return "";
      const isRoot = p.id === tree.rootPersonId;
      const genText = isRoot ? "ROOT (GEN 0)" : generationLabel(gens[p.id] ?? 0).toUpperCase();
      const years = `${p.birth || "?"}–${p.death || "Living"}`;
      return (
        `<g transform="translate(${pos.x},${pos.y})">` +
        `<rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" rx="16" fill="${cardBg}" stroke="${isRoot ? "#4f46e5" : cardBorder}" stroke-width="${isRoot ? "2" : "1.2"}" />` +
        `<text x="14" y="24" font-family="Inter, system-ui, sans-serif" font-size="9" font-weight="700" fill="${isRoot ? "#4f46e5" : textSub}">${esc(genText.slice(0, 24))}</text>` +
        `<text x="14" y="44" font-family="Inter, system-ui, sans-serif" font-size="12" font-weight="700" fill="${textMain}">${esc(p.name.slice(0, 22))}</text>` +
        `<line x1="12" y1="64" x2="${CARD_WIDTH - 12}" y2="64" stroke="${cardBorder}" stroke-width="1" />` +
        `<text x="14" y="81" font-family="Inter, system-ui, sans-serif" font-size="10" fill="${textSub}">${esc((p.note || "Family Member").slice(0, 18))}</text>` +
        `<text x="${CARD_WIDTH - 14}" y="81" text-anchor="end" font-family="ui-monospace, monospace" font-size="9" fill="${textSub}">${esc(years)}</text>` +
        `</g>`
      );
    })
    .join("");

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${minX} ${minY} ${width} ${height}">` +
    `<rect x="${minX}" y="${minY}" width="${width}" height="${height}" fill="${bg}" />` +
    pathsSvg +
    hubsSvg +
    cardsSvg +
    `</svg>`
  );
}
