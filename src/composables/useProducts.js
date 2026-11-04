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
 * Vue ideas used here:
 * - `ref` — single reactive values (catalog, loading, query)
 * - `computed` — derived list that updates when catalog or query changes
 * - debounce — wait ~300 ms after typing before applying search
 */
import { ref, computed, onMounted } from "vue";
import { fetchCatalog } from "@/services/productService.js";

/** Shared across all useProducts() callers. */
const catalog = ref([]);
const loading = ref(false);
const error = ref(null);

/** Bound to the header input (updates on every keystroke). */
const query = ref("");
/** Query actually used for filtering (updates after debounce). */
const appliedQuery = ref("");

/** @type {AbortController | null} */
let controller = null;
/** @type {Promise<void> | null} */
let loadPromise = null;
/** @type {ReturnType<typeof setTimeout> | null} */
let debounceTimer = null;

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
  const trimmed = appliedQuery.value.trim().toLowerCase();
  if (!trimmed) return catalog.value;

  return catalog.value.filter((product) => {
    const title = String(product.title ?? "").toLowerCase();
    const brand = String(product.brand ?? "").toLowerCase();
    return title.includes(trimmed) || brand.includes(trimmed);
  });
});

function retry() {
  loadPromise = null;
  return load();
}

/**
 * Update the input immediately; wait `debounceMs` before filtering.
 * @param {string} next
 * @param {number} [debounceMs]
 */
function setQuery(next, debounceMs = 300) {
  query.value = next;

  if (debounceTimer != null) {
    clearTimeout(debounceTimer);
  }

  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    appliedQuery.value = query.value;
  }, debounceMs);
}

/**
 * Apply a search string immediately (no debounce).
 * Used when restoring state from the URL so refresh/back match right away.
 * @param {string} next
 */
function hydrateQuery(next) {
  if (debounceTimer != null) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  const value = String(next ?? "");
  query.value = value;
  appliedQuery.value = value;
}

/** Clear search and show the catalog without waiting for debounce. */
function clearSearch() {
  if (debounceTimer != null) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  query.value = "";
  appliedQuery.value = "";
}

/**
 * @param {{ immediate?: boolean, debounceMs?: number }} [options]
 */
export function useProducts(options = {}) {
  const { immediate = true, debounceMs = 300 } = options;

  /**
   * Wrap setQuery so this caller’s debounceMs is used (App + listing both
   * default to 300).
   * @param {string} next
   */
  function setQueryWithOptions(next) {
    setQuery(next, debounceMs);
  }

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
    /** Debounced value actually used for filtering (also written to the URL). */
    appliedQuery,
    setQuery: setQueryWithOptions,
    hydrateQuery,
    clearSearch,
    load,
    retry,
  };
}
