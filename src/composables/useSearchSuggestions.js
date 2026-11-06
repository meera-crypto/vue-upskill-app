/**
 * useSearchSuggestions — product suggestions for the header search dropdown.
 *
 * Matches the typed search text against product title, brand, and tags
 * (same rules as listing search). Matched search text is highlighted in
 * the title when possible; otherwise the matching tag is shown as meta.
 *
 * Vue idea: `computed` recalculates whenever the query or catalog changes.
 */
import { computed, toValue } from "vue";
import { useProducts } from "@/composables/useProducts.js";
import {
  matchingProductTag,
  productMatchesSearch,
} from "@/services/productService.js";

const MAX_PRODUCTS = 8;

/**
 * Split a label so the matching search text can be highlighted in the UI.
 * @param {string} label
 * @param {string} query
 * @returns {{ text: string, match: boolean }[]}
 */
export function highlightSearchText(label, query) {
  const text = String(label ?? "");
  const q = String(query ?? "").trim();
  if (!q || !text) return [{ text, match: false }];

  const lower = text.toLowerCase();
  const needle = q.toLowerCase();
  const index = lower.indexOf(needle);
  if (index < 0) return [{ text, match: false }];

  /** @type {{ text: string, match: boolean }[]} */
  const parts = [];
  if (index > 0) {
    parts.push({ text: text.slice(0, index), match: false });
  }
  parts.push({
    text: text.slice(index, index + q.length),
    match: true,
  });
  if (index + q.length < text.length) {
    parts.push({ text: text.slice(index + q.length), match: false });
  }
  return parts;
}

/**
 * @param {import('vue').MaybeRefOrGetter<string>} querySource
 * @param {{ maxProducts?: number }} [options]
 */
export function useSearchSuggestions(querySource, options = {}) {
  const maxProducts = options.maxProducts ?? MAX_PRODUCTS;
  const { catalog } = useProducts({ immediate: false });

  /**
   * @typedef {{
   *   id: string,
   *   label: string,
   *   matchedTag: string,
   *   product: Record<string, unknown>
   * }} Suggestion
   */

  const suggestions = computed(() => {
    const raw = String(toValue(querySource) ?? "").trim();
    const q = raw.toLowerCase();

    /** @type {Suggestion[]} */
    const items = [];
    if (q.length < 1) return items;

    for (const product of catalog.value) {
      if (!productMatchesSearch(product, q)) continue;

      const title = String(product?.title ?? "") || "Product";
      const titleMatch = title.toLowerCase().includes(q);
      const matchedTag = titleMatch ? "" : matchingProductTag(product, q);

      items.push({
        id: `product:${product.id}`,
        label: title,
        matchedTag,
        product,
      });

      if (items.length >= maxProducts) break;
    }

    return items;
  });

  const hasSuggestions = computed(() => suggestions.value.length > 0);

  return {
    suggestions,
    hasSuggestions,
  };
}
