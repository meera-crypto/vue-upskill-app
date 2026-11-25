/**
 * useListingQuerySync — keep search / filters / sort / page / category in the URL.
 *
 * Vue ideas:
 * - `useRoute` / `useRouter` — read & write path + `?q=&brand=&page=` query
 * - Category is a path segment: `/gadgets` (not `?category=` or `/category/…`)
 * - `watch` — two-way sync (URL → state on load/back; state → URL on UI changes)
 * - `router.replace` — update the address bar without flooding browser history
 *
 * Example:
 *   /gadgets?q=phone&brand=Apple&size=M&minPrice=50&maxPrice=200&sort=price-asc&page=2
 */
import { watch, nextTick, unref } from "vue";
import type { Ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import type { RouteLocationNormalizedLoaded } from "vue-router";
import type { PriceBounds, ProductFilters, SortValue } from "@/composables/useProductFilters";
import {
  categoryFromRoute,
  isListingRouteName,
  listingTo,
} from "@/utils/listingRoutes";
import { resolveStorefrontCategory } from "@/utils/categoryGroups";

function parseList(value: unknown): string[] {
  if (value == null || value === "") return [];
  const raw = Array.isArray(value) ? value.join(",") : String(value);
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function parseNumbers(value: unknown): number[] {
  return parseList(value)
    .map((part) => Number(part))
    .filter((n) => Number.isFinite(n));
}

const SORT_VALUES = new Set([
  "featured",
  "best-selling",
  "newest",
  "rating",
  "discount-desc",
  "price-asc",
  "price-desc",
]);

function parseSort(value: unknown): SortValue {
  const raw = String(value ?? "").toLowerCase();
  // Older links used short price keys before the full sort dropdown existed.
  if (raw === "asc") return "price-asc";
  if (raw === "desc") return "price-desc";
  if (SORT_VALUES.has(raw)) {
    return raw as SortValue;
  }
  return "featured";
}

function serializeSort(sort: string): string | undefined {
  if (!sort || sort === "featured") return undefined;
  if (SORT_VALUES.has(sort)) return sort;
  return undefined;
}

function queriesMatch(
  a: Record<string, unknown>,
  b: Record<string, unknown>,
): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    if (String(a[key] ?? "") !== String(b[key] ?? "")) return false;
  }
  return true;
}

/** Shape returned by `listingTo()` from `@/utils/listingRoutes`. */
interface ListingLocation {
  name: string;
  params?: { category?: string };
  query: Record<string, string>;
}

function locationsMatch(
  location: ListingLocation,
  route: RouteLocationNormalizedLoaded,
): boolean {
  if (location.name !== route.name) return false;

  const expectedCategory = resolveStorefrontCategory(
    location.params?.category ?? "",
  );
  const routeCategory =
    route.name === "products-category"
      ? resolveStorefrontCategory(
          Array.isArray(route.params.category)
            ? route.params.category[0]
            : (route.params.category ?? ""),
        )
      : "";
  if (expectedCategory !== routeCategory) return false;

  return queriesMatch(location.query, route.query);
}

export interface ListingQuerySyncOptions {
  appliedQuery: Ref<string>;
  hydrateQuery: (next: string) => void;
  /** Reactive filter selections from useProductFilters. */
  filters: ProductFilters;
  priceBounds: Ref<PriceBounds> | PriceBounds;
  isPriceFiltered: Ref<boolean> | boolean;
  page: Ref<number>;
  goToPage: (n: number) => void;
  /** Filtered result count (re-apply page after hydrate). */
  total?: Ref<number> | number;
}

