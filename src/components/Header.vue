<script setup>
/**
 * Header: logo | search | categories | home / favorites / cart / profile.
 *
 * Base (< md / 768px): logo; search under it; text-only categories; bottom nav.
 * md+: search in the bar; category icons above labels; inline icons.
 *
 * Search shows a product suggestions dropdown while typing (title / brand /
 * tags match; matched search text is highlighted). A View all row at the
 * bottom applies the typed query on the listing.
 * Categories sit under search and toggle the same `filters.categories` state
 * used by the listing (removed from the filter sidebar).
 *
 * Mounted once from App.vue (useAppHeader). Cart / favorites counts come from
 * shared composables so badges stay in sync. RouterLink powers Home / Favorites / Cart.
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
import { useRouter } from "vue-router";
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
import { useCart } from "@/composables/useCart.js";
import { useFavorites } from "@/composables/useFavorites.js";
import {
  highlightSearchText,
  useSearchSuggestions,
} from "@/composables/useSearchSuggestions.js";
import { PRODUCT_IMAGE_FALLBACK } from "@/services/productService.js";
import { productDetailsTo } from "@/utils/productRoutes.js";

const props = defineProps({
  /** Bound from the page via v-model:search-query */
  searchQuery: {
    type: String,
    default: "",
  },
  /** From useAppHeader → category chips */
  categories: {
    type: Array,
    default: () => [],
  },
  /** Currently selected category slugs (listing only; empty on cart/favorites) */
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

const router = useRouter();
const { cartCount } = useCart();
const { favoriteCount } = useFavorites();

/** Used so the mobile filter drawer can sit below header + search + categories. */
const headerEl = useTemplateRef("headerEl");
/** The overflow-x list we scroll with the arrow buttons. */
const categoriesScroll = useTemplateRef("categoriesScroll");
const searchFieldEl = useTemplateRef("searchFieldEl");
/** Scrollable product list inside the suggestions panel (View all sits outside it). */
const suggestionsListEl = useTemplateRef("suggestionsListEl");

const canScrollLeft = ref(false);
const canScrollRight = ref(false);

/** Suggestions panel open while the search input is focused / in use. */
const searchFocused = ref(false);
const activeSuggestion = ref(-1);
/** Ignore the next blur close when clicking inside the dropdown. */
let blurCloseTimer = null;

const searchQueryRef = computed(() => props.searchQuery);
const { suggestions, hasSuggestions } = useSearchSuggestions(searchQueryRef);

const showSuggestions = computed(
  () =>
    searchFocused.value &&
    props.searchQuery.trim().length > 0 &&
    hasSuggestions.value,
);

const suggestionListId = "header-search-suggestions";

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

function onSearchInput(event) {
  activeSuggestion.value = -1;
  emit("update:searchQuery", event.target.value);
}

function clearSearch() {
  activeSuggestion.value = -1;
  emit("clear-search");
}

function onSearchFocus() {
  searchFocused.value = true;
}

function onSearchBlur() {
  /* Delay so a mousedown on a suggestion can run before the panel unmounts. */
  blurCloseTimer = window.setTimeout(() => {
    searchFocused.value = false;
    activeSuggestion.value = -1;
  }, 120);
}

function cancelBlurClose() {
  if (blurCloseTimer != null) {
    clearTimeout(blurCloseTimer);
    blurCloseTimer = null;
  }
}

function suggestionImage(product) {
  const thumb =
    typeof product?.thumbnail === "string" ? product.thumbnail.trim() : "";
  const image = typeof product?.image === "string" ? product.image.trim() : "";
  return thumb || image || PRODUCT_IMAGE_FALLBACK;
}

function onSuggestionImageError(event) {
  if (event.target.src !== PRODUCT_IMAGE_FALLBACK) {
    event.target.src = PRODUCT_IMAGE_FALLBACK;
  }
}

/**
 * @param {{ product?: Record<string, unknown> }} item
 */
function selectSuggestion(item) {
  cancelBlurClose();
  searchFocused.value = false;
  activeSuggestion.value = -1;

  if (item.product?.id != null) {
    router.push(productDetailsTo(item.product));
  }
}

