<script setup>
/**
 * ProductGrid — toolbar, filters, and product grid.
 *
 * Filter / cart / pagination actions come from `inject(LISTING_CONTEXT_KEY)`
 * provided by ProductListingPage — no long prop/emit relay.
 *
 * Display-only props (products slice, loading, error) still come from the
 * parent so the page can control the skeleton pulse and mobile Load more.
 */
import { ref, computed, onUnmounted, watch, useTemplateRef, inject } from "vue";
import { SlidersHorizontal } from "@lucide/vue";
import ProductCard from "@/components/product/ProductCard.vue";
import ProductSkeleton from "@/components/listing/ProductSkeleton.vue";
import EmptyState from "@/components/listing/EmptyState.vue";
import FilterSidebar from "@/components/listing/FilterSidebar.vue";
import ActiveFilterChips from "@/components/listing/ActiveFilterChips.vue";
import ProductPagination from "@/components/listing/ProductPagination.vue";
import SortDropdown from "@/components/listing/SortDropdown.vue";
import { SORT_OPTIONS } from "@/utils/productSort.js";
import { SEARCH_MIN_LENGTH } from "@/composables/useProducts.js";
import { useFocusTrap } from "@/composables/useFocusTrap.js";
import { LISTING_CONTEXT_KEY } from "@/composables/listingContext.js";

const props = defineProps({
  products: {
    type: Array,
    required: true,
  },
  total: {
    type: Number,
    default: 0,
  },
  /** Inclusive range for the current page, e.g. { start: 1, end: 12 }. */
  range: {
    type: Object,
    default: () => ({ start: 0, end: 0 }),
  },
  searchQuery: {
    type: String,
    default: "",
  },
  loading: {
    type: Boolean,
    default: false,
  },
  /** Catalog still loading — filter option lists show skeletons. */
  filtersLoading: {
    type: Boolean,
    default: false,
  },
  error: {
    type: String,
    default: null,
  },
  /** md+: numbered page controls. False on mobile (Load more instead). */
  showPagination: {
    type: Boolean,
    default: true,
  },
  /** Mobile: reveal the next batch of products. */
  showLoadMore: {
    type: Boolean,
    default: false,
  },
  page: {
    type: Number,
    default: 1,
  },
  totalPages: {
    type: Number,
    default: 1,
  },
  pageItems: {
    type: Array,
    default: () => [],
  },
  canPrev: {
    type: Boolean,
    default: false,
  },
  canNext: {
    type: Boolean,
    default: false,
  },
});

const listing = inject(LISTING_CONTEXT_KEY);
if (!listing) {
  throw new Error(
    "ProductGrid requires LISTING_CONTEXT_KEY from ProductListingPage",
  );
}

const filtersOpen = ref(false);
const filterSidebarRef = useTemplateRef("filterSidebarRef");
const filterDrawerEl = computed(() => {
  const inst = filterSidebarRef.value;
  const el = inst && "$el" in inst ? inst.$el : null;
  return el instanceof HTMLElement ? el : null;
});

function openFilters() {
  filtersOpen.value = true;
}

function closeFilters() {
  filtersOpen.value = false;
}

useFocusTrap(filterDrawerEl, filtersOpen, { onEscape: closeFilters });

watch(filtersOpen, (open) => {
  document.body.style.overflow = open ? "hidden" : "";
});

onUnmounted(() => {
  document.body.style.overflow = "";
});

function isFavorite(productId) {
  return listing.favorites.includes(productId);
}

function quantityFor(productId) {
  return listing.cart[productId] ?? 0;
}

const summaryRange = computed(() => ({
  start: props.range.start,
  end: props.range.end,
}));
const showResultSummary = computed(
  () => !props.loading && !props.error && props.total > 0,
);

const emptyMessage = computed(() => {
  const query = props.searchQuery.trim();
  if (query && query.length < SEARCH_MIN_LENGTH) {
    return `Type at least ${SEARCH_MIN_LENGTH} characters to search.`;
  }
  if (query && listing.hasActiveFilters) {
    return `No products match “${query}” with these filters.`;
  }
  if (query) return `No products match “${query}”.`;
  if (listing.hasActiveFilters) return "No products match these filters.";
  return "No products found.";
});

const showEmptyFilterActions = computed(
  () => Boolean(props.searchQuery.trim()) || listing.hasActiveFilters,
);

function onPriceMin(value) {
  listing.setPriceRange(value, listing.filters.priceMax);
}

function onPriceMax(value) {
  listing.setPriceRange(listing.filters.priceMin, value);
}
</script>

