import type { GarmentCategory } from "./types";

/** Mirrors the server rules in convex/fitting.ts `start`. */
export const MAX_PIECES = 6;

/** Rows in the fitting room, outermost first, the way you'd dress at a rail. */
export const SLOT_ORDER: GarmentCategory[] = ["outerwear", "top", "dress", "bottom", "shoes", "bag", "accessory", "other"];

type Piece = { _id: string; category: GarmentCategory };

function clashes(a: GarmentCategory, b: GarmentCategory) {
  if (a === "accessory" || b === "accessory") return false;
  if (a === b) return true;
  const pair = new Set([a, b]);
  return pair.has("dress") && (pair.has("top") || pair.has("bottom"));
}

/**
 * Toggle a piece. Picking one swaps out whatever held its slot (a dress swaps
 * out top and bottom, and back), so the selection is always wearable.
 */
export function togglePiece<T extends Piece>(selected: T[], piece: T): T[] {
  if (selected.some((p) => p._id === piece._id)) return selected.filter((p) => p._id !== piece._id);
  const kept = selected.filter((p) => !clashes(p.category, piece.category));
  return kept.length >= MAX_PIECES ? kept : [...kept, piece];
}

/** Seed from a look or an item link: apply pieces in order so the rules hold. */
export function selectionFrom<T extends Piece>(ids: string[], pieces: T[]): T[] {
  const byId = new Map(pieces.map((p) => [p._id, p]));
  return ids.reduce<T[]>((acc, id) => {
    const piece = byId.get(id);
    return piece && !acc.some((p) => p._id === id) ? togglePiece(acc, piece) : acc;
  }, []);
}
