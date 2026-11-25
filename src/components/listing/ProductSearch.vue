<script setup lang="ts">
/**
 * Header search field + product suggestions dropdown.
 *
 * Mobile (&lt; md): CSS shows a Search icon beside the logo; tap adds
 * `.header-search--expanded` for the field. Tablet+: CSS always shows the field.
 * Visibility is CSS-first so the header doesn’t jump after matchMedia mounts.
 *
 * Props/emits:
 * - `update:searchQuery` — typing (input only; listing does not filter yet).
 * - `submit-search` — Enter / View all → parent applies search to the listing.
 * - `clear-search` — clear input + listing query.
 *
 * Suggestions appear after `SEARCH_MIN_LENGTH` characters. Listing results
 * update only when the parent handles `submit-search` (Enter).
 */
import {
  computed,
  nextTick,
  onMounted,
  onUnmounted,
  ref,
  useTemplateRef,
} from "vue";
import { useRouter } from "vue-router";
import { X, Search } from "@lucide/vue";
import {
  highlightSearchText,
  useSearchSuggestions,
} from "@/composables/useSearchSuggestions";
import { SEARCH_MIN_LENGTH } from "@/composables/useProducts";
import { mediaQueries } from "@/constants/breakpoints";
import { PRODUCT_IMAGE_FALLBACK } from "@/utils/productModel";
import { productDetailsTo } from "@/utils/productRoutes";
import type { Product } from "@/types/product";
import type { Suggestion } from "@/composables/useSearchSuggestions";

const props = defineProps({
  /** Current search text from the parent (App.vue / listing URL). */
  searchQuery: {
    type: String,
    default: "",
  },
  /**
   * Selected category slug (listing chip). Suggestions AND with this —
   * same rule as listing results. Empty = search the full catalog.
   */
  selectedCategory: {
    type: String,
    default: "",
  },
});

const emit = defineEmits<{
  (e: "update:searchQuery", value: string): void;
  (e: "submit-search"): void;
  (e: "clear-search"): void;
}>();

const router = useRouter();
const searchRootEl = useTemplateRef("searchRootEl");
const searchFieldEl = useTemplateRef("searchFieldEl");
const searchInputEl = useTemplateRef("searchInputEl");
/** Scrollable product list inside the suggestions panel (View all sits outside it). */
const suggestionsListEl = useTemplateRef("suggestionsListEl");

/** Suggestions panel open while the search input is focused / in use. */
const searchFocused = ref(false);
const activeSuggestion = ref(-1);
/**
 * Mobile expand state only. Icon vs field visibility is CSS-driven
 * (`untilMd` / `mdUp`) so first paint matches layout — no mount jump.
 * `matchMedia` is still used for outside-click / Escape close behavior.
 */
const isMobileLayout = ref(
  typeof window !== "undefined" && window.matchMedia
    ? window.matchMedia(mediaQueries.untilMd).matches
    : false,
);
const mobileSearchOpen = ref(false);
/** Ignore the next blur close when clicking inside the dropdown. */
let blurCloseTimer: ReturnType<typeof setTimeout> | null = null;
let untilMdMql: MediaQueryList | null = null;

const searchQueryRef = computed(() => props.searchQuery);
const selectedCategoryRef = computed(() => props.selectedCategory);
const { suggestions, hasSuggestions } = useSearchSuggestions(searchQueryRef, {
  categorySource: selectedCategoryRef,
});

const typedLength = computed(() => props.searchQuery.trim().length);

/** Dropdown opens at 3+ characters (matches or “No results”). */
const showSuggestions = computed(
  () => searchFocused.value && typedLength.value >= SEARCH_MIN_LENGTH,
);

const suggestionsEmptyMessage = computed(() => {
  const q = props.searchQuery.trim();
  if (props.selectedCategory) {
    return `No results for “${q}” in this category`;
  }
  return `No results for “${q}”`;
});

const suggestionListId = "header-search-suggestions";

