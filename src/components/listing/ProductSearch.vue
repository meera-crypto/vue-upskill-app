<script setup>
/**
 * Header search field + product suggestions dropdown.
 *
 * Props/emits (v-model pattern):
 * - Parent passes `searchQuery` and listens for `update:searchQuery` on typing.
 * - Parent handles `clear-search` when the user clears the field (often resets URL/filters).
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
} from "@/composables/useSearchSuggestions.js";
import { PRODUCT_IMAGE_FALLBACK } from "@/services/productService.js";
import { productDetailsTo } from "@/utils/productRoutes.js";

const props = defineProps({
  /** Current search text from the parent (App.vue / listing URL). */
  searchQuery: {
    type: String,
    default: "",
  },
});

const emit = defineEmits(["update:searchQuery", "clear-search"]);

const router = useRouter();
const searchFieldEl = useTemplateRef("searchFieldEl");
/** Scrollable product list inside the suggestions panel (View all sits outside it). */
const suggestionsListEl = useTemplateRef("suggestionsListEl");

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

/** Close suggestions when the user clicks outside the search field. */
function onDocumentPointerDown(event) {
  const root = searchFieldEl.value;
  if (!root || root.contains(event.target)) return;
  searchFocused.value = false;
  activeSuggestion.value = -1;
}

onMounted(() => {
  document.addEventListener("pointerdown", onDocumentPointerDown);
});

onUnmounted(() => {
  document.removeEventListener("pointerdown", onDocumentPointerDown);
  cancelBlurClose();
});
</script>

<template>
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
        <div ref="suggestionsListEl" class="header-search__suggestion-list">
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
</template>
