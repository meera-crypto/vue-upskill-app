/**
 * useWishlist — shared wishlist (favorites) state for the whole app.
 *
 * Same module-scope pattern as useCart / useToast: every component that
 * calls useWishlist() shares one reactive list.
 */
import { ref, computed } from "vue";
import type { Product } from "@/types/product";

const STORAGE_KEY = "mercantile-favorites";

const items = ref<Record<string, Product>>(loadFavorites());

function loadFavorites(): Record<string, Product> {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};

    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    const next: Record<string, Product> = {};
    for (const [key, value] of Object.entries(
      parsed as Record<string, Product>,
    )) {
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

const favoriteIds = computed(() =>
  Object.keys(items.value).map((id) => {
    const asNumber = Number(id);
    return Number.isFinite(asNumber) ? asNumber : id;
  }),
);

const favoriteCount = computed(() => favoriteIds.value.length);

const favoriteProducts = computed(() =>
  Object.values(items.value).sort((a, b) => Number(a.id) - Number(b.id)),
);

function isFavorite(productId: number | string): boolean {
  return Boolean(items.value[String(productId)]);
}

function toggleFavorite(product: Product): "added" | "removed" | null {
  if (!product || product.id == null) return null;

  const id = String(product.id);
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

function removeFavorite(productId: number | string) {
  const id = String(productId);
  if (!items.value[id]) return;
  const next = { ...items.value };
  delete next[id];
  items.value = next;
  persist();
}

export function useWishlist() {
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
