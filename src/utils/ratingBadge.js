/**
 * Map a product rating (0–5) to a badge color band.
 *
 * Bands (half-open except the top):
 * - below 1 → red
 * - 1 up to 2 → red–orange
 * - 2 up to 3 → orange–yellow
 * - 3 up to 4 → light green
 * - 4 up to 5 → green (current badge color)
 *
 * @param {unknown} rating
 * @returns {'below-1' | '1-2' | '2-3' | '3-4' | '4-5' | null}
 */
export function getRatingBadgeTone(rating) {
  if (typeof rating !== "number" || !Number.isFinite(rating)) return null;
  if (rating < 1) return "below-1";
  if (rating < 2) return "1-2";
  if (rating < 3) return "2-3";
  if (rating < 4) return "3-4";
  return "4-5";
}
