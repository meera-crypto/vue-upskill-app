/**
 * useFavorites — shared wishlist state for the whole app.
 *
 * Same module-scope pattern as useCart / useToast: every component that
 * calls useFavorites() shares one reactive list. We store a product
 * snapshot so the Favorites page can render without re-fetching.
 */
import { ref, computed } from "vue";

const STORAGE_KEY = "mercantile-favorites";

/** @type {import('vue').Ref<Record<string, Record<string, unknown>>>} */
const items = ref(loadFavorites());

function loadFavorites() {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    /** @type {Record<string, Record<string, unknown>>} */
    const next = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (value && typeof value === "object" && !Array.isArray(value)) {
        next[key] = value;
      }
    }
    return next;
  } catch {
    return {};
  }
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items.value));
  } catch {
    /* Ignore storage failures — favorites still work this session. */
  }
}

/** Product ids currently favorited (for ProductCard `favorited` checks). */
const favoriteIds = computed(() =>
  Object.keys(items.value).map((id) => {
    const asNumber = Number(id);
    return Number.isFinite(asNumber) ? asNumber : id;
  }),
);

const favoriteCount = computed(() => favoriteIds.value.length);

/** Favorited products as an array (stable order by id). */
const favoriteProducts = computed(() =>
  Object.values(items.value).sort((a, b) => Number(a.id) - Number(b.id)),
);

/**
 * @param {number|string} productId
 * @returns {boolean}
 */
function isFavorite(productId) {
  return Boolean(items.value[productId]);
}

/**
 * Add if missing, remove if already saved.
 *
 * @param {Record<string, unknown>} product
 * @returns {'added' | 'removed' | null}
 */
function toggleFavorite(product) {
  if (!product || product.id == null) return null;

  const id = product.id;
  if (items.value[id]) {
    const next = { ...items.value };
    delete next[id];
    items.value = next;
    persist();
    return "removed";
  }

  items.value = {
    ...items.value,
    [id]: { ...product },
  };
  persist();
  return "added";
}

/** @param {number|string} productId */
function removeFavorite(productId) {
  if (!items.value[productId]) return;
  const next = { ...items.value };
  delete next[productId];
  items.value = next;
  persist();
}

export function useFavorites() {
  return {
    items,
    favoriteIds,
    favoriteCount,
    favoriteProducts,
    isFavorite,
    toggleFavorite,
    removeFavorite,
  };
}
