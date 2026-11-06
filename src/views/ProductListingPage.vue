<script setup>
/**
 * Product listing page — wires search → filters → pagination and syncs them to the URL.
 *
 * Discovery pipeline (requirements):
 *   useProducts (search) → useProductFilters → usePagination → ProductList
 *   useListingQuerySync keeps that state shareable via ?q=&brand=&page=…
 *
 * Vue concepts: composables return reactive state; this view wires them together
 * and passes data down as props / listens for emits up.
 */
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import Hero from "@/components/Hero.vue";
import ProductList from "@/components/ProductList.vue";
import RecentlyViewedProducts from "@/components/RecentlyViewedProducts.vue";
import { useProducts } from "@/composables/useProducts.js";
import { useProductFilters } from "@/composables/useProductFilters.js";
import { usePagination } from "@/composables/usePagination.js";
import { useListingQuerySync } from "@/composables/useListingQuerySync.js";
import { useToast } from "@/composables/useToast.js";
import { useCart } from "@/composables/useCart.js";
import { useFavorites } from "@/composables/useFavorites.js";
import { mediaQueries } from "@/constants/breakpoints.js";
import { productDetailsTo } from "@/utils/productRoutes.js";

const {
  catalog,
  products: searchedProducts,
  loading,
  error,
  query,
  appliedQuery,
  hydrateQuery,
  clearSearch,
  retry,
} = useProducts();

const {
  filters,
  filterOptions,
  priceBounds,
  filteredProducts,
  activeChips,
  hasActiveFilters,
  isPriceFiltered,
  toggleBrand,
  toggleColor,
  toggleRating,
  toggleDiscount,
  toggleInStock,
  setSort,
  setPriceRange,
  removeChip,
  clearFilters,
} = useProductFilters(searchedProducts, catalog);

const {
  page,
  total,
  totalPages,
  paginatedItems,
  range,
  pageItems,
  canPrev,
  canNext,
  goToPage,
  next,
  prev,
} = usePagination(filteredProducts, { pageSize: 12 });

useListingQuerySync({
  appliedQuery,
  hydrateQuery,
  filters,
  priceBounds,
  isPriceFiltered,
  page,
  goToPage,
});

/**
 * Below md (<768px): no pagination — show the full filtered list.
 * md+: keep 12-per-page pagination.
 *
 * Uses shared `mediaQueries.untilMd` so JS matches CSS breakpoints.
 * A `ref` + matchMedia so Vue can change *data*, not just CSS layout.
 */
const isMobile = ref(false);
/** @type {MediaQueryList | null} */
let mobileMediaQuery = null;

function syncIsMobile() {
  isMobile.value = mobileMediaQuery?.matches ?? false;
}

onMounted(() => {
  mobileMediaQuery = window.matchMedia(mediaQueries.untilMd);
  syncIsMobile();
  mobileMediaQuery.addEventListener("change", syncIsMobile);
});

onUnmounted(() => {
  mobileMediaQuery?.removeEventListener("change", syncIsMobile);
});

const displayedProducts = computed(() =>
  isMobile.value ? filteredProducts.value : paginatedItems.value,
);

const showPagination = computed(() => !isMobile.value);

/** After a page change, bring the listing back into view (modern UX). */
watch(page, async (nextPage, prevPage) => {
  if (isMobile.value) return;
  if (prevPage == null || nextPage === prevPage) return;
  await nextTick();
  document.getElementById("products")?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
});

/**
 * Cart + favorites live in shared composables (module-scoped refs), so the
 * header badges and /cart + /favorites pages stay in sync with this listing.
 */
const router = useRouter();
const toast = useToast();
const { cartQuantities, addToCart: putInCart } = useCart();
const { favoriteIds, toggleFavorite: toggleFavoriteId } = useFavorites();

/** Friendly label for toast copy (title with a safe fallback). */
function productLabel(product) {
  return product?.title?.trim() || "Item";
}

/** First add: quantity 1 when in stock. Qty +/- is on the cart page. */
function addToCart(product) {
  if (putInCart(product)) {
    toast.success(`${productLabel(product)} added to cart`);
  }
}

function goToCart() {
  router.push({ name: "cart" });
}

/** Out-of-stock “See All Options” → product details (`/product?id=&slug=`). */
function seeAllOptions(product) {
  if (!product?.id) return;
  router.push(productDetailsTo(product));
}

function toggleFavorite(product) {
  const result = toggleFavoriteId(product);
  if (result === "added") {
    toast.favorite(`${productLabel(product)} added to favorites`);
  } else if (result === "removed") {
    toast.favorite(`${productLabel(product)} removed from favorites`);
  }
}

function onPriceMin(value) {
  setPriceRange(value, filters.priceMax);
}

function onPriceMax(value) {
  setPriceRange(filters.priceMin, value);
}
</script>

<template>
  <!-- Header is in App.vue — shared across listing, cart, and favorites. -->
  <Hero />

  <main>
    <ProductList
      :products="displayedProducts"
      :total="total"
      :range="range"
      :search-query="query"
      :loading="loading"
      :error="error"
      :cart="cartQuantities"
      :favorites="favoriteIds"
      :filters="filters"
      :filter-options="filterOptions"
      :price-bounds="priceBounds"
      :active-chips="activeChips"
      :has-active-filters="hasActiveFilters"
      :show-pagination="showPagination"
      :page="page"
      :total-pages="totalPages"
      :page-items="pageItems"
      :can-prev="canPrev"
      :can-next="canNext"
      @retry="retry"
      @clear-search="clearSearch"
      @add-to-cart="addToCart"
      @go-to-cart="goToCart"
      @toggle-favorite="toggleFavorite"
      @see-all-options="seeAllOptions"
      @toggle-brand="toggleBrand"
      @toggle-color="toggleColor"
      @toggle-rating="toggleRating"
      @toggle-discount="toggleDiscount"
      @toggle-in-stock="toggleInStock"
      @update:sort="setSort"
      @update:price-min="onPriceMin"
      @update:price-max="onPriceMax"
      @remove-chip="removeChip"
      @clear-filters="clearFilters"
      @page-prev="prev"
      @page-next="next"
      @go-to-page="goToPage"
    />

    <!-- Optional: products opened on the details page (localStorage). -->
    <div class="container">
      <RecentlyViewedProducts />
    </div>
  </main>
</template>