function onSearchInput(event: Event) {
  activeSuggestion.value = -1;
  emit("update:searchQuery", (event.target as HTMLInputElement).value);
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

async function openMobileSearch() {
  mobileSearchOpen.value = true;
  await nextTick();
  searchInputEl.value?.focus();
}

function closeMobileSearch() {
  cancelBlurClose();
  mobileSearchOpen.value = false;
  searchFocused.value = false;
  activeSuggestion.value = -1;
}

function syncMobileLayout(
  event?: MediaQueryList | MediaQueryListEvent | null,
) {
  const matches = event?.matches ?? untilMdMql?.matches ?? false;
  isMobileLayout.value = matches;
  if (!matches) {
    mobileSearchOpen.value = false;
  }
}

function cancelBlurClose() {
  if (blurCloseTimer != null) {
    clearTimeout(blurCloseTimer);
    blurCloseTimer = null;
  }
}

function suggestionImage(product: Product | null | undefined) {
  const thumb =
    typeof product?.thumbnail === "string" ? product.thumbnail.trim() : "";
  const image = typeof product?.image === "string" ? product.image.trim() : "";
  return thumb || image || PRODUCT_IMAGE_FALLBACK;
}

function onSuggestionImageError(event: Event) {
  const img = event.target as HTMLImageElement;
  if (img.src !== PRODUCT_IMAGE_FALLBACK) {
    img.src = PRODUCT_IMAGE_FALLBACK;
  }
}

function selectSuggestion(item: Suggestion) {
  cancelBlurClose();
  searchFocused.value = false;
  activeSuggestion.value = -1;

  if (item.product?.id != null) {
    router.push(productDetailsTo(item.product));
  }
}

/**
 * Close the dropdown and commit search to the listing
 * (same outcome as Enter with no product highlighted).
 */
function viewAllResults() {
  cancelBlurClose();
  searchFocused.value = false;
  activeSuggestion.value = -1;
  emit("submit-search");
}

/** Enter with no highlighted suggestion — apply listing search. */
function submitTypedSearch() {
  cancelBlurClose();
  searchFocused.value = false;
  activeSuggestion.value = -1;
  emit("submit-search");
}

/** Highlight the typed search text inside a suggestion title. */
function suggestionLabelParts(label: string) {
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
async function moveActiveSuggestion(nextIndex: number) {
  activeSuggestion.value = nextIndex;
  await nextTick();
  scrollActiveSuggestionIntoView();
}

function onSearchKeydown(event: KeyboardEvent) {
  if (event.key === "Enter") {
    event.preventDefault();
    if (showSuggestions.value) {
      if (activeSuggestion.value === viewAllSuggestionIndex.value) {
        viewAllResults();
        return;
      }
      if (activeSuggestion.value >= 0) {
        const item = suggestions.value[activeSuggestion.value];
        if (item) {
          selectSuggestion(item);
          return;
        }
      }
    }
    submitTypedSearch();
    return;
  }

  if (!showSuggestions.value) {
    if (event.key === "Escape") {
      if (props.searchQuery) {
        clearSearch();
      } else if (isMobileLayout.value && mobileSearchOpen.value) {
        closeMobileSearch();
      }
    }
    return;
  }

  /* Last navigable index includes the View all row. */
  const last = viewAllSuggestionIndex.value;

  if (event.key === "ArrowDown") {
    event.preventDefault();
    const next = activeSuggestion.value < last ? activeSuggestion.value + 1 : 0;
    moveActiveSuggestion(next);
    return;
  }

  if (event.key === "ArrowUp") {
    event.preventDefault();
    const next = activeSuggestion.value > 0 ? activeSuggestion.value - 1 : last;
    moveActiveSuggestion(next);
    return;
  }

  if (event.key === "Escape") {
    event.preventDefault();
    searchFocused.value = false;
    activeSuggestion.value = -1;
    if (isMobileLayout.value && mobileSearchOpen.value) {
      closeMobileSearch();
    }
  }
}

/** Close suggestions when the user clicks outside the search control. */
function onDocumentPointerDown(event: PointerEvent) {
  const root = searchRootEl.value;
  if (!root || root.contains(event.target as Node)) return;
  searchFocused.value = false;
  activeSuggestion.value = -1;
  /* Collapse the mobile expanded field when tapping outside (keep typed query). */
  if (isMobileLayout.value && mobileSearchOpen.value) {
    mobileSearchOpen.value = false;
  }
}

onMounted(() => {
  document.addEventListener("pointerdown", onDocumentPointerDown);
  if (typeof window !== "undefined" && window.matchMedia) {
    untilMdMql = window.matchMedia(mediaQueries.untilMd);
    syncMobileLayout(untilMdMql);
    untilMdMql.addEventListener("change", syncMobileLayout);
  }
});

onUnmounted(() => {
  document.removeEventListener("pointerdown", onDocumentPointerDown);
  untilMdMql?.removeEventListener("change", syncMobileLayout);
  untilMdMql = null;
  cancelBlurClose();
});
</script>

<template>
  <!--
    Toggle + field always in the DOM. Mobile CSS hides the field until
    `.header-search--expanded`; tablet+ CSS always shows the field.
    Avoids a mount-time height jump from late matchMedia.
  -->
  <div
    ref="searchRootEl"
    class="header-search"
    :class="{ 'header-search--expanded': mobileSearchOpen }"
  >
    <button
      type="button"
      class="header-search__toggle"
      :class="{ 'header-search__toggle--active': Boolean(searchQuery) }"
      aria-label="Open search"
      @click="openMobileSearch"
    >
      <Search :size="24" aria-hidden="true" />
    </button>

    <label class="header-search__label" for="header-search-input">
      Search products
    </label>
    <div ref="searchFieldEl" class="header-search__field">
      <Search class="header-search__icon" :size="18" aria-hidden="true" />
      <input
        id="header-search-input"
        ref="searchInputEl"
        type="search"
        class="header-search__input"
        placeholder="Search products"
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
        <X :size="20" />
      </button>
      <button
        v-else-if="mobileSearchOpen"
        type="button"
        class="header-search__clear header-search__clear--mobile-close"
        aria-label="Close search"
        @mousedown.prevent
        @click="closeMobileSearch"
      >
        <X :size="20" />
      </button>

      <div
        v-if="showSuggestions"
        :id="suggestionListId"
        class="header-search__suggestions"
        role="listbox"
        aria-label="Search suggestions"
      >
        <div ref="suggestionsListEl" class="header-search__suggestion-list">
          <p
            v-if="!hasSuggestions"
            class="header-search__no-results"
            role="status"
          >
            {{ suggestionsEmptyMessage }}
          </p>
          <button
            v-for="(item, index) in suggestions"
            :id="`${suggestionListId}-${index}`"
            :key="item.id"
            type="button"
            class="header-search__suggestion"
            :class="{
              'header-search__suggestion--active': index === activeSuggestion,
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
                  v-for="(part, partIndex) in suggestionLabelParts(item.label)"
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
              <span
                v-if="item.matchedMeta"
                class="header-search__suggestion-meta"
              >
                <template
                  v-for="(part, partIndex) in suggestionLabelParts(
                    item.matchedMeta,
                  )"
                  :key="`${item.id}-meta-${partIndex}`"
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
          {{ hasSuggestions ? "View all results" : "Search anyway" }}
        </button>
      </div>
    </div>
  </div>
</template>