/**
 * Close the dropdown and apply the typed query on the listing
 * (same outcome as Enter with no product highlighted).
 */
function viewAllResults() {
  cancelBlurClose();
  searchFocused.value = false;
  activeSuggestion.value = -1;

  const q = props.searchQuery.trim();
  if (router.currentRoute.value.name !== "products") {
    router.push({ name: "products", query: q ? { q } : {} });
  }
}

/** Highlight the typed search text inside a suggestion title. */
function suggestionLabelParts(label) {
  return highlightSearchText(label, props.searchQuery);
}

/** Product indices 0..n-1; View all is the final option at index n. */
const viewAllSuggestionIndex = computed(() => suggestions.value.length);

const activeSuggestionDomId = computed(() => {
  if (activeSuggestion.value < 0) return undefined;
  if (activeSuggestion.value === viewAllSuggestionIndex.value) {
    return `${suggestionListId}-view-all`;
  }
  return `${suggestionListId}-${activeSuggestion.value}`;
});

/**
 * Scroll only the product list (not the page).
 * Avoid scrollIntoView() — it can scroll the window/header and still leave
 * the active row clipped. Compare rects and adjust scrollTop instead.
 */
function scrollActiveSuggestionIntoView() {
  const index = activeSuggestion.value;
  if (index < 0 || index === viewAllSuggestionIndex.value) return;

  const list = suggestionsListEl.value;
  const option = document.getElementById(`${suggestionListId}-${index}`);
  if (!list || !option) return;

  const listRect = list.getBoundingClientRect();
  const optionRect = option.getBoundingClientRect();

  if (optionRect.top < listRect.top) {
    list.scrollTop -= listRect.top - optionRect.top;
  } else if (optionRect.bottom > listRect.bottom) {
    list.scrollTop += optionRect.bottom - listRect.bottom;
  }
}

/**
 * Update the active index, then scroll after Vue paints the --active class.
 * Calling scroll from the key handler (not only a watch) keeps arrowing reliable.
 */
async function moveActiveSuggestion(nextIndex) {
  activeSuggestion.value = nextIndex;
  await nextTick();
  scrollActiveSuggestionIntoView();
}

function onSearchKeydown(event) {
  if (!showSuggestions.value) {
    if (event.key === "Escape" && props.searchQuery) {
      clearSearch();
    }
    return;
  }

  /* Last navigable index includes the View all row. */
  const last = viewAllSuggestionIndex.value;

  if (event.key === "ArrowDown") {
    event.preventDefault();
    const next =
      activeSuggestion.value < last ? activeSuggestion.value + 1 : 0;
    moveActiveSuggestion(next);
    return;
  }

  if (event.key === "ArrowUp") {
    event.preventDefault();
    const next =
      activeSuggestion.value > 0 ? activeSuggestion.value - 1 : last;
    moveActiveSuggestion(next);
    return;
  }

  if (event.key === "Enter") {
    if (activeSuggestion.value === viewAllSuggestionIndex.value) {
      event.preventDefault();
      viewAllResults();
      return;
    }
    if (activeSuggestion.value >= 0) {
      event.preventDefault();
      const item = suggestions.value[activeSuggestion.value];
      if (item) {
        selectSuggestion(item);
        return;
      }
    }
    /* Keep the typed search; just close the suggestions panel. */
    viewAllResults();
    return;
  }

  if (event.key === "Escape") {
    event.preventDefault();
    searchFocused.value = false;
    activeSuggestion.value = -1;
  }
}

function onDocumentPointerDown(event) {
  const root = searchFieldEl.value;
  if (!root || root.contains(event.target)) return;
  searchFocused.value = false;
  activeSuggestion.value = -1;
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
  document.addEventListener("pointerdown", onDocumentPointerDown);
  bindCategoryScrollObservers();
});

