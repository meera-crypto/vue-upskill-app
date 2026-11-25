/**
 * useProducts — loads the full catalog once, then searches locally.
 *
 * Why load everything?
 * Filters (category, brand, price, …) need the full set so checkbox lists and
 * the price slider stay stable. DummyJSON is small (~194 products), so
 * client-side Search → Filter matches the requirements doc.
 *
 * Catalog, search query, loading, and error live at module scope (like useCart):
 * App Header and every page share one fetch and one search box.
 *
 * Search UX:
 * - `query` updates as the user types (input only).
 * - `appliedQuery` updates on Enter / clear / URL hydrate (listing results).
 * - At least `SEARCH_MIN_LENGTH` characters are required to match products;
 *   shorter submitted queries yield an empty result set + empty-state copy.
 *
 * Vue ideas used here:
 * - `ref` — single reactive values (catalog, loading, query)
 * - `computed` — derived list that updates when catalog or appliedQuery changes
 */
import { ref, computed, onMounted } from "vue";
import type { Ref } from "vue";
import type { Product } from "@/types/product";
import { fetchCatalog } from "@/services/productService";
import { productMatchesSearch } from "@/utils/productSearch";

/** Minimum characters before a submitted search can match products. */
export const SEARCH_MIN_LENGTH = 3;

/** Shared across all useProducts() callers. */
const catalog: Ref<Product[]> = ref<Product[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

/** Bound to the header input (updates on every keystroke). */
const query = ref("");
/** Query used for listing results (Enter / clear / URL hydrate). */
const appliedQuery = ref("");

let controller: AbortController | null = null;
let loadPromise: Promise<void> | null = null;

async function load(): Promise<void> {
  if (loadPromise) return loadPromise;

  controller?.abort();
  const activeController = new AbortController();
  controller = activeController;

  loading.value = true;
  error.value = null;

  loadPromise = (async () => {
    try {
      const result = await fetchCatalog({ signal: activeController.signal });
      catalog.value = result.products as Product[];
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;

      catalog.value = [];
      error.value =
        err instanceof Error
          ? err.message
          : "Something went wrong loading products.";
      /* Allow a later retry() after a real failure. */
      loadPromise = null;
    } finally {
      loading.value = false;
    }
  })();

  return loadPromise;
}

/**
 * Products after search only (before sidebar filters).
 * computed() recalculates whenever catalog or appliedQuery changes.
 */
const products = computed<Product[]>(() => {
  const trimmed = appliedQuery.value.trim();
  if (!trimmed) return catalog.value;
  if (trimmed.length < SEARCH_MIN_LENGTH) return [];

  const needle = trimmed.toLowerCase();
  return catalog.value.filter((product) =>
    productMatchesSearch(product, needle),
  );
});

function retry() {
  loadPromise = null;
  return load();
}

/**
 * Update the input only — does not change listing results until applySearch().
 */
function setQuery(next: string): void {
  query.value = String(next ?? "");
}

/**
 * Commit the search to the listing (Enter / View all).
 * @param next defaults to the current input value
 */
function applySearch(next: string = query.value): void {
  const value = String(next ?? "");
  query.value = value;
  appliedQuery.value = value;
}

/**
 * Apply a search string immediately (no typing delay).
 * Used when restoring state from the URL so refresh/back match right away.
 */
function hydrateQuery(next: string): void {
  const value = String(next ?? "");
  query.value = value;
  appliedQuery.value = value;
}

/** Clear search and show the catalog. */
function clearSearch() {
  query.value = "";
  appliedQuery.value = "";
}

export interface UseProductsOptions {
  /** Load the catalog on mount (default true). */
  immediate?: boolean;
}

export function useProducts(options: UseProductsOptions = {}) {
  const { immediate = true } = options;

  if (immediate) {
    onMounted(() => {
      load();
    });
  }

  return {
    /** Full catalog — used to build stable filter option lists. */
    catalog,
    /** Search-filtered products — feed into useProductFilters. */
    products,
    loading,
    error,
    query,
    /** Submitted value used for filtering (also written to the URL). */
    appliedQuery,
    setQuery,
    applySearch,
    hydrateQuery,
    clearSearch,
    load,
    retry,
  };
}
