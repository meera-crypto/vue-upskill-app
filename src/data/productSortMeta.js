/**
 * Local sort metadata overlays for DummyJSON products.
 *
 * DummyJSON has no real `salesCount` / `isFeatured` fields. Prefer these
 * when mapping products so Featured and Best Selling sorts feel intentional
 * instead of only using review-count / rating heuristics.
 *
 * Keys are DummyJSON product ids (same set as variant overlays where useful).
 *
 * @typedef {{ salesCount?: number, isFeatured?: boolean }} SortMeta
 */

/** @type {Record<number, SortMeta>} */
export const PRODUCT_SORT_META = {
  4: { salesCount: 920, isFeatured: true },
  6: { salesCount: 640, isFeatured: false },
  28: { salesCount: 1180, isFeatured: true },
  78: { salesCount: 410, isFeatured: false },
  83: { salesCount: 1840, isFeatured: true },
  86: { salesCount: 760, isFeatured: false },
  88: { salesCount: 1520, isFeatured: true },
  123: { salesCount: 980, isFeatured: true },
  177: { salesCount: 530, isFeatured: false },
};
