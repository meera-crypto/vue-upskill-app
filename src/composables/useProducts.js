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
import { fetchCatalog } from "@/services/productService.js";
import { productMatchesSearch } from "@/utils/productSearch.js";

/** Minimum characters before a submitted search can match products. */
export const SEARCH_MIN_LENGTH = 3;

/** Shared across all useProducts() callers. */
const catalog = ref([]);
const loading = ref(false);
const error = ref(null);

/** Bound to the header input (updates on every keystroke). */
const query = ref("");
/** Query used for listing results (Enter / clear / URL hydrate). */
const appliedQuery = ref("");

/** @type {AbortController | null} */
let controller = null;
/** @type {Promise<void> | null} */
let loadPromise = null;

async function load() {
  if (loadPromise) return loadPromise;

  controller?.abort();
  controller = new AbortController();

  loading.value = true;
  error.value = null;

  loadPromise = (async () => {
    try {
      const result = await fetchCatalog({ signal: controller.signal });
      catalog.value = result.products;
    } catch (err) {
      if (err?.name === "AbortError") return;

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
const products = computed(() => {
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
 * @param {string} next
 */
function setQuery(next) {
  query.value = String(next ?? "");
}

/**
 * Commit the search to the listing (Enter / View all).
 * @param {string} [next] — defaults to the current input value
 */
function applySearch(next = query.value) {
  const value = String(next ?? "");
  query.value = value;
  appliedQuery.value = value;
}

/**
 * Apply a search string immediately (no typing delay).
 * Used when restoring state from the URL so refresh/back match right away.
 * @param {string} next
 */
function hydrateQuery(next) {
  const value = String(next ?? "");
  query.value = value;
  appliedQuery.value = value;
}

/** Clear search and show the catalog. */
function clearSearch() {
  query.value = "";
  appliedQuery.value = "";
}

/**
 * @param {{ immediate?: boolean }} [options]
 */
export function useProducts(options = {}) {
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
