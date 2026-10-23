export function generationLabel(gen: number): string {
  if (gen === 0) return "Gen 0 (Self/Peer)";
  if (gen === -1) return "Gen -1 (Parents)";
  if (gen === -2) return "Gen -2 (Grandparents)";
  if (gen === -3) return "Gen -3 (Great-GP)";
  if (gen < -3) return `Gen ${gen} (${Math.abs(gen) - 2}x Great-GP)`;
  if (gen === 1) return "Gen +1 (Children)";
  if (gen === 2) return "Gen +2 (Grandchildren)";
  return `Gen +${gen} (${gen - 2}x Great-GC)`;
}

export function ordinal(n: number): string {
  return n === 1 ? "1st" : n === 2 ? "2nd" : n === 3 ? "3rd" : `${n}th`;
}
