<script setup>
/**
 * Header: logo | search | categories | home / favorites / cart / profile.
 *
 * Mobile (<768px): logo; search under it; text-only category strip; bottom nav.
 * Tablet+ (≥768px): search in the bar; category icons above labels; inline icons.
 *
 * Categories sit under search and toggle the same `filters.categories` state
 * used by the listing (removed from the filter sidebar).
 */
import {
  nextTick,
  onMounted,
  onUnmounted,
  ref,
  useTemplateRef,
  watch,
} from "vue";
import {
  Home,
  Heart,
  ShoppingCart,
  User,
  X,
  Search,
  ChevronLeft,
  ChevronRight,
} from "@lucide/vue";
import logoUrl from "@/assets/images/logo.png";
import { getCategoryIcon } from "@/utils/categoryIcons.js";

const props = defineProps({
  cartCount: {
    type: Number,
    default: 0,
  },
  favoriteCount: {
    type: Number,
    default: 0,
  },
  /** Bound from App via v-model:search-query */
  searchQuery: {
    type: String,
    default: "",
  },
  /** From useProductFilters → filterOptions.categories */
  categories: {
    type: Array,
    default: () => [],
  },
  /** Currently selected category slugs */
  selectedCategories: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits([
  "update:searchQuery",
  "clear-search",
  "toggle-category",
]);

/** Used so the mobile filter drawer can sit below header + search + categories. */
const headerEl = useTemplateRef("headerEl");
/** The overflow-x list we scroll with the arrow buttons. */
const categoriesScroll = useTemplateRef("categoriesScroll");

const canScrollLeft = ref(false);
const canScrollRight = ref(false);

/** @type {ResizeObserver | null} */
let headerResizeObserver = null;
/** @type {ResizeObserver | null} */
let categoriesResizeObserver = null;
/** Tracked so we can remove the scroll listener before rebinding. */
/** @type {HTMLElement | null} */
let categoriesScrollEl = null;

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
function scrollCategories(direction) {
  const el = categoriesScroll.value;
  if (!el) return;

  const amount = Math.max(el.clientWidth * 0.6, 160);
  el.scrollBy({ left: direction * amount, behavior: "smooth" });
}

function bindCategoryScrollObservers() {
  if (categoriesScrollEl) {
    categoriesScrollEl.removeEventListener(
      "scroll",
      updateCategoryScrollState,
    );
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

function onSearchInput(event) {
  emit("update:searchQuery", event.target.value);
}

function clearSearch() {
  emit("clear-search");
}

function isCategorySelected(value) {
  return props.selectedCategories.includes(value);
}

/**
 * Categories load async — when the list appears (or changes length), wait for
 * the DOM (`nextTick`), then attach observers and refresh arrow state.
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
          <a href="/" class="brand">
            <img :src="logoUrl" alt="Mercantile" class="brand-logo" />
          </a>
        </div>

        <div class="header-search">
          <label class="header-search__label" for="header-search-input">
            Search products
          </label>
          <div class="header-search__field">
            <Search
              class="header-search__icon"
              :size="18"
              aria-hidden="true"
            />
            <input
              id="header-search-input"
              type="search"
              class="header-search__input"
              placeholder="Search by name or brand"
              autocomplete="off"
              :value="searchQuery"
              @input="onSearchInput"
            />
            <button
              v-if="searchQuery"
              type="button"
              class="header-search__clear"
              aria-label="Clear search"
              @click="clearSearch"
            >
              <X :size="16" />
            </button>
          </div>
        </div>

        <div class="header-actions">
          <nav id="header-nav" class="header-nav" aria-label="Shop actions">
            <div class="header-nav__links">
              <a href="/" class="nav-icon" aria-label="Home">
                <Home :size="22" />
                <span class="nav-label">Home</span>
              </a>
              <a href="#favorites" class="nav-icon" aria-label="Favorites">
                <Heart :size="22" />
                <span class="nav-label">Favorites</span>
                <span
                  v-if="favoriteCount > 0"
                  class="nav-badge"
                  aria-hidden="true"
                >
                  {{ favoriteCount }}
                </span>
              </a>
              <a href="#cart" class="nav-icon" aria-label="Cart">
                <ShoppingCart :size="22" />
                <span class="nav-label">Cart</span>
                <span v-if="cartCount > 0" class="nav-badge" aria-hidden="true">
                  {{ cartCount }}
                </span>
              </a>
              <a href="#profile" class="nav-icon" aria-label="Profile">
                <User :size="22" />
                <span class="nav-label">Profile</span>
              </a>
            </div>
          </nav>
        </div>
      </div>
    </div>

    <nav
      v-if="categories.length > 0"
      class="header-categories"
      aria-label="Product categories"
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
            <ChevronLeft :size="20" aria-hidden="true" />
          </button>

          <ul ref="categoriesScroll" class="header-categories__scroll">
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
            <ChevronRight :size="20" aria-hidden="true" />
          </button>
        </div>
      </div>
    </nav>
  </header>
</template>
