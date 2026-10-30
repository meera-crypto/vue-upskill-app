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
import { reactive, computed, watch, nextTick } from "vue";
import Header from "@/components/Header.vue";
import Hero from "@/components/Hero.vue";
import Footer from "@/components/Footer.vue";
import ProductList from "@/components/ProductList.vue";
import { useProducts } from "@/composables/useProducts.js";
import { useProductFilters } from "@/composables/useProductFilters.js";
import { usePagination } from "@/composables/usePagination.js";
import { useListingQuerySync } from "@/composables/useListingQuerySync.js";
import { useMediaQuery } from "@/composables/useMediaQuery.js";

const {
  catalog,
  products: searchedProducts,
  loading,
  error,
  query,
  appliedQuery,
  setQuery,
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
  toggleCategory,
  toggleBrand,
  toggleColor,
  toggleRating,
  toggleDiscount,
  togglePriceSort,
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
 * Mobile (&lt;768px): 2-column grid, no pagination — show the full filtered list.
 * Tablet/desktop: keep 12-per-page pagination.
 */
const isMobile = useMediaQuery("(max-width: 767px)");

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

const state = reactive({
  /** productId → how many of that product are in the cart */
  cart: {},
  /** Product ids marked as favorite (unique). */
  favoriteIds: [],
});

/** Total items in cart (sum of quantities). */
const cartCount = computed(() =>
  Object.values(state.cart).reduce((sum, qty) => sum + qty, 0),
);

/** First add: set quantity to 1 (only when in stock). */
function addToCart(product) {
  if (!product?.stock) return;
  state.cart[product.id] = 1;
}

function increaseCart(product) {
  if (!product?.stock) return;
  const current = state.cart[product.id] ?? 0;
  if (current >= product.stock) return;
  state.cart[product.id] = current + 1;
}

/** Decrease; remove the product when quantity hits 0. */
function decreaseCart(product) {
  const nextQty = (state.cart[product.id] ?? 0) - 1;
  if (nextQty <= 0) {
    delete state.cart[product.id];
  } else {
    state.cart[product.id] = nextQty;
  }
}

/**
 * Buy now: put the product in the cart (if it isn’t already), then go to cart.
 * Cart route can use router.push({ name: 'cart' }) once that page exists.
 */
function buyNow(product) {
  if (!product?.stock) return;
  if (!state.cart[product.id]) {
    state.cart[product.id] = 1;
  }
}

/** Add id if missing, remove if already favorited. */
function toggleFavorite(product) {
  const index = state.favoriteIds.indexOf(product.id);
  if (index === -1) {
    state.favoriteIds.push(product.id);
  } else {
    state.favoriteIds.splice(index, 1);
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
  <Header
    :cart-count="cartCount"
    :favorite-count="state.favoriteIds.length"
    :search-query="query"
    :categories="filterOptions.categories"
    :selected-categories="filters.categories"
    @update:search-query="setQuery"
    @clear-search="clearSearch"
    @toggle-category="toggleCategory"
  />
  <Hero />

  <main>
    <ProductList
      :products="displayedProducts"
      :total="total"
      :range="range"
      :search-query="query"
      :loading="loading"
      :error="error"
      :cart="state.cart"
      :favorites="state.favoriteIds"
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
      @increase-cart="increaseCart"
      @decrease-cart="decreaseCart"
      @buy-now="buyNow"
      @toggle-favorite="toggleFavorite"
      @toggle-brand="toggleBrand"
      @toggle-color="toggleColor"
      @toggle-rating="toggleRating"
      @toggle-discount="toggleDiscount"
      @toggle-price-sort="togglePriceSort"
      @update:price-min="onPriceMin"
      @update:price-max="onPriceMax"
      @remove-chip="removeChip"
      @clear-filters="clearFilters"
      @page-prev="prev"
      @page-next="next"
      @go-to-page="goToPage"
    />
  </main>
  <Footer />
</template>
