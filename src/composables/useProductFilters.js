/**
 * useProductFilters — holds filter selections and applies them to a product list.
 *
 * Rules (from docs/product-listing-requirements.md):
 * - OR within the same group (Brand A OR Brand B)
 * - AND across groups (brand AND price AND rating …)
 *
 * Pure option/chip builders live in `@/utils/filterOptions.js`;
 * sort options + sortProducts live in `@/utils/productSort.js`.
 *
 * Vue ideas:
 * - `reactive` — one object for all filter selections (nice for forms)
 * - `computed` — filtered list + option lists + active chips stay in sync
 * - `toRef` / `unref` — accept a ref or plain array of source products
 */
import { reactive, computed, unref, watch } from "vue";
import {
  RATING_FILTER_OPTIONS,
  DISCOUNT_FILTER_OPTIONS,
  buildFilterOptions,
  buildActiveChips,
} from "@/utils/filterOptions.js";
import {
  SORT_OPTIONS,
  DEFAULT_SORT,
  sortProducts,
} from "@/utils/productSort.js";

/* Re-export so older imports (e.g. ProductGrid) keep working.
 * Prefer importing from productSort / filterOptions in new code. */
export {
  SORT_OPTIONS,
  DEFAULT_SORT,
  RATING_FILTER_OPTIONS,
  DISCOUNT_FILTER_OPTIONS,
};

/** sessionStorage key — last catalog price bounds (reduces slider jump on refresh). */
const PRICE_BOUNDS_STORAGE_KEY = "vue-shop-price-bounds";

/**
 * @returns {{ min: number, max: number } | null}
 */
function readStoredPriceBounds() {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(PRICE_BOUNDS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const min = Number(parsed?.min);
    const max = Number(parsed?.max);
    if (!Number.isFinite(min) || !Number.isFinite(max) || max <= 0) return null;
    return { min: Math.floor(min), max: Math.ceil(max) };
  } catch {
    return null;
  }
}

/**
 * @param {{ min: number, max: number }} bounds
 */
function writeStoredPriceBounds(bounds) {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(PRICE_BOUNDS_STORAGE_KEY, JSON.stringify(bounds));
  } catch {
    /* Private mode / quota — ignore. */
  }
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
  /** Last known bounds from a previous visit in this tab (before catalog fetch). */
  const storedBounds = readStoredPriceBounds();

  const filters = reactive({
    /** @type {string[]} category slugs */
    categories: [],
    /** @type {string[]} */
    brands: [],
    /** @type {string[]} color names */
    colors: [],
    /** @type {string[]} size option values (only products that have Size) */
    sizes: [],
    /** @type {number[]} minimum rating thresholds (e.g. 4 = 4★ & up) */
    ratings: [],
    /** @type {number[]} minimum discount % thresholds */
    discounts: [],
    /** When true, only products with stock > 0 (Availability → In stock). */
    inStockOnly: false,
    /** Current price range (seeded from cache when available). */
    priceMin: storedBounds?.min ?? 0,
    priceMax: storedBounds?.max ?? 0,
    /**
     * Listing sort — toolbar dropdown (not a filter chip).
     * @type {'featured' | 'best-selling' | 'newest' | 'rating' | 'discount-desc' | 'price-asc' | 'price-desc'}
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
      /* Prefer cached bounds over 0–0 so the slider does not jump on refresh. */
      return storedBounds ?? { min: 0, max: 0 };
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
   * Also persist bounds for the next refresh in this tab.
   */
  watch(
    () => `${priceBounds.value.min}:${priceBounds.value.max}`,
    () => {
      const { min, max } = priceBounds.value;
      if (max > 0) {
        writeStoredPriceBounds({ min, max });
      }
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

  const filterOptions = computed(() =>
    buildFilterOptions(catalogList.value, filters.categories),
  );

  /**
   * When the category changes, drop brand / size selections that are no
   * longer in the option list (avoids invisible chips / empty results).
   *
   * Wait until the catalog has loaded. On refresh, URL sync restores values
   * first; if we prune against an empty option list, every value is wiped
   * and then written back out of the URL.
   */
  watch(
    () => filterOptions.value.brands,
    (availableBrands) => {
      if (filters.brands.length === 0) return;
      if (catalogList.value.length === 0) return;
      const allowed = new Set(availableBrands);
      filters.brands = filters.brands.filter((brand) => allowed.has(brand));
    },
  );

  watch(
    () => filterOptions.value.sizes,
    (availableSizes) => {
      if (filters.sizes.length === 0) return;
      if (catalogList.value.length === 0) return;
      const allowed = new Set(availableSizes);
      filters.sizes = filters.sizes.filter((size) => allowed.has(size));
    },
  );

  const isPriceFiltered = computed(() => {
    const { min, max } = priceBounds.value;
    return filters.priceMin > min || filters.priceMax < max;
  });

  /**
   * Sidebar / chip filters only — category is route + header strip, not
   * counted here (so Clear all does not leave the category page).
   */
  const hasActiveFilters = computed(() => {
    return (
      filters.brands.length > 0 ||
      filters.colors.length > 0 ||
      filters.sizes.length > 0 ||
      filters.ratings.length > 0 ||
      filters.discounts.length > 0 ||
      filters.inStockOnly ||
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

      if (filters.sizes.length > 0) {
        const productSizes = product.sizes ?? [];
        const matchesSize = filters.sizes.some((s) => productSizes.includes(s));
        if (!matchesSize) return false;
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

      if (filters.inStockOnly) {
        if ((product.stock ?? 0) <= 0) return false;
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

  const activeChips = computed(() =>
    buildActiveChips({
      filters,
      filterOptions: filterOptions.value,
      isPriceFiltered: isPriceFiltered.value,
      priceMin: filters.priceMin,
      priceMax: filters.priceMax,
      priceFormatter,
    }),
  );

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

  function toggleSize(value) {
    toggleArrayValue(filters.sizes, value);
  }

  function toggleRating(value) {
    toggleArrayValue(filters.ratings, value);
  }

  function toggleDiscount(value) {
    toggleArrayValue(filters.discounts, value);
  }

  function toggleInStock() {
    filters.inStockOnly = !filters.inStockOnly;
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

    if (chip.group === "inStock") {
      filters.inStockOnly = false;
      return;
    }

    const list = filters[chip.group];
    if (!Array.isArray(list)) return;
    const index = list.indexOf(chip.value);
    if (index !== -1) list.splice(index, 1);
  }

  function clearFilters() {
    // Keep category — it is the page path / header strip, not a chip filter.
    filters.brands = [];
    filters.colors = [];
    filters.sizes = [];
    filters.ratings = [];
    filters.discounts = [];
    filters.inStockOnly = false;
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
    toggleSize,
    toggleRating,
    toggleDiscount,
    toggleInStock,
    setSort,
    setPriceRange,
    removeChip,
    clearFilters,
  };
}
