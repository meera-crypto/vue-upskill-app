/**
 * useRecentlyViewed — products the shopper opened on the details page.
 *
 * Same module-scope pattern as useCart / useFavorites: every caller shares
 * one reactive list. We store product snapshots (newest first) in
 * localStorage so the row survives refresh without re-fetching.
 *
 * Vue idea: `ref` at module scope = app-wide state without Pinia yet.
 */
import { ref, computed } from "vue";

const STORAGE_KEY = "mercantile-recently-viewed";

/** How many products to keep (matches Similar products preview length). */
export const RECENTLY_VIEWED_MAX = 8;

/** @type {import('vue').Ref<Record<string, unknown>[]>} */
const items = ref(loadRecentlyViewed());

/**
 * @returns {Record<string, unknown>[]}
 */
function loadRecentlyViewed() {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    /** @type {Record<string, unknown>[]} */
    const next = [];
    const seen = new Set();

    for (const value of parsed) {
      if (!value || typeof value !== "object" || Array.isArray(value)) continue;
      if (value.id == null) continue;

      const key = String(value.id);
      if (seen.has(key)) continue;
      seen.add(key);
      next.push(value);

      if (next.length >= RECENTLY_VIEWED_MAX) break;
    }

    return next;
  } catch {
    return [];
  }
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items.value));
  } catch {
    /* Quota / private mode — list still works for this session. */
  }
}

/**
 * Record that the shopper opened a product. Moves existing entries to the
 * front; caps the list at RECENTLY_VIEWED_MAX.
 *
 * @param {Record<string, unknown>} product
 */
function trackView(product) {
  if (!product || product.id == null) return;

  const id = product.id;
  const without = items.value.filter((item) => String(item.id) !== String(id));
  items.value = [{ ...product }, ...without].slice(0, RECENTLY_VIEWED_MAX);
  persist();
}

/** Newest-first product snapshots. */
const recentlyViewed = computed(() => items.value);

const recentlyViewedCount = computed(() => items.value.length);

export function useRecentlyViewed() {
  return {
    items,
    recentlyViewed,
    recentlyViewedCount,
    trackView,
  };
}
