<script setup>
/**
 * Listing view used for:
 * - Home `/` — all products + home Hero
 * - Category `/:category` — scoped products + CategoryBanner
 *
 * Discovery pipeline:
 *   useProducts → useProductFilters → usePagination → ProductGrid
 *
 * Vue idea: `provide(LISTING_CONTEXT_KEY)` shares filter/cart actions with
 * ProductGrid so we avoid a long prop/emit relay.
 */
import {
  ref,
  computed,
  watch,
  nextTick,
  onMounted,
  onUnmounted,
  provide,
  reactive,
} from "vue";
import { useRoute, useRouter } from "vue-router";
import Hero from "@/components/layout/Hero.vue";
import CategoryBanner from "@/components/layout/CategoryBanner.vue";
import ProductGrid from "@/components/product/ProductGrid.vue";
import RecentlyViewedProducts from "@/components/product/RecentlyViewedProducts.vue";
import { useProducts } from "@/composables/useProducts.js";
import { useProductFilters } from "@/composables/useProductFilters.js";
import { usePagination } from "@/composables/usePagination.js";
import { useListingQuerySync } from "@/composables/useListingQuerySync.js";
import { useToast } from "@/composables/useToast.js";
import { useCart } from "@/composables/useCart.js";
import { useWishlist } from "@/composables/useWishlist.js";
import { LISTING_CONTEXT_KEY } from "@/composables/listingContext.js";
import { mediaQueries } from "@/constants/breakpoints.js";
import { productDetailsTo } from "@/utils/productRoutes.js";
import { categoryFromRoute } from "@/utils/listingRoutes.js";

const route = useRoute();

const isHomePage = computed(() => route.name === "products");
const activeCategory = computed(() => categoryFromRoute(route));

const {
  catalog,
  products: searchedProducts,
  loading,
  error,
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
  toggleSize,
  toggleRating,
  toggleDiscount,
  toggleInStock,
  setSort,
  setPriceRange,
  removeChip,
  clearFilters,
} = useProductFilters(searchedProducts, catalog);

const PAGE_SIZE = 12;

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
} = usePagination(filteredProducts, { pageSize: PAGE_SIZE });

useListingQuerySync({
  appliedQuery,
  hydrateQuery,
  filters,
  priceBounds,
  isPriceFiltered,
  page,
  goToPage,
  total,
});

const listRefreshing = ref(false);
const discoveryWatchReady = ref(false);
/** @type {ReturnType<typeof setTimeout> | null} */
let listRefreshTimer = null;
const LIST_REFRESH_MS = 280;

function pulseListRefresh() {
  if (loading.value) return;
  listRefreshing.value = true;
  if (listRefreshTimer) clearTimeout(listRefreshTimer);
  listRefreshTimer = setTimeout(() => {
    listRefreshing.value = false;
    listRefreshTimer = null;
  }, LIST_REFRESH_MS);
}

const showListSkeleton = computed(() => loading.value || listRefreshing.value);

watch(
  () => ({
    categories: filters.categories.slice(),
    brands: filters.brands.slice(),
    colors: filters.colors.slice(),
    sizes: filters.sizes.slice(),
    ratings: filters.ratings.slice(),
    discounts: filters.discounts.slice(),
    inStockOnly: filters.inStockOnly,
    sort: filters.sort,
    q: appliedQuery.value,
  }),
  () => {
    if (!discoveryWatchReady.value) return;
    pulseListRefresh();
  },
);

const isMobile = ref(false);
const mobileVisibleCount = ref(PAGE_SIZE);
/** @type {MediaQueryList | null} */
let mobileMediaQuery = null;

function syncIsMobile() {
  isMobile.value = mobileMediaQuery?.matches ?? false;
}

onMounted(async () => {
  mobileMediaQuery = window.matchMedia(mediaQueries.untilMd);
  syncIsMobile();
  mobileMediaQuery.addEventListener("change", syncIsMobile);
  await nextTick();
  discoveryWatchReady.value = true;
});

onUnmounted(() => {
  mobileMediaQuery?.removeEventListener("change", syncIsMobile);
  if (listRefreshTimer) clearTimeout(listRefreshTimer);
});

watch(
  () => {
    const list = filteredProducts.value;
    if (list.length === 0) return "0";
    const first = list[0]?.id ?? "";
    const last = list[list.length - 1]?.id ?? "";
    return `${list.length}:${first}:${last}`;
  },
  () => {
    mobileVisibleCount.value = PAGE_SIZE;
  },
);

const displayedProducts = computed(() => {
  if (isMobile.value) {
    return filteredProducts.value.slice(0, mobileVisibleCount.value);
  }
  return paginatedItems.value;
});

const displayRange = computed(() => {
  if (!isMobile.value) return range.value;
  if (total.value === 0) return { start: 0, end: 0 };
  return {
    start: 1,
    end: Math.min(mobileVisibleCount.value, total.value),
  };
});

const showPagination = computed(() => !isMobile.value);
const showLoadMore = computed(
  () => isMobile.value && mobileVisibleCount.value < total.value,
);

function loadMore() {
  mobileVisibleCount.value = Math.min(
    mobileVisibleCount.value + PAGE_SIZE,
    total.value,
  );
}

watch(page, async (nextPage, prevPage) => {
  if (isMobile.value) return;
  if (prevPage == null || nextPage === prevPage) return;
  await nextTick();
  document.getElementById("products")?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
});

const router = useRouter();
const toast = useToast();
const { cartQuantities, addToCart: putInCart } = useCart();
const { favoriteIds, toggleFavorite: toggleFavoriteId } = useWishlist();

function productLabel(product) {
  return product?.title?.trim() || "Item";
}

function addToCart(product, variant = null) {
  if (putInCart(product, 1, variant)) {
    toast.success(`${productLabel(product)} added to cart`);
    return;
  }
  toast.error(`Couldn't add ${productLabel(product)} to cart`);
}

function goToCart() {
  router.push({ name: "cart" });
}

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

/**
 * Reactive bag so nested refs unwrap in ProductGrid templates/script.
 * Display slice (products, page, loading) stays as props.
 */
provide(
  LISTING_CONTEXT_KEY,
  reactive({
    filters,
    filterOptions,
    priceBounds,
    activeChips,
    hasActiveFilters,
    cart: cartQuantities,
    favorites: favoriteIds,
    toggleBrand,
    toggleColor,
    toggleSize,
    toggleRating,
    toggleDiscount,
    toggleInStock,
    setSort,
    setPriceRange,
    removeChip,
    clearFilters,
    clearSearch,
    retry,
    addToCart,
    goToCart,
    toggleFavorite,
    seeAllOptions,
    prevPage: prev,
    nextPage: next,
    goToPage,
    loadMore,
  }),
);
</script>

<template>
  <Hero v-if="isHomePage" />
  <CategoryBanner v-else-if="activeCategory" :category="activeCategory" />

  <ProductGrid
    :products="displayedProducts"
    :total="total"
    :range="displayRange"
    :search-query="appliedQuery"
    :loading="showListSkeleton"
    :filters-loading="loading"
    :error="error"
    :show-pagination="showPagination"
    :show-load-more="showLoadMore"
    :page="page"
    :total-pages="totalPages"
    :page-items="pageItems"
    :can-prev="canPrev"
    :can-next="canNext"
  />

  <div class="container">
    <RecentlyViewedProducts />
  </div>
</template>

<style>
@import "@/assets/styles/components/hero.css";
@import "@/assets/styles/components/category-banner.css";
</style>