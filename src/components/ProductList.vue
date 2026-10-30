<script setup>
/**
 * ProductList — toolbar, filters, and product grid.
 *
 * Layout:
 * - Desktop: sticky FilterSidebar on the left + grid on the right
 * - Mobile: filter icon beside “Products” opens the same sidebar as a drawer
 *
 * Filter state lives in App (useProductFilters). This component receives
 * the filtered products + helpers via props and forwards user actions up.
 */
import { ref, onUnmounted, watch } from "vue";
import { SlidersHorizontal } from "@lucide/vue";
import ProductCard from "@/components/ProductCard.vue";
import FilterSidebar from "@/components/FilterSidebar.vue";
import ActiveFilterChips from "@/components/ActiveFilterChips.vue";
import ProductPagination from "@/components/ProductPagination.vue";

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
  error: {
    type: String,
    default: null,
  },
  /** productId → quantity from App */
  cart: {
    type: Object,
    default: () => ({}),
  },
  /** Array of favorited product ids from App */
  favorites: {
    type: Array,
    default: () => [],
  },
  filters: {
    type: Object,
    required: true,
  },
  filterOptions: {
    type: Object,
    required: true,
  },
  priceBounds: {
    type: Object,
    required: true,
  },
  activeChips: {
    type: Array,
    default: () => [],
  },
  hasActiveFilters: {
    type: Boolean,
    default: false,
  },
  /** False on mobile — full list, no page controls. */
  showPagination: {
    type: Boolean,
    default: true,
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

const emit = defineEmits([
  "retry",
  "clear-search",
  "add-to-cart",
  "go-to-cart",
  "buy-now",
  "toggle-favorite",
  "toggle-brand",
  "toggle-color",
  "toggle-rating",
  "toggle-discount",
  "toggle-price-sort",
  "update:price-min",
  "update:price-max",
  "remove-chip",
  "clear-filters",
  "page-prev",
  "page-next",
  "go-to-page",
]);

/** Mobile filter drawer open/closed. */
const filtersOpen = ref(false);

function openFilters() {
  filtersOpen.value = true;
}

function closeFilters() {
  filtersOpen.value = false;
}

/** Lock body scroll while the drawer is open. */
watch(filtersOpen, (open) => {
  document.body.style.overflow = open ? "hidden" : "";
});

onUnmounted(() => {
  document.body.style.overflow = "";
});

function isFavorite(productId) {
  return props.favorites.includes(productId);
}

function quantityFor(productId) {
  return props.cart[productId] ?? 0;
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
        <div class="product-list__toolbar-start">
          <div class="product-list__heading-row">
            <button
              type="button"
              class="product-list__filters-toggle"
              :aria-expanded="filtersOpen"
              aria-controls="product-filters"
              aria-label="Open filters"
              @click="openFilters"
            >
              <SlidersHorizontal :size="20" aria-hidden="true" />
              <span
                v-if="hasActiveFilters"
                class="product-list__filters-badge"
              >
                {{ activeChips.length }}
              </span>
            </button>
            <h2 id="product-list-heading" class="product-list__heading">
              Products
            </h2>
          </div>
          <ActiveFilterChips
            :chips="activeChips"
            @remove="emit('remove-chip', $event)"
            @clear="emit('clear-filters')"
          />
        </div>
        <p
          v-if="!loading && !error"
          class="product-list__count"
          aria-live="polite"
        >
          <template v-if="searchQuery.trim()">
            {{ total }} result{{ total === 1 ? "" : "s" }} for
            “{{ searchQuery.trim() }}”
          </template>
          <template v-else>
            {{ total }} product{{ total === 1 ? "" : "s" }}
          </template>
          <template v-if="showPagination && total > 0 && totalPages > 1">
            · page {{ page }} of {{ totalPages }}
          </template>
        </p>
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
          :filters="filters"
          :options="filterOptions"
          :price-bounds="priceBounds"
          :drawer-open="filtersOpen"
          @toggle-brand="emit('toggle-brand', $event)"
          @toggle-color="emit('toggle-color', $event)"
          @toggle-rating="emit('toggle-rating', $event)"
          @toggle-discount="emit('toggle-discount', $event)"
          @toggle-price-sort="emit('toggle-price-sort', $event)"
          @update:price-min="emit('update:price-min', $event)"
          @update:price-max="emit('update:price-max', $event)"
          @clear="emit('clear-filters')"
          @close="closeFilters"
        />

        <div class="product-list__main">
          <div
            v-if="loading"
            class="product-list__status"
            role="status"
            aria-live="polite"
          >
            Loading products…
          </div>

          <div
            v-else-if="error"
            class="product-list__status product-list__status--error"
            role="alert"
          >
            <p>{{ error }}</p>
            <button
              type="button"
              class="btn btn--secondary"
              @click="emit('retry')"
            >
              Retry
            </button>
          </div>

          <div
            v-else-if="total === 0"
            class="product-list__status"
            role="status"
          >
            <template v-if="searchQuery.trim() || hasActiveFilters">
              <p>
                <template v-if="searchQuery.trim()">
                  No products match “{{ searchQuery.trim() }}”
                  <template v-if="hasActiveFilters"> with these filters</template>.
                </template>
                <template v-else>
                  No products match these filters.
                </template>
              </p>
              <div class="product-list__empty-actions">
                <button
                  v-if="hasActiveFilters"
                  type="button"
                  class="btn btn--secondary"
                  @click="emit('clear-filters')"
                >
                  Clear filters
                </button>
                <button
                  v-if="searchQuery.trim()"
                  type="button"
                  class="btn btn--tertiary"
                  @click="emit('clear-search')"
                >
                  Clear search
                </button>
              </div>
            </template>
            <template v-else>
              <p>No products found.</p>
              <button
                type="button"
                class="btn btn--secondary"
                @click="emit('retry')"
              >
                Try again
              </button>
            </template>
          </div>

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
                  @add-to-cart="emit('add-to-cart', $event)"
                  @go-to-cart="emit('go-to-cart', $event)"
                  @buy-now="emit('buy-now', $event)"
                  @toggle-favorite="emit('toggle-favorite', $event)"
                />
              </li>
            </ul>

            <ProductPagination
              v-if="showPagination"
              :page="page"
              :total-pages="totalPages"
              :total="total"
              :range="range"
              :page-items="pageItems"
              :can-prev="canPrev"
              :can-next="canNext"
              @prev="emit('page-prev')"
              @next="emit('page-next')"
              @go-to-page="emit('go-to-page', $event)"
            />
          </template>
        </div>
      </div>
    </div>
  </section>
</template>
