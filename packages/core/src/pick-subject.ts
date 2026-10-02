/**
 * Choose the next Subject at random without repeating one until the pool has
 * been played through. `played` is the caller's memory of Subject ids already
 * shown; it is kept across pool changes (tier, facet) so switching pools does
 * not bring recent Subjects straight back. Mutates `played`.
 */
export function pickSubject<T extends { id: string }>(
  items: readonly T[],
  played: Set<string>,
  random: () => number = Math.random,
): T | undefined {
  if (items.length === 0) return undefined;
  let fresh = items.filter((item) => !played.has(item.id));
  if (fresh.length === 0) {
    // Pool exhausted: start a new cycle, but never open it with the Subject
    // that just ended the last one.
    const last = [...played].pop();
    played.clear();
    fresh = items.length > 1 ? items.filter((item) => item.id !== last) : [...items];
  }
  const pick = fresh[Math.floor(random() * fresh.length)];
  played.add(pick.id);
  return pick;
}
