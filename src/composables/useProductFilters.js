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

/** Price sort options shown as checkboxes in the Price filter group. */
export const PRICE_SORT_OPTIONS = [
  { value: "asc", label: "Price: Low to High" },
  { value: "desc", label: "Price: High to Low" },
];

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
     * Price sort — only one direction at a time (null = catalog order).
     * @type {null | 'asc' | 'desc'}
     */
    priceSort: null,
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
      priceSorts: PRICE_SORT_OPTIONS,
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
      isPriceFiltered.value ||
      filters.priceSort != null
    );
  });

  /**
   * Apply OR-within / AND-across rules, then optional price sort
   * (Search → Filter → Sort — pagination happens next in App).
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

    if (!filters.priceSort) return matched;

    const sorted = [...matched];
    sorted.sort((a, b) => {
      const priceA = Number(a?.price) || 0;
      const priceB = Number(b?.price) || 0;
      return filters.priceSort === "asc" ? priceA - priceB : priceB - priceA;
    });
    return sorted;
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

    if (filters.priceSort) {
      const opt = PRICE_SORT_OPTIONS.find((o) => o.value === filters.priceSort);
      chips.push({
        id: `priceSort:${filters.priceSort}`,
        group: "priceSort",
        value: filters.priceSort,
        label: opt?.label ?? filters.priceSort,
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
   * Mutual-exclusive price sort checkboxes:
   * check one → that sort; check the same again → clear; check the other → switch.
   * @param {'asc' | 'desc'} value
   */
  function togglePriceSort(value) {
    if (value !== "asc" && value !== "desc") return;
    filters.priceSort = filters.priceSort === value ? null : value;
  }

  function removeChip(chip) {
    if (!chip) return;

    if (chip.group === "price") {
      filters.priceMin = priceBounds.value.min;
      filters.priceMax = priceBounds.value.max;
      return;
    }

    if (chip.group === "priceSort") {
      filters.priceSort = null;
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
    filters.priceSort = null;
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
    togglePriceSort,
    setPriceRange,
    removeChip,
    clearFilters,
  };
}
