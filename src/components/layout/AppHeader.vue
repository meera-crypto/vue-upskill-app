<script setup lang="ts">
/**
 * Header: logo | search | categories | home / favorites / cart / profile.
 *
 * Base (< md / 768px): logo + search icon on one row; text-only categories; bottom nav.
 * md+: search field in the bar; category icons above labels; inline icons.
 *
 * Search UI lives in ProductSearch (suggestions, keyboard nav).
 * Categories sit under search and sync via `/:category` (slug only in the path).
 * Search and category combine with AND; no overlap → empty state (chip kept).
 * The category strip is always mounted (skeleton chips while the catalog
 * loads) so header height does not jump when real categories arrive.
 *
 * Mounted once from App.vue (useAppHeader). Cart / favorites counts come from
 * shared composables so badges stay in sync. RouterLink powers Home / Favorites / Cart / Profile.
 */
import {
  computed,
  nextTick,
  onMounted,
  onUnmounted,
  ref,
  useTemplateRef,
  watch,
} from "vue";
import type { PropType } from "vue";
import { Home, Heart, User, ChevronLeft, ChevronRight } from "@lucide/vue";
import logoUrl from "@/assets/images/logo.png";
import { getCategoryIcon } from "@/utils/categoryIcons";
import { useWishlist } from "@/composables/useWishlist";
import ProductSearch from "@/components/listing/ProductSearch.vue";
import CartButton from "@/components/cart/CartButton.vue";
import type { FilterOptionItem } from "@/utils/filterOptions";

const props = defineProps({
  /** Bound from the page via v-model:search-query */
  searchQuery: {
    type: String,
    default: "",
  },
  /** From useAppHeader → category chips */
  categories: {
    type: Array as PropType<FilterOptionItem[]>,
    default: () => [],
  },
  /** Currently selected category slugs (listing only; empty on cart/favorites) */
  selectedCategories: {
    type: Array as PropType<string[]>,
    default: () => [],
  },
});

const emit = defineEmits<{
  (e: "update:searchQuery", value: string): void;
  (e: "submit-search"): void;
  (e: "clear-search"): void;
  (e: "toggle-category", value: string): void;
}>();

const { favoriteCount } = useWishlist();

/** Used so the mobile filter drawer can sit below header + search + categories. */
const headerEl = useTemplateRef("headerEl");
/** The overflow-x list we scroll with the arrow buttons. */
const categoriesScroll = useTemplateRef("categoriesScroll");

const canScrollLeft = ref(false);
const canScrollRight = ref(false);

let headerResizeObserver: ResizeObserver | null = null;
let categoriesResizeObserver: ResizeObserver | null = null;
/** Tracked so we can remove the scroll listener before rebinding. */
let categoriesScrollEl: HTMLElement | null = null;

function syncHeaderHeight() {
  const height = headerEl.value?.offsetHeight ?? 0;
  document.documentElement.style.setProperty(
    "--site-header-height",
    `${height}px`,
  );
}

/**
 * Recompute whether more categories sit off-screen left / right.
 * scrollWidth > clientWidth means the strip overflows; scrollLeft says where we are.
 */
function updateCategoryScrollState() {
  const el = categoriesScroll.value;
  if (!el) {
    canScrollLeft.value = false;
    canScrollRight.value = false;
    return;
  }

  const maxScroll = el.scrollWidth - el.clientWidth;
  /* Small epsilon so sub-pixel rounding doesn’t flicker the arrows. */
  canScrollLeft.value = el.scrollLeft > 1;
  canScrollRight.value = maxScroll > 1 && el.scrollLeft < maxScroll - 1;
}

/** Scroll about 60% of the visible width so users can see overlapping context. */
function scrollCategories(direction: number) {
  const el = categoriesScroll.value;
  if (!el) return;

  const amount = Math.max(el.clientWidth * 0.6, 160);
  el.scrollBy({ left: direction * amount, behavior: "smooth" });
}

function bindCategoryScrollObservers() {
  if (categoriesScrollEl) {
    categoriesScrollEl.removeEventListener("scroll", updateCategoryScrollState);
  }
  categoriesResizeObserver?.disconnect();
  categoriesResizeObserver = null;

  const el = categoriesScroll.value;
  categoriesScrollEl = el ?? null;

  if (!el) {
    updateCategoryScrollState();
    return;
  }

  el.addEventListener("scroll", updateCategoryScrollState, { passive: true });

  if (typeof ResizeObserver !== "undefined") {
    categoriesResizeObserver = new ResizeObserver(() => {
      updateCategoryScrollState();
    });
    categoriesResizeObserver.observe(el);
  }

  updateCategoryScrollState();
}

function isCategorySelected(value: string) {
  return props.selectedCategories.includes(value);
}

/** True until the catalog-derived category list arrives. */
const categoriesLoading = computed(() => props.categories.length === 0);

/**
 * Placeholder count while loading — enough chips to fill a typical desktop
 * category row (storefront groups + leftovers) so height/width don’t jump.
 */
