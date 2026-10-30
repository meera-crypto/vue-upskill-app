/**
 * useProductFilters — holds filter selections and applies them to a product list.
 *
 * Rules (from docs/product-listing-requirements.md):
 * - OR within the same group (Brand A OR Brand B)
 * - AND across groups (brand AND price AND rating …)
 *
 * Vue ideas:
 * - `reactive` — one object for all filter selections (nice for forms)
 * - `computed` — filtered list + option lists + active chips stay in sync
 * - `toRef` / `unref` — accept a ref or plain array of source products
 */
import { reactive, computed, unref, watch } from "vue";
import { COLOR_SWATCH_HEX } from "@/services/productService.js";

export const RATING_FILTER_OPTIONS = [
  { value: 4, label: "4★ & up" },
  { value: 3, label: "3★ & up" },
  { value: 2, label: "2★ & up" },
  { value: 1, label: "1★ & up" },
];

export const DISCOUNT_FILTER_OPTIONS = [
  { value: 5, label: "5% or more" },
  { value: 10, label: "10% or more" },
  { value: 15, label: "15% or more" },
];

/**
 * Toolbar sort options (Search → Filter → Sort → Paginate).
 * Default is Featured — see docs/product-listing-requirements.md §3.4.
 */
export const SORT_OPTIONS = [
  { value: "featured", label: "Featured Products" },
  { value: "best-selling", label: "Best Seller" },
  { value: "newest", label: "Newest Arrival" },
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
function sortProducts(list, sort) {
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
      sorted.sort((a, b) => {
        const bySales = compareNumbersDesc(a?.salesCount, b?.salesCount);
        if (bySales !== 0) return bySales;
        return compareNumbersDesc(a?.rating, b?.rating);
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

const priceFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

/**
 * @param {import('vue').Ref<unknown[]> | unknown[]} sourceProducts
 *        Search-filtered products (or any list to narrow further).
 * @param {import('vue').Ref<unknown[]> | unknown[]} [catalogProducts]
 *        Full catalog for stable option lists + price bounds.
 */
export function useProductFilters(sourceProducts, catalogProducts) {
  const filters = reactive({
    /** @type {string[]} category slugs */
    categories: [],
    /** @type {string[]} */
    brands: [],
    /** @type {string[]} color names */
    colors: [],
    /** @type {number[]} minimum rating thresholds (e.g. 4 = 4★ & up) */
    ratings: [],
    /** @type {number[]} minimum discount % thresholds */
    discounts: [],
    /** Current price range (synced to catalog bounds when catalog loads). */
    priceMin: 0,
    priceMax: 0,
    /**
     * Listing sort — toolbar dropdown (not a filter chip).
     * @type {'featured' | 'best-selling' | 'newest' | 'price-asc' | 'price-desc'}
     */
    sort: DEFAULT_SORT,
  });

  const catalogList = computed(() => {
    const list = unref(catalogProducts ?? sourceProducts);
    return Array.isArray(list) ? list : [];
  });

  const sourceList = computed(() => {
    const list = unref(sourceProducts);
    return Array.isArray(list) ? list : [];
  });

  const priceBounds = computed(() => {
    const prices = catalogList.value
      .map((p) => Number(p?.price))
      .filter((n) => Number.isFinite(n) && n >= 0);

    if (prices.length === 0) {
      return { min: 0, max: 0 };
    }

    return {
      min: Math.floor(Math.min(...prices)),
      max: Math.ceil(Math.max(...prices)),
    };
  });

  /**
   * Keep the slider range valid when the catalog first arrives.
   * Watch a primitive key so a new `{ min, max }` object each compute
   * does not re-run the callback and fight the user’s drag.
   */
  watch(
    () => `${priceBounds.value.min}:${priceBounds.value.max}`,
    () => {
      const { min, max } = priceBounds.value;
      if (filters.priceMin === 0 && filters.priceMax === 0 && max > 0) {
        filters.priceMin = min;
        filters.priceMax = max;
        return;
      }
      if (max <= 0) return;

      filters.priceMin = Math.min(Math.max(filters.priceMin, min), max);
      filters.priceMax = Math.min(Math.max(filters.priceMax, min), max);
      if (filters.priceMin > filters.priceMax) {
        filters.priceMin = min;
        filters.priceMax = max;
      }
    },
    { immediate: true },
  );

  const filterOptions = computed(() => {
    const categoriesMap = new Map();
    const brands = new Set();
    const colors = new Set();

    for (const product of catalogList.value) {
      if (product?.category) {
        categoriesMap.set(
          product.category,
          product.categoryLabel || product.category,
        );
      }
      if (product?.brand) brands.add(product.brand);
      for (const color of product?.colors ?? []) {
        colors.add(color);
      }
    }

    return {
      categories: [...categoriesMap.entries()]
        .map(([value, label]) => ({ value, label }))
        .sort((a, b) => a.label.localeCompare(b.label)),
      brands: [...brands].sort((a, b) => a.localeCompare(b)),
      colors: [...colors]
        .sort((a, b) => a.localeCompare(b))
        .map((name) => ({
          value: name,
          label: name.charAt(0).toUpperCase() + name.slice(1),
          hex: COLOR_SWATCH_HEX[name] ?? "#ccc",
        })),
      ratings: RATING_FILTER_OPTIONS,
      discounts: DISCOUNT_FILTER_OPTIONS,
      sorts: SORT_OPTIONS,
    };
  });

  const isPriceFiltered = computed(() => {
    const { min, max } = priceBounds.value;
    return filters.priceMin > min || filters.priceMax < max;
  });

  const hasActiveFilters = computed(() => {
    return (
      filters.categories.length > 0 ||
      filters.brands.length > 0 ||
      filters.colors.length > 0 ||
      filters.ratings.length > 0 ||
      filters.discounts.length > 0 ||
      isPriceFiltered.value
    );
  });

  /**
   * Apply OR-within / AND-across rules, then sort
   * (Search → Filter → Sort — pagination happens next in the page view).
   */
  const filteredProducts = computed(() => {
    const matched = sourceList.value.filter((product) => {
      if (filters.categories.length > 0) {
        if (!filters.categories.includes(product.category)) return false;
      }

      if (filters.brands.length > 0) {
        if (!filters.brands.includes(product.brand)) return false;
      }

      if (filters.colors.length > 0) {
        const productColors = product.colors ?? [];
        const matchesColor = filters.colors.some((c) =>
          productColors.includes(c),
        );
        if (!matchesColor) return false;
      }

      if (filters.ratings.length > 0) {
        const rating = product.rating;
        if (typeof rating !== "number") return false;
        // OR: product meets at least one selected “X & up” threshold.
        const matchesRating = filters.ratings.some(
          (minStars) => rating >= minStars,
        );
        if (!matchesRating) return false;
      }

      if (filters.discounts.length > 0) {
        const discount = Number(product.discountPercentage) || 0;
        const matchesDiscount = filters.discounts.some(
          (minPct) => discount >= minPct,
        );
        if (!matchesDiscount) return false;
      }

      if (isPriceFiltered.value) {
        const price = Number(product.price);
        if (!Number.isFinite(price)) return false;
        if (price < filters.priceMin || price > filters.priceMax) return false;
      }

      return true;
    });

    return sortProducts(matched, filters.sort);
  });

  const activeChips = computed(() => {
    /** @type {{ id: string, group: string, value: string|number, label: string }[]} */
    const chips = [];

    for (const value of filters.categories) {
      const opt = filterOptions.value.categories.find((c) => c.value === value);
      chips.push({
        id: `category:${value}`,
        group: "categories",
        value,
        label: opt?.label ?? value,
      });
    }

    for (const value of filters.brands) {
      chips.push({
        id: `brand:${value}`,
        group: "brands",
        value,
        label: value,
      });
    }

    for (const value of filters.colors) {
      const opt = filterOptions.value.colors.find((c) => c.value === value);
      chips.push({
        id: `color:${value}`,
        group: "colors",
        value,
        label: opt?.label ?? value,
      });
    }

    for (const value of filters.ratings) {
      const opt = RATING_FILTER_OPTIONS.find((r) => r.value === value);
      chips.push({
        id: `rating:${value}`,
        group: "ratings",
        value,
        label: opt?.label ?? `${value}★ & up`,
      });
    }

    for (const value of filters.discounts) {
      const opt = DISCOUNT_FILTER_OPTIONS.find((d) => d.value === value);
      chips.push({
        id: `discount:${value}`,
        group: "discounts",
        value,
        label: opt?.label ?? `${value}% or more`,
      });
    }

    if (isPriceFiltered.value) {
      chips.push({
        id: "price",
        group: "price",
        value: "price",
        label: `${priceFormatter.format(filters.priceMin)} – ${priceFormatter.format(filters.priceMax)}`,
      });
    }

    return chips;
  });

  function toggleArrayValue(list, value) {
    const index = list.indexOf(value);
    if (index === -1) {
      list.push(value);
    } else {
      list.splice(index, 1);
    }
  }

  /**
   * Category is single-select (header strip): pick one, or tap again to clear.
   * @param {string} value
   */
  function toggleCategory(value) {
    if (filters.categories.length === 1 && filters.categories[0] === value) {
      filters.categories = [];
      return;
    }
    filters.categories = [value];
  }

  function toggleBrand(value) {
    toggleArrayValue(filters.brands, value);
  }

  function toggleColor(value) {
    toggleArrayValue(filters.colors, value);
  }

  function toggleRating(value) {
    toggleArrayValue(filters.ratings, value);
  }

  function toggleDiscount(value) {
    toggleArrayValue(filters.discounts, value);
  }

  function setPriceRange(min, max) {
    const bounds = priceBounds.value;
    let nextMin = Number(min);
    let nextMax = Number(max);
    if (!Number.isFinite(nextMin)) nextMin = bounds.min;
    if (!Number.isFinite(nextMax)) nextMax = bounds.max;
    filters.priceMin = Math.min(Math.max(nextMin, bounds.min), bounds.max);
    filters.priceMax = Math.min(Math.max(nextMax, bounds.min), bounds.max);
    if (filters.priceMin > filters.priceMax) {
      const swap = filters.priceMin;
      filters.priceMin = filters.priceMax;
      filters.priceMax = swap;
    }
  }

  /**
   * Set the listing sort from the toolbar dropdown.
   * Sorting does not clear filters or search.
   * @param {string} value
   */
  function setSort(value) {
    const allowed = SORT_OPTIONS.some((opt) => opt.value === value);
    filters.sort = allowed ? value : DEFAULT_SORT;
  }

  function removeChip(chip) {
    if (!chip) return;

    if (chip.group === "price") {
      filters.priceMin = priceBounds.value.min;
      filters.priceMax = priceBounds.value.max;
      return;
    }

    const list = filters[chip.group];
    if (!Array.isArray(list)) return;
    const index = list.indexOf(chip.value);
    if (index !== -1) list.splice(index, 1);
  }

  function clearFilters() {
    filters.categories = [];
    filters.brands = [];
    filters.colors = [];
    filters.ratings = [];
    filters.discounts = [];
    filters.priceMin = priceBounds.value.min;
    filters.priceMax = priceBounds.value.max;
    // Sort stays as the user left it — it is not a filter.
  }

  return {
    filters,
    filterOptions,
    priceBounds,
    filteredProducts,
    activeChips,
    hasActiveFilters,
    isPriceFiltered,
    toggleCategory,
    toggleBrand,
    toggleColor,
    toggleRating,
    toggleDiscount,
    setSort,
    setPriceRange,
    removeChip,
    clearFilters,
  };
}
