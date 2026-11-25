/**
 * useAppHeader — wires the shared App.vue Header for every route.
 *
 * Vue idea: Header lives once in App.vue (stays mounted across navigations).
 * This composable supplies search + category props:
 * - Search uses the shared useProducts() query (same box everywhere).
 * - On the listing route, category toggles update `/:category`
 *   (useListingQuerySync keeps other filters in the query string).
 * - On cart / favorites, search or category navigates to the listing path.
 * - Search and category combine with AND (chip kept). No overlap → empty state
 *   on the listing; the user clears search/category or picks another chip.
 */
import { computed, watch, ref, onMounted, nextTick } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useProducts } from "@/composables/useProducts";
import { formatCategoryLabel } from "@/utils/productModel";
import {
  categoryFromRoute,
  isListingRouteName,
  listingTo,
} from "@/utils/listingRoutes";

export function useAppHeader() {
  const route = useRoute();
  const router = useRouter();
  const {
    catalog,
    query,
    appliedQuery,
    setQuery,
    applySearch,
    clearSearch,
  } = useProducts();

  /**
   * Skip the first appliedQuery watch so the initial App mount doesn’t
   * navigate away from cart/favorites.
   */
  const ready = ref(false);

  onMounted(async () => {
    await nextTick();
    ready.value = true;
  });

  const isListing = computed(() => isListingRouteName(route.name));

  const categories = computed(() => {
    const map = new Map<string, string>();
    for (const product of catalog.value) {
      if (!product?.category) continue;
      map.set(
        product.category,
        product.categoryLabel || formatCategoryLabel(product.category),
      );
    }
    return [...map.entries()]
      .map(([value, label]) => ({ value, label }))
      // A–Z by display label (Beauty, Furniture, Gadgets, …).
      .sort((a, b) =>
        a.label.localeCompare(b.label, undefined, { sensitivity: "base" }),
      );
  });

  /** Listing selection comes from the URL path; other pages show none selected. */
  const selectedCategories = computed(() => {
    if (!isListing.value) return [];
    const value = categoryFromRoute(route);
    return value ? [value] : [];
  });

  function goToListing(
    options: { category?: string; query?: Record<string, string> } = {},
  ) {
    router.push(listingTo(options));
  }

  /** From cart/favorites: after Enter applies search, open the listing. */
  watch(appliedQuery, (value: string) => {
    if (!ready.value || isListing.value) return;
    const trimmed = String(value ?? "").trim();
    goToListing(trimmed ? { query: { q: trimmed } } : {});
  });

  function onClearSearch() {
    clearSearch();
    if (!isListing.value) {
      goToListing({});
      return;
    }
    /* Listing: useListingQuerySync drops `q` when appliedQuery clears. */
  }

  /**
   * Typing updates the input only. Listing results wait for Enter / submit.
   */
  function setQueryFromHeader(next: string) {
    setQuery(next);
  }

  /** Enter / View all — commit `query` → `appliedQuery` (listing + URL). */
  function applySearchFromHeader() {
    applySearch();
  }

  /** @param value category slug */
  function toggleCategory(value: string) {
    if (!value) return;

    if (!isListing.value) {
      goToListing({ category: value });
      return;
    }

    const current =
      selectedCategories.value.length === 1
        ? selectedCategories.value[0]
        : null;

    const nextQuery: Record<string, string> = {};
    for (const [key, raw] of Object.entries(route.query)) {
      if (key === "category" || key === "page") continue;
      if (raw == null || raw === "") continue;
      nextQuery[key] = Array.isArray(raw) ? String(raw[0] ?? "") : String(raw);
    }

    if (current === value) {
      goToListing({ query: nextQuery });
      return;
    }

    router.replace(listingTo({ category: value, query: nextQuery }));
  }

  return {
    searchQuery: query,
    setQuery: setQueryFromHeader,
    applySearch: applySearchFromHeader,
    clearSearch: onClearSearch,
    categories,
    selectedCategories,
    toggleCategory,
  };
}
