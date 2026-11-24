/**
 * productSort — toolbar sort options and the pure sortProducts helper.
 *
 * Used by useProductFilters after Search → Filter. Default is Featured —
 * see docs/product-listing-requirements.md §3.4.
 */

/**
 * Toolbar sort options (Search → Filter → Sort → Paginate).
 */
export const SORT_OPTIONS = [
  { value: "featured", label: "Featured Products" },
  { value: "best-selling", label: "Best Seller" },
  { value: "newest", label: "Newest Arrival" },
  { value: "rating", label: "Customer Rating" },
  { value: "discount-desc", label: "Biggest Discount" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
];

export const DEFAULT_SORT = "featured";

/**
 * @param {unknown} a
 * @param {unknown} b
 * @returns {number}
 */
function compareNumbersDesc(a, b) {
  return (Number(b) || 0) - (Number(a) || 0);
}

/**
 * Apply the selected sort. Always returns a new array.
 * @param {unknown[]} list
 * @param {string} sort
 */
export function sortProducts(list, sort) {
  const sorted = [...list];

  switch (sort) {
    case "price-asc":
      sorted.sort((a, b) => (Number(a?.price) || 0) - (Number(b?.price) || 0));
      break;
    case "price-desc":
      sorted.sort((a, b) => (Number(b?.price) || 0) - (Number(a?.price) || 0));
      break;
    case "newest":
      sorted.sort((a, b) => {
        const timeA = a?.createdAt ? Date.parse(a.createdAt) : NaN;
        const timeB = b?.createdAt ? Date.parse(b.createdAt) : NaN;
        const hasA = Number.isFinite(timeA);
        const hasB = Number.isFinite(timeB);
        if (hasA && hasB && timeA !== timeB) return timeB - timeA;
        if (hasA !== hasB) return hasA ? -1 : 1;
        // Fallback: higher DummyJSON id ≈ newer catalog entry.
        return (Number(b?.id) || 0) - (Number(a?.id) || 0);
      });
      break;
    case "best-selling":
      // Highest salesCount first; id keeps ties stable.
      sorted.sort((a, b) => {
        const bySales = compareNumbersDesc(a?.salesCount, b?.salesCount);
        if (bySales !== 0) return bySales;
        return (Number(a?.id) || 0) - (Number(b?.id) || 0);
      });
      break;
    case "rating":
      // Highest rating first; products with no rating sink to the end.
      sorted.sort((a, b) => {
        const hasA = typeof a?.rating === "number";
        const hasB = typeof b?.rating === "number";
        if (hasA !== hasB) return hasA ? -1 : 1;
        if (hasA && hasB) {
          const byRating = compareNumbersDesc(a.rating, b.rating);
          if (byRating !== 0) return byRating;
        }
        return (Number(a?.id) || 0) - (Number(b?.id) || 0);
      });
      break;
    case "discount-desc":
      // Biggest discount % first (not raw dollar savings).
      sorted.sort((a, b) => {
        const byDiscount = compareNumbersDesc(
          a?.discountPercentage,
          b?.discountPercentage,
        );
        if (byDiscount !== 0) return byDiscount;
        return (Number(a?.id) || 0) - (Number(b?.id) || 0);
      });
      break;
    case "featured":
    default:
      // Featured first, then higher rating, then id for a stable order.
      sorted.sort((a, b) => {
        const featA = a?.isFeatured ? 1 : 0;
        const featB = b?.isFeatured ? 1 : 0;
        if (featA !== featB) return featB - featA;
        const byRating = compareNumbersDesc(a?.rating, b?.rating);
        if (byRating !== 0) return byRating;
        return (Number(a?.id) || 0) - (Number(b?.id) || 0);
      });
      break;
  }

  return sorted;
}
