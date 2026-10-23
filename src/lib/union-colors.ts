export interface UnionPalette {
  stroke: string;
  bg: string;
  border: string;
  text: string;
}

/** One color per marriage of a person: 1st amber, 2nd purple, 3rd pink, 4th cyan. */
export const UNION_COLORS: UnionPalette[] = [
  { stroke: "#f59e0b", bg: "#fef3c7", border: "#f59e0b", text: "#b45309" },
  { stroke: "#8b5cf6", bg: "#ede9fe", border: "#8b5cf6", text: "#6d28d9" },
  { stroke: "#ec4899", bg: "#fce7f3", border: "#ec4899", text: "#be185d" },
  { stroke: "#06b6d4", bg: "#cffafe", border: "#06b6d4", text: "#0e7490" },
];
