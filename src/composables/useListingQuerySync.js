/**
 * useListingQuerySync — keep search / filters / sort / page in the URL.
 *
 * Vue ideas:
 * - `useRoute` / `useRouter` — read & write `?q=&brand=&page=` query params
 * - `watch` — two-way sync (URL → state on load/back; state → URL on UI changes)
 * - `router.replace` — update the address bar without flooding browser history
 *
 * Example:
 *   /?q=phone&category=smartphones&brand=Apple&minPrice=50&maxPrice=200&sort=price-asc&page=2
 */
import { watch, nextTick, unref } from "vue";
import { useRoute, useRouter } from "vue-router";

/**
 * @param {unknown} value
 * @returns {string[]}
 */
function parseList(value) {
  if (value == null || value === "") return [];
  const raw = Array.isArray(value) ? value.join(",") : String(value);
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

/**
 * @param {unknown} value
 * @returns {number[]}
 */
function parseNumbers(value) {
  return parseList(value)
    .map((part) => Number(part))
    .filter((n) => Number.isFinite(n));
}

/**
 * @param {unknown} value
 * @returns {null | 'asc' | 'desc'}
 */
function parseSort(value) {
  const raw = String(value ?? "").toLowerCase();
  if (raw === "asc" || raw === "price-asc") return "asc";
  if (raw === "desc" || raw === "price-desc") return "desc";
  return null;
}

/**
 * @param {null | 'asc' | 'desc'} sort
 * @returns {string | undefined}
 */
function serializeSort(sort) {
  if (sort === "asc") return "price-asc";
  if (sort === "desc") return "price-desc";
  return undefined;
}

/**
 * @param {Record<string, unknown>} a
 * @param {Record<string, unknown>} b
 */
function queriesMatch(a, b) {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    if (String(a[key] ?? "") !== String(b[key] ?? "")) return false;
  }
  return true;
}

/**
 * @param {object} options
 * @param {import('vue').Ref<string>} options.appliedQuery
 * @param {(next: string) => void} options.hydrateQuery
 * @param {object} options.filters — reactive filter selections from useProductFilters
 * @param {import('vue').Ref<{ min: number, max: number }> | { min: number, max: number }} options.priceBounds
 * @param {import('vue').Ref<boolean> | boolean} options.isPriceFiltered
 * @param {import('vue').Ref<number>} options.page
 * @param {(n: number) => void} options.goToPage
 */
export function useListingQuerySync(options) {
  const {
    appliedQuery,
    hydrateQuery,
    filters,
    priceBounds,
    isPriceFiltered,
    page,
    goToPage,
  } = options;

  const route = useRoute();
  const router = useRouter();

  /** Skip state→URL while applying URL→state (avoids feedback loops). */
  let syncingFromUrl = false;

  function listingStateToQuery() {
    /** @type {Record<string, string>} */
    const q = {};

    const search = String(appliedQuery.value ?? "").trim();
    if (search) q.q = search;

    if (filters.categories.length > 0) {
      q.category = filters.categories[0];
    }
    if (filters.brands.length > 0) {
      q.brand = filters.brands.join(",");
    }
    if (filters.colors.length > 0) {
      q.color = filters.colors.join(",");
    }
    if (filters.ratings.length > 0) {
      q.rating = filters.ratings.join(",");
    }
    if (filters.discounts.length > 0) {
      q.discount = filters.discounts.join(",");
    }

    if (unref(isPriceFiltered)) {
      q.minPrice = String(filters.priceMin);
      q.maxPrice = String(filters.priceMax);
    }

    const sort = serializeSort(filters.priceSort);
    if (sort) q.sort = sort;

    if (page.value > 1) {
      q.page = String(page.value);
    }

    return q;
  }

  /**
   * @param {import('vue-router').LocationQuery} routeQuery
   */
  async function applyQueryToState(routeQuery) {
    syncingFromUrl = true;

    const search = routeQuery.q != null ? String(routeQuery.q) : "";
    hydrateQuery(search);

    filters.categories = parseList(routeQuery.category).slice(0, 1);
    filters.brands = parseList(routeQuery.brand);
    filters.colors = parseList(routeQuery.color);
    filters.ratings = parseNumbers(routeQuery.rating);
    filters.discounts = parseNumbers(routeQuery.discount);
    filters.priceSort = parseSort(routeQuery.sort);

    const bounds = unref(priceBounds);
    const minP = Number(routeQuery.minPrice);
    const maxP = Number(routeQuery.maxPrice);

    if (Number.isFinite(minP) && Number.isFinite(maxP)) {
      if (bounds.max > 0) {
        filters.priceMin = Math.min(Math.max(minP, bounds.min), bounds.max);
        filters.priceMax = Math.min(Math.max(maxP, bounds.min), bounds.max);
        if (filters.priceMin > filters.priceMax) {
          filters.priceMin = bounds.min;
          filters.priceMax = bounds.max;
        }
      } else {
        // Catalog not loaded yet — store raw values; bounds watch will clamp.
        filters.priceMin = minP;
        filters.priceMax = maxP;
      }
    } else if (bounds.max > 0) {
      filters.priceMin = bounds.min;
      filters.priceMax = bounds.max;
    }

    const pageNum = Number(routeQuery.page);

    // Let usePagination’s “filters changed → page 1” watch run first, then restore page.
    await nextTick();
    if (Number.isFinite(pageNum) && pageNum >= 1) {
      goToPage(pageNum);
    } else {
      goToPage(1);
    }
    await nextTick();
    syncingFromUrl = false;
  }

  // URL → state (initial load, back/forward, shared links)
  watch(
    () => route.query,
    (routeQuery) => {
      if (syncingFromUrl) return;
      if (queriesMatch(listingStateToQuery(), routeQuery)) return;
      applyQueryToState(routeQuery);
    },
    { immediate: true },
  );

  // State → URL (search after debounce, filter toggles, pagination)
  watch(
    () => JSON.stringify(listingStateToQuery()),
    () => {
      if (syncingFromUrl) return;
      const nextQuery = listingStateToQuery();
      if (queriesMatch(nextQuery, route.query)) return;
      router.replace({ query: nextQuery });
    },
  );

  // When catalog price bounds arrive, clamp any URL prices that were applied early.
  watch(
    () => {
      const bounds = unref(priceBounds);
      return `${bounds.min}:${bounds.max}`;
    },
    () => {
      const bounds = unref(priceBounds);
      if (bounds.max <= 0) return;
      if (!route.query.minPrice && !route.query.maxPrice) return;

      const minP = Number(route.query.minPrice);
      const maxP = Number(route.query.maxPrice);
      if (!Number.isFinite(minP) || !Number.isFinite(maxP)) return;

      const nextMin = Math.min(Math.max(minP, bounds.min), bounds.max);
      const nextMax = Math.min(Math.max(maxP, bounds.min), bounds.max);
      if (filters.priceMin !== nextMin || filters.priceMax !== nextMax) {
        filters.priceMin = nextMin;
        filters.priceMax = nextMax;
      }
    },
  );
}