onUnmounted(() => {
  headerResizeObserver?.disconnect();
  categoriesResizeObserver?.disconnect();
  categoriesScrollEl?.removeEventListener("scroll", updateCategoryScrollState);
  categoriesScrollEl = null;
  window.removeEventListener("resize", syncHeaderHeight);
  window.removeEventListener("resize", updateCategoryScrollState);
  document.removeEventListener("pointerdown", onDocumentPointerDown);
  cancelBlurClose();
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

        <div class="header-search">
          <label class="header-search__label" for="header-search-input">
            Search products
          </label>
          <div ref="searchFieldEl" class="header-search__field">
            <Search class="header-search__icon" :size="18" aria-hidden="true" />
            <input
              id="header-search-input"
              type="search"
              class="header-search__input"
              placeholder="Search by name, brand, or tag"
              autocomplete="off"
              role="combobox"
              aria-autocomplete="list"
              :aria-expanded="showSuggestions ? 'true' : 'false'"
              :aria-controls="suggestionListId"
              :aria-activedescendant="activeSuggestionDomId"
              :value="searchQuery"
              @input="onSearchInput"
              @focus="onSearchFocus"
              @blur="onSearchBlur"
              @keydown="onSearchKeydown"
            />
            <button
              v-if="searchQuery"
              type="button"
              class="header-search__clear"
              aria-label="Clear search"
              @mousedown.prevent
              @click="clearSearch"
            >
              <X :size="16" />
            </button>

            <div
              v-if="showSuggestions"
              :id="suggestionListId"
              class="header-search__suggestions"
              role="listbox"
              aria-label="Search suggestions"
            >
              <div
                ref="suggestionsListEl"
                class="header-search__suggestion-list"
              >
                <button
                  v-for="(item, index) in suggestions"
                  :id="`${suggestionListId}-${index}`"
                  :key="item.id"
                  type="button"
                  class="header-search__suggestion"
                  :class="{
                    'header-search__suggestion--active':
                      index === activeSuggestion,
                  }"
                  role="option"
                  :aria-selected="index === activeSuggestion"
                  @mousedown.prevent="selectSuggestion(item)"
                >
                  <img
                    class="header-search__suggestion-thumb"
                    :src="suggestionImage(item.product)"
                    alt=""
                    width="40"
                    height="40"
                    loading="lazy"
                    @error="onSuggestionImageError"
                  />
                  <span class="header-search__suggestion-copy">
                    <span class="header-search__suggestion-text">
                      <template
                        v-for="(part, partIndex) in suggestionLabelParts(
                          item.label,
                        )"
                        :key="`${item.id}-${partIndex}`"
                      >
                        <mark
                          v-if="part.match"
                          class="header-search__suggestion-mark"
                          >{{ part.text }}</mark
                        >
                        <template v-else>{{ part.text }}</template>
                      </template>
                    </span>
                  </span>
                </button>
              </div>
              <button
                :id="`${suggestionListId}-view-all`"
                type="button"
                class="header-search__view-all"
                :class="{
                  'header-search__view-all--active':
                    activeSuggestion === viewAllSuggestionIndex,
                }"
                role="option"
                :aria-selected="activeSuggestion === viewAllSuggestionIndex"
                @mousedown.prevent="viewAllResults"
              >
                View all results
              </button>
            </div>
          </div>
        </div>

        <div class="header-actions">
          <nav id="header-nav" class="header-nav" aria-label="Shop actions">
            <div class="header-nav__links">
              <RouterLink
                :to="{ name: 'products' }"
                class="nav-icon"
                aria-label="Home"
              >
                <Home :size="22" />
                <span class="nav-label">Home</span>
              </RouterLink>
              <RouterLink
                :to="{ name: 'favorites' }"
                class="nav-icon"
                aria-label="Favorites"
              >
                <Heart :size="22" />
                <span class="nav-label">Favorites</span>
                <span
                  v-if="favoriteCount > 0"
                  class="nav-badge"
                  aria-hidden="true"
                >
                  {{ favoriteCount }}
                </span>
              </RouterLink>
              <RouterLink
                :to="{ name: 'cart' }"
                class="nav-icon"
                aria-label="Cart"
              >
                <ShoppingCart :size="22" />
                <span class="nav-label">Cart</span>
                <span v-if="cartCount > 0" class="nav-badge" aria-hidden="true">
                  {{ cartCount }}
                </span>
              </RouterLink>
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