export function useListingQuerySync(options: ListingQuerySyncOptions): void {
  const {
    appliedQuery,
    hydrateQuery,
    filters,
    priceBounds,
    isPriceFiltered,
    page,
    goToPage,
    total,
  } = options;

  const route = useRoute();
  const router = useRouter();

  /** Skip state→URL while applying URL→state (avoids feedback loops). */
  let syncingFromUrl = false;

  function listingStateToQuery(): Record<string, string> {
    const q: Record<string, string> = {};

    const search = String(appliedQuery.value ?? "").trim();
    if (search) q.q = search;

    // Category is path-only (`/:category`) — never write `?category=`.

    if (filters.brands.length > 0) {
      q.brand = filters.brands.join(",");
    }
    if (filters.colors.length > 0) {
      q.color = filters.colors.join(",");
    }
    if (filters.sizes.length > 0) {
      q.size = filters.sizes.join(",");
    }
    if (filters.ratings.length > 0) {
      q.rating = filters.ratings.join(",");
    }
    if (filters.discounts.length > 0) {
      q.discount = filters.discounts.join(",");
    }

    if (filters.inStockOnly) {
      q.inStock = "1";
    }

    if (unref(isPriceFiltered)) {
      q.minPrice = String(filters.priceMin);
      q.maxPrice = String(filters.priceMax);
    }

    const sort = serializeSort(filters.sort);
    if (sort) q.sort = sort;

    if (page.value > 1) {
      q.page = String(page.value);
    }

    return q;
  }

  function listingStateToLocation() {
    return listingTo({
      category: filters.categories[0] ?? "",
      query: listingStateToQuery(),
    });
  }

  async function applyRouteToState(
    current: RouteLocationNormalizedLoaded,
  ): Promise<void> {
    syncingFromUrl = true;

    const routeQuery = current.query;
    const search = routeQuery.q != null ? String(routeQuery.q) : "";
    hydrateQuery(search);

    const category = categoryFromRoute(current);
    filters.categories = category ? [category] : [];
    filters.brands = parseList(routeQuery.brand);
    filters.colors = parseList(routeQuery.color);
    filters.sizes = parseList(routeQuery.size);
    filters.ratings = parseNumbers(routeQuery.rating);
    filters.discounts = parseNumbers(routeQuery.discount);
    filters.inStockOnly =
      routeQuery.inStock === "1" ||
      routeQuery.inStock === "true" ||
      routeQuery.inStock === "yes";
    filters.sort = parseSort(routeQuery.sort);

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
    // While the catalog is empty, goToPage keeps the bookmark page (no clamp-to-1).
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
    () => ({
      name: route.name,
      category: categoryFromRoute(route),
      query: route.query,
    }),
    () => {
      if (!isListingRouteName(route.name)) return;
      if (syncingFromUrl) return;
      if (locationsMatch(listingStateToLocation(), route)) return;
      applyRouteToState(route);
    },
    { immediate: true, deep: true },
  );

  // State → URL (search after debounce, filter toggles, pagination, category)
  watch(
    () => JSON.stringify(listingStateToLocation()),
    () => {
      if (!isListingRouteName(route.name)) return;
      if (syncingFromUrl) return;
      const next = listingStateToLocation();
      if (locationsMatch(next, route)) return;
      router.replace(next);
    },
  );

  // When catalog price bounds arrive, clamp any URL prices that were applied early.
  watch(
    () => {
      const bounds = unref(priceBounds);
      return `${bounds.min}:${bounds.max}`;
    },
    () => {
      if (!isListingRouteName(route.name)) return;
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

  /**
   * Hard refresh with `?page=2`: first URL→state often runs while total is 0.
   * After products arrive (0 → N), re-apply the URL page so goToPage can clamp
   * against the real totalPages. syncingFromUrl avoids a state→URL feedback loop.
   */
  if (total != null) {
    watch(
      () => unref(total),
      async (count: number, prevCount: number | undefined) => {
        if (!isListingRouteName(route.name)) return;
        if (prevCount !== 0 || count === 0) return;

        const pageNum = Number(route.query.page);
        if (!Number.isFinite(pageNum) || pageNum < 1) return;
        if (page.value === pageNum) return;

        syncingFromUrl = true;
        goToPage(pageNum);
        await nextTick();
        syncingFromUrl = false;
      },
    );
  }
}
