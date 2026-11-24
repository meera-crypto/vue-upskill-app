/**
 * filterOptions — pure builders for filter sidebar options and active chips.
 *
 * useProductFilters keeps reactive state; these helpers stay free of Vue so
 * they are easier to read and test.
 */

import { COLOR_SWATCH_HEX } from "@/utils/productModel.js";
import { SORT_OPTIONS } from "@/utils/productSort.js";

export const RATING_FILTER_OPTIONS = [
  { value: 4, label: "4 ★ & above" },
  { value: 3, label: "3 ★ & above" },
  { value: 2, label: "2 ★ & above" },
  { value: 1, label: "1 ★ & above" },
];

export const DISCOUNT_FILTER_OPTIONS = [
  { value: 5, label: "5% or more" },
  { value: 10, label: "10% or more" },
  { value: 15, label: "15% or more" },
];

/** Prefer common clothing size order; fall back to localeCompare. */
export const SIZE_ORDER = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL"];

/**
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
export function compareSizeLabels(a, b) {
  const ia = SIZE_ORDER.indexOf(String(a).toUpperCase());
  const ib = SIZE_ORDER.indexOf(String(b).toUpperCase());
  if (ia !== -1 && ib !== -1) return ia - ib;
  if (ia !== -1) return -1;
  if (ib !== -1) return 1;
  const numA = Number(a);
  const numB = Number(b);
  if (Number.isFinite(numA) && Number.isFinite(numB)) return numA - numB;
  return String(a).localeCompare(String(b), undefined, { numeric: true });
}

/**
 * Build the filter sidebar option lists from the catalog.
 *
 * Brand / size lists depend on category: selected category → options that
 * appear in that category only; no category → whole catalog.
 * Size only appears for products that actually have a Size option.
 *
 * @param {unknown[]} catalogList
 * @param {string[]} selectedCategories
 */
export function buildFilterOptions(catalogList, selectedCategories) {
  const categoriesMap = new Map();
  const brands = new Set();
  const colors = new Set();
  const sizes = new Set();
  const list = Array.isArray(catalogList) ? catalogList : [];
  const categories = Array.isArray(selectedCategories)
    ? selectedCategories
    : [];

  const scopedProducts =
    categories.length > 0
      ? list.filter((product) => categories.includes(product?.category))
      : list;

  for (const product of list) {
    if (product?.category) {
      categoriesMap.set(
        product.category,
        product.categoryLabel || product.category,
      );
    }
    for (const color of product?.colors ?? []) {
      colors.add(color);
    }
  }

  for (const product of scopedProducts) {
    if (product?.brand) brands.add(product.brand);
    for (const size of product?.sizes ?? []) {
      if (size) sizes.add(size);
    }
  }

  return {
    categories: [...categoriesMap.entries()]
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) =>
        a.label.localeCompare(b.label, undefined, { sensitivity: "base" }),
      ),
    brands: [...brands].sort((a, b) => a.localeCompare(b)),
    colors: [...colors]
      .sort((a, b) => a.localeCompare(b))
      .map((name) => ({
        value: name,
        label: name.charAt(0).toUpperCase() + name.slice(1),
        hex: COLOR_SWATCH_HEX[name] ?? "#ccc",
      })),
    // Natural size order when values look like clothing sizes; else A–Z.
    sizes: [...sizes].sort(compareSizeLabels),
    ratings: RATING_FILTER_OPTIONS,
    discounts: DISCOUNT_FILTER_OPTIONS,
    sorts: SORT_OPTIONS,
  };
}

/**
 * Build removable “active filter” chips from the current filter state.
 *
 * @param {{
 *   filters: {
 *     categories: string[],
 *     brands: string[],
 *     colors: string[],
 *     sizes: string[],
 *     ratings: number[],
 *     discounts: number[],
 *     inStockOnly: boolean,
 *     priceMin: number,
 *     priceMax: number,
 *   },
 *   filterOptions: {
 *     categories: { value: string, label: string }[],
 *     colors: { value: string, label: string }[],
 *   },
 *   isPriceFiltered: boolean,
 *   priceMin: number,
 *   priceMax: number,
 *   priceFormatter: { format: (value: number) => string },
 * }} args
 * @returns {{ id: string, group: string, value: string|number, label: string }[]}
 */
export function buildActiveChips({
  filters,
  filterOptions,
  isPriceFiltered,
  priceMin,
  priceMax,
  priceFormatter,
}) {
  /** @type {{ id: string, group: string, value: string|number, label: string }[]} */
  const chips = [];

  for (const value of filters.categories) {
    const opt = filterOptions.categories.find((c) => c.value === value);
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
    const opt = filterOptions.colors.find((c) => c.value === value);
    chips.push({
      id: `color:${value}`,
      group: "colors",
      value,
      label: opt?.label ?? value,
    });
  }

  for (const value of filters.sizes) {
    chips.push({
      id: `size:${value}`,
      group: "sizes",
      value,
      label: `Size ${value}`,
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

  if (filters.inStockOnly) {
    chips.push({
      id: "inStock",
      group: "inStock",
      value: "inStock",
      label: "In stock",
    });
  }

  if (isPriceFiltered) {
    chips.push({
      id: "price",
      group: "price",
      value: "price",
      label: `${priceFormatter.format(priceMin)} – ${priceFormatter.format(priceMax)}`,
    });
  }

  return chips;
}
