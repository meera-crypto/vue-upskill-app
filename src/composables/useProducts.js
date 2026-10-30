/**
 * useProducts — loads the full catalog once, then searches locally.
 *
 * Why load everything?
 * Filters (category, brand, price, …) need the full set so checkbox lists and
 * the price slider stay stable. DummyJSON is small (~194 products), so
 * client-side Search → Filter matches the requirements doc.
 *
 * Vue ideas used here:
 * - `ref` — single reactive values (catalog, loading, query)
 * - `computed` — derived list that updates when catalog or query changes
 * - debounce — wait ~300 ms after typing before applying search (same feel
 *   as the old API-backed search, without extra network calls)
 */
import { ref, computed, onMounted, onUnmounted } from "vue";
import { fetchCatalog } from "@/services/productService.js";

/**
 * @param {{ immediate?: boolean, debounceMs?: number }} [options]
 */
export function useProducts(options = {}) {
  const { immediate = true, debounceMs = 300 } = options;

  /** Full mapped catalog from DummyJSON. */
  const catalog = ref([]);
  const loading = ref(false);
  const error = ref(null);
  /** Bound to the header input (updates on every keystroke). */
  const query = ref("");
  /** Query actually used for filtering (updates after debounce). */
  const appliedQuery = ref("");

  /** @type {AbortController | null} */
  let controller = null;
  /** @type {ReturnType<typeof setTimeout> | null} */
  let debounceTimer = null;

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

  async function load() {
    controller?.abort();
    controller = new AbortController();

    loading.value = true;
    error.value = null;

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
    } finally {
      loading.value = false;
    }
  }

  function retry() {
    return load();
  }

  /**
   * Update the input immediately; wait `debounceMs` before filtering.
   * @param {string} next
   */
  function setQuery(next) {
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

  if (immediate) {
    onMounted(() => {
      load();
    });
  }

  onUnmounted(() => {
    if (debounceTimer != null) {
      clearTimeout(debounceTimer);
    }
    controller?.abort();
  });

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
    setQuery,
    hydrateQuery,
    clearSearch,
    load,
    retry,
  };
}
