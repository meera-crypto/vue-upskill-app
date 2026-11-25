/**
 * useSearchSuggestions — product suggestions for the header search dropdown.
 *
 * Matches the typed search text against product title, brand, tags, and
 * category (same rules as listing search). When a category chip is selected,
 * suggestions are scoped to that category (AND — same as the listing).
 * Matched search text is highlighted in the title; brand / tag / category
 * meta explains why a non-title match appeared.
 *
 * Vue idea: `computed` recalculates whenever the query, category, or catalog changes.
 */
import { computed, toValue } from "vue";
import type { MaybeRefOrGetter } from "vue";
import type { Product } from "@/types/product";
import {
  SEARCH_MIN_LENGTH,
  useProducts,
} from "@/composables/useProducts";
import {
  matchingSearchMeta,
  productMatchesSearch,
} from "@/utils/productSearch";

const MAX_PRODUCTS = 8;

/** One slice of a label; `match` is true for the highlighted part. */
export interface HighlightPart {
  text: string;
  match: boolean;
}

/** One row in the header search dropdown. */
export interface Suggestion {
  id: string;
  label: string;
  matchedMeta: string;
  product: Product;
}

export interface SearchSuggestionsOptions {
  maxProducts?: number;
  categorySource?: MaybeRefOrGetter<string | string[] | null | undefined>;
}

/**
 * Split a label so the matching search text can be highlighted in the UI.
 */
export function highlightSearchText(
  label: string,
  query: string,
): HighlightPart[] {
  const text = String(label ?? "");
  const q = String(query ?? "").trim();
  if (!q || !text) return [{ text, match: false }];

  const lower = text.toLowerCase();
  const needle = q.toLowerCase();
  const index = lower.indexOf(needle);
  if (index < 0) return [{ text, match: false }];

  const parts: HighlightPart[] = [];
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

export function useSearchSuggestions(
  querySource: MaybeRefOrGetter<string>,
  options: SearchSuggestionsOptions = {},
) {
  const maxProducts = options.maxProducts ?? MAX_PRODUCTS;
  const categorySource = options.categorySource;
  const { catalog } = useProducts({ immediate: false });

  const activeCategory = computed(() => {
    if (categorySource == null) return "";
    const raw = toValue(categorySource);
    if (Array.isArray(raw)) return String(raw[0] ?? "").trim();
    return String(raw ?? "").trim();
  });

  const suggestions = computed<Suggestion[]>(() => {
    const raw = String(toValue(querySource) ?? "").trim();
    const q = raw.toLowerCase();

    const items: Suggestion[] = [];
    // Same floor as listing search — avoid noisy dropdowns on 1–2 characters.
    if (q.length < SEARCH_MIN_LENGTH) return items;

    const category = activeCategory.value;

    for (const product of catalog.value) {
      // AND with selected category — same rule as the listing results.
      if (category && product?.category !== category) continue;
      if (!productMatchesSearch(product, q)) continue;

      const title = String(product?.title ?? "") || "Product";
      const matchedMeta = matchingSearchMeta(product, q);

      items.push({
        id: `product:${product.id}`,
        label: title,
        matchedMeta,
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