<template>
  <section
    id="products"
    class="product-list"
    aria-labelledby="product-list-heading"
  >
    <div class="container">
      <div class="product-list__toolbar">
        <button
          type="button"
          class="product-list__filters-toggle"
          :aria-expanded="filtersOpen"
          aria-controls="product-filters"
          @click="openFilters"
        >
          <SlidersHorizontal :size="20" aria-hidden="true" />
          <span class="product-list__filters-label">Filters</span>
          <span
            v-if="listing.hasActiveFilters"
            class="product-list__filters-badge"
          >
            {{ listing.activeChips.length }}
          </span>
        </button>

        <h2 id="product-list-heading" class="product-list__heading">
          Products
        </h2>

        <div class="product-list__toolbar-end">
          <p
            v-if="showResultSummary"
            class="product-list__count"
            aria-live="polite"
          >
            Showing
            <span class="product-list__count-strong"
              >{{ summaryRange.start }}–{{ summaryRange.end }}</span
            >
            of
            <span class="product-list__count-strong">{{ total }} Products</span>
          </p>

          <SortDropdown
            class="product-list__sort"
            :options="listing.filterOptions.sorts ?? SORT_OPTIONS"
            :model-value="listing.filters.sort"
            @update:model-value="listing.setSort"
          />
        </div>
      </div>

      <div class="product-list__layout">
        <button
          v-if="filtersOpen"
          type="button"
          class="product-list__drawer-backdrop"
          aria-label="Close filters"
          @click="closeFilters"
        />

        <FilterSidebar
          id="product-filters"
          ref="filterSidebarRef"
          :filters="listing.filters"
          :options="listing.filterOptions"
          :price-bounds="listing.priceBounds"
          :loading="filtersLoading"
          :drawer-open="filtersOpen"
          :aria-modal="filtersOpen ? 'true' : undefined"
          :role="filtersOpen ? 'dialog' : undefined"
          @toggle-brand="listing.toggleBrand"
          @toggle-color="listing.toggleColor"
          @toggle-size="listing.toggleSize"
          @toggle-rating="listing.toggleRating"
          @toggle-discount="listing.toggleDiscount"
          @toggle-in-stock="listing.toggleInStock"
          @update:price-min="onPriceMin"
          @update:price-max="onPriceMax"
          @clear="listing.clearFilters"
          @close="closeFilters"
        />

        <div class="product-list__main">
          <ActiveFilterChips
            :chips="listing.activeChips"
            @remove="listing.removeChip"
            @clear="listing.clearFilters"
          />

          <ProductSkeleton v-if="loading" :count="12" />

          <EmptyState v-else-if="error" variant="error" :message="error">
            <template #actions>
              <button
                type="button"
                class="btn btn--secondary"
                @click="listing.retry"
              >
                Retry
              </button>
            </template>
          </EmptyState>

          <EmptyState v-else-if="total === 0" :message="emptyMessage">
            <template #actions>
              <template v-if="showEmptyFilterActions">
                <button
                  v-if="listing.hasActiveFilters"
                  type="button"
                  class="btn btn--secondary"
                  @click="listing.clearFilters"
                >
                  Clear filters
                </button>
                <button
                  v-if="searchQuery.trim()"
                  type="button"
                  class="btn btn--tertiary"
                  @click="listing.clearSearch"
                >
                  Clear search
                </button>
              </template>
              <button
                v-else
                type="button"
                class="btn btn--secondary"
                @click="listing.retry"
              >
                Try again
              </button>
            </template>
          </EmptyState>

          <template v-else>
            <ul class="product-list__grid">
              <li
                v-for="product in products"
                :key="product.id"
                class="product-list__item"
              >
                <ProductCard
                  :product="product"
                  :favorited="isFavorite(product.id)"
                  :quantity="quantityFor(product.id)"
                  @add-to-cart="listing.addToCart"
                  @go-to-cart="listing.goToCart"
                  @toggle-favorite="listing.toggleFavorite"
                  @see-all-options="listing.seeAllOptions"
                />
              </li>
            </ul>

            <ProductPagination
              v-if="showPagination && totalPages > 1"
              :page="page"
              :total-pages="totalPages"
              :page-items="pageItems"
              :can-prev="canPrev"
              :can-next="canNext"
              @prev="listing.prevPage"
              @next="listing.nextPage"
              @go-to-page="listing.goToPage"
            />

            <div v-if="showLoadMore" class="product-list__load-more">
              <button
                type="button"
                class="btn btn--tertiary product-list__load-more-btn"
                @click="listing.loadMore"
              >
                Load more
              </button>
            </div>
          </template>
        </div>
      </div>
    </div>
  </section>
</template>

<style>
@import "@/assets/styles/components/product-list.css";
@import "@/assets/styles/components/filter-sidebar.css";
</style>