const CATEGORY_SKELETON_COUNT = 14;

/**
 * When real categories replace skeletons, rebind scroll observers and
 * remeasure header height (should stay stable thanks to reserved strip height).
 */
watch(
  () => props.categories.length,
  async () => {
    await nextTick();
    bindCategoryScrollObservers();
    syncHeaderHeight();
  },
);

onMounted(() => {
  syncHeaderHeight();
  if (headerEl.value && typeof ResizeObserver !== "undefined") {
    headerResizeObserver = new ResizeObserver(() => {
      syncHeaderHeight();
    });
    headerResizeObserver.observe(headerEl.value);
  }
  window.addEventListener("resize", syncHeaderHeight);
  window.addEventListener("resize", updateCategoryScrollState);
  bindCategoryScrollObservers();
});

onUnmounted(() => {
  headerResizeObserver?.disconnect();
  categoriesResizeObserver?.disconnect();
  categoriesScrollEl?.removeEventListener("scroll", updateCategoryScrollState);
  categoriesScrollEl = null;
  window.removeEventListener("resize", syncHeaderHeight);
  window.removeEventListener("resize", updateCategoryScrollState);
});
</script>

<template>
  <header id="top" ref="headerEl" class="site-header">
    <div class="container">
      <div class="header-inner">
        <div class="header-brand">
          <RouterLink :to="{ name: 'products' }" class="brand">
            <img :src="logoUrl" alt="Mercantile" class="brand-logo" />
          </RouterLink>
        </div>

        <ProductSearch
          :search-query="searchQuery"
          :selected-category="selectedCategories[0] ?? ''"
          @update:search-query="emit('update:searchQuery', $event)"
          @submit-search="emit('submit-search')"
          @clear-search="emit('clear-search')"
        />

        <div class="header-actions">
          <nav id="header-nav" class="header-nav" aria-label="Shop actions">
            <div class="header-nav__links">
              <RouterLink
                :to="{ name: 'products' }"
                class="nav-icon"
                aria-label="Home"
              >
                <Home :size="24" />
                <span class="nav-label">Home</span>
              </RouterLink>
              <RouterLink
                :to="{ name: 'favorites' }"
                class="nav-icon"
                aria-label="Favorites"
              >
                <Heart :size="24" />
                <span class="nav-label">Favorites</span>
                <span
                  v-if="favoriteCount > 0"
                  class="nav-badge"
                  aria-hidden="true"
                >
                  {{ favoriteCount }}
                </span>
              </RouterLink>
              <CartButton />
              <RouterLink
                :to="{ name: 'account' }"
                class="nav-icon"
                aria-label="Profile"
              >
                <User :size="24" />
                <span class="nav-label">Profile</span>
              </RouterLink>
            </div>
          </nav>
        </div>
      </div>
    </div>

    <!--
      Always mounted: empty catalog would previously hide this nav (`v-if`),
      which grew the header when categories arrived and shifted the page.
    -->
    <nav
      class="header-categories"
      aria-label="Product categories"
      :aria-busy="categoriesLoading ? 'true' : undefined"
    >
      <div class="container">
        <div
          class="header-categories__viewport"
          :class="{
            'header-categories__viewport--fade-left': canScrollLeft,
            'header-categories__viewport--fade-right': canScrollRight,
          }"
        >
          <button
            v-if="canScrollLeft"
            type="button"
            class="header-categories__arrow header-categories__arrow--prev"
            aria-label="Scroll categories left"
            @click="scrollCategories(-1)"
          >
            <ChevronLeft :size="22" aria-hidden="true" />
          </button>

          <ul
            v-if="categoriesLoading"
            class="header-categories__scroll header-categories__scroll--skeleton"
            aria-hidden="true"
          >
            <li
              v-for="n in CATEGORY_SKELETON_COUNT"
              :key="n"
              class="header-categories__item"
            >
              <span class="header-category header-category--skeleton">
                <span class="header-category__skeleton-icon" />
                <span class="header-category__skeleton-label" />
              </span>
            </li>
          </ul>

          <ul v-else ref="categoriesScroll" class="header-categories__scroll">
            <li
              v-for="category in categories"
              :key="category.value"
              class="header-categories__item"
            >
              <button
                type="button"
                class="header-category"
                :class="{
                  'header-category--active': isCategorySelected(category.value),
                }"
                :aria-pressed="isCategorySelected(category.value)"
                @click="emit('toggle-category', category.value)"
              >
                <component
                  :is="getCategoryIcon(category.value)"
                  class="header-category__icon"
                  :size="22"
                  aria-hidden="true"
                />
                <span class="header-category__label">{{ category.label }}</span>
              </button>
            </li>
          </ul>

          <button
            v-if="canScrollRight"
            type="button"
            class="header-categories__arrow header-categories__arrow--next"
            aria-label="Scroll categories right"
            @click="scrollCategories(1)"
          >
            <ChevronRight :size="22" aria-hidden="true" />
          </button>
        </div>
      </div>
    </nav>
  </header>
</template>
