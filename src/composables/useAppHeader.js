/**
 * useAppHeader — wires the shared App.vue Header for every route.
 *
 * Vue idea: Header lives once in App.vue (stays mounted across navigations).
 * This composable supplies search + category props:
 * - Search uses the shared useProducts() query (same box everywhere).
 * - On the listing route, category toggles update the URL; useListingQuerySync
 *   applies them to filters.
 * - On cart / favorites, search or category navigates home with ?q= / ?category=.
 */
import { computed, watch, ref, onMounted, nextTick } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useProducts } from "@/composables/useProducts.js";
import { formatCategoryLabel } from "@/services/productService.js";

export function useAppHeader() {
  const route = useRoute();
  const router = useRouter();
  const { catalog, query, appliedQuery, setQuery, clearSearch } = useProducts();

  /**
   * Skip the first appliedQuery watch so the initial App mount doesn’t
   * navigate away from cart/favorites.
   */
  const ready = ref(false);

  onMounted(async () => {
    await nextTick();
    ready.value = true;
  });

  const isListing = computed(() => route.name === "products");

  const categories = computed(() => {
    const map = new Map();
    for (const product of catalog.value) {
      if (!product?.category) continue;
      map.set(
        product.category,
        product.categoryLabel || formatCategoryLabel(product.category),
      );
    }
    return [...map.entries()]
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  });

  /** Listing selection comes from the URL; other pages show none selected. */
  const selectedCategories = computed(() => {
    if (!isListing.value) return [];
    const raw = route.query.category;
    if (raw == null || raw === "") return [];
    const value = Array.isArray(raw) ? raw[0] : String(raw);
    return value ? [value] : [];
  });

  function goToListing(queryParams = {}) {
    router.push({ name: "products", query: queryParams });
  }

  /** From cart/favorites: after debounce, open listing with the search. */
  watch(appliedQuery, (value) => {
    if (!ready.value || isListing.value) return;
    const trimmed = String(value ?? "").trim();
    goToListing(trimmed ? { q: trimmed } : {});
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
   * Header search is site-wide: as soon as the user types a query, drop the
   * selected category so matches outside that category still appear.
   * Other filters (brand, price, …) and sort stay. Clearing search does not
   * restore the previous category.
   *
   * @param {string} next
   */
  function setQueryFromHeader(next) {
    const trimmed = String(next ?? "").trim();
    if (trimmed && isListing.value) {
      const raw = route.query.category;
      const hasCategory = raw != null && raw !== "";
      if (hasCategory) {
        /** @type {Record<string, string | string[]>} */
        const nextQuery = { ...route.query };
        delete nextQuery.category;
        delete nextQuery.page;
        router.replace({ query: nextQuery });
      }
    }
    setQuery(next);
  }

  /**
   * @param {string} value category slug
   */
  function toggleCategory(value) {
    if (!value) return;

    if (!isListing.value) {
      goToListing({ category: value });
      return;
    }

    const current =
      selectedCategories.value.length === 1
        ? selectedCategories.value[0]
        : null;

    /** @type {Record<string, string | string[]>} */
    const nextQuery = { ...route.query };
    delete nextQuery.page;

    if (current === value) {
      delete nextQuery.category;
    } else {
      nextQuery.category = value;
    }

    router.replace({ query: nextQuery });
  }

  return {
    searchQuery: query,
    setQuery: setQueryFromHeader,
    clearSearch: onClearSearch,
    categories,
    selectedCategories,
    toggleCategory,
  };
}
